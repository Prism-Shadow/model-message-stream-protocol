"""Probe the configured model channels and record their status, speed and cost.

Each target in targets.json is a registry triple (client, base_url, model) plus the environment
variable that holds its key. Every target answers the same short prompt a few times in a row, and the
run updates the files the site's status board reads; README.md beside this script describes them.

Run from the repository root with mmsp installed:

    python -I .github/status/probe.py --out data
"""

import argparse
import asyncio
import json
import os
import re
import statistics
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from mmsp import AutoLLMClient, EmptyResponseError, ThinkingLevel, list_supported_models


HISTORY_DAYS = 90
SAMPLE_TIMEOUT_S = 120
SAMPLE_GAP_S = 2
# targets run side by side, at most this many at once; the samples of one target never overlap
CONCURRENCY = 4
ERROR_CHARS = 200
USAGE_FIELDS = ("cached_tokens", "prompt_tokens", "thoughts_tokens", "response_tokens")
TARGET_FIELDS = ("model", "client", "base_url", "api_key_env")
DEFAULT_TARGETS = Path(__file__).resolve().with_name("targets.json")
# Google's SDK puts a Gemini API key in request URLs, and an error may quote the URL
KEY_PARAMETER = re.compile(r"(?i)(key=)[^&\s'\"]+")
# a provider rejecting a key quotes its last characters ("Your api key: ****cdef is invalid")
MASKED_KEY = re.compile(r"\*{3,}[\w-]*")


def target_key(entry: dict[str, Any]) -> str:
    """The key the status files and the site join on: the registry triple."""
    return f"{entry['client']}|{entry['base_url']}|{entry['model']}"


def uni_config(settings: dict[str, Any]) -> dict[str, Any]:
    """The UniConfig every sample sends, so that a typo in targets.json fails the run, not each target."""
    config: dict[str, Any] = {}
    if "max_tokens" in settings:
        config["max_tokens"] = int(settings["max_tokens"])
    if "thinking_level" in settings:
        config["thinking_level"] = ThinkingLevel(settings["thinking_level"])
    return config


def load_settings(path: Path, only: list[str]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Read targets.json and the targets this run probes.

    Args:
        path: The targets file.
        only: Target keys or model ids to probe; empty probes every target.

    Returns:
        The settings, with every configured target, and the targets to probe.
    """
    settings = json.loads(path.read_text(encoding="utf-8"))
    targets = settings["targets"]
    for target in targets:
        missing = [field for field in TARGET_FIELDS if not target.get(field)]
        if missing:
            raise SystemExit(f"{path}: target {target} lacks {', '.join(missing)}")
    keys = [target_key(target) for target in targets]
    if len(set(keys)) != len(keys):
        raise SystemExit(f"{path}: a target is listed twice")
    if int(settings.get("samples", 0)) < 1:
        raise SystemExit(f"{path}: samples must be at least 1")
    if not settings.get("prompt"):
        raise SystemExit(f"{path}: prompt is empty")
    if not only:
        return settings, targets

    unknown = [name for name in only if not any(name in (target_key(t), t["model"]) for t in targets)]
    if unknown:
        raise SystemExit(f"--only names no target: {', '.join(unknown)}")
    return settings, [t for t in targets if target_key(t) in only or t["model"] in only]


def known_secrets() -> list[str]:
    """Every key in the environment, so that no error string written to the data branch quotes one."""
    secrets: set[str] = set()
    for name, value in os.environ.items():
        if not name.endswith("_API_KEY") or len(value) < 8:
            continue
        secrets.add(value)
        # a service-account key is JSON; its private key could be quoted on its own
        if value.lstrip().startswith("{"):
            try:
                info = json.loads(value)
            except ValueError:
                continue
            if isinstance(info, dict):
                secrets.update(info[field] for field in ("private_key", "private_key_id") if info.get(field))
    # longest first, so that a key containing another is replaced whole
    return sorted(secrets, key=len, reverse=True)


def describe_error(exc: Exception, secrets: list[str]) -> str:
    """The error as "Class: message" on one line, keys replaced, at most ERROR_CHARS long."""
    message = str(exc)
    if not message and isinstance(exc, TimeoutError):
        message = f"no complete response within {SAMPLE_TIMEOUT_S} s"
    for secret in secrets:
        message = message.replace(secret, "***")
    message = KEY_PARAMETER.sub(r"\1***", " ".join(message.split()))
    message = MASKED_KEY.sub("***", message)
    text = f"{type(exc).__name__}: {message}" if message else type(exc).__name__
    return text[:ERROR_CHARS]


def zero_usage() -> dict[str, int]:
    return dict.fromkeys(USAGE_FIELDS, 0)


def cost_usd(usage: dict[str, int], pricing: dict[str, Any] | None) -> float | None:
    """The cost of the usage at the registry's USD list price per million tokens."""
    if pricing is None:
        return None
    total = 0.0
    for field in USAGE_FIELDS:
        # a platform that publishes no cache-hit price bills cached input as ordinary input
        total += usage[field] * pricing.get(field, pricing["prompt_tokens"])
    return round(total / 1e6, 8)


def utc_stamp(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


async def probe_sample(
    client: AutoLLMClient, prompt: str, config: dict[str, Any], secrets: list[str]
) -> dict[str, Any]:
    """Stream one answer and measure it.

    TTFT runs from the request to the first non-empty text or thinking delta; TPS is the output
    tokens (thoughts and response) over the time from that delta to the last one.
    """
    sample: dict[str, Any] = {
        "ttft_ms": None,
        "tps": None,
        "elapsed_ms": None,
        "usage": None,
        "finish_reason": None,
        "error": None,
    }
    messages = [{"role": "user", "content_items": [{"type": "text.done", "text": prompt}]}]
    usage = None
    first = last = None
    start = time.perf_counter()
    try:
        async with asyncio.timeout(SAMPLE_TIMEOUT_S):
            async for event in client.streaming_response(messages=messages, config=dict(config)):
                if event["event_type"] == "stop":
                    usage = event["usage_metadata"]
                    sample["finish_reason"] = event["finish_reason"]
                    continue
                for item in event["content_items"]:
                    if item["type"] in ("text.delta", "thinking.delta") and (item.get("text") or item.get("thinking")):
                        last = time.perf_counter()
                        if first is None:
                            first = last
    except Exception as exc:
        # a thinking-only answer is rejected, but its tokens were still billed
        if isinstance(exc, EmptyResponseError):
            usage = exc.usage_metadata
        sample["error"] = describe_error(exc, secrets)
    sample["elapsed_ms"] = round((time.perf_counter() - start) * 1000)
    if first is not None:
        sample["ttft_ms"] = round((first - start) * 1000)
    if usage is not None:
        sample["usage"] = {field: int(usage.get(field) or 0) for field in USAGE_FIELDS}
        tokens = sample["usage"]["thoughts_tokens"] + sample["usage"]["response_tokens"]
        if first is not None and last > first and tokens:
            sample["tps"] = round(tokens / (last - first), 1)
    return sample


async def probe_target(
    target: dict[str, Any],
    settings: dict[str, Any],
    config: dict[str, Any],
    pricing: dict[str, Any] | None,
    secrets: list[str],
    semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    """Sample one target and summarize it in the latest.json entry shape, plus its samples."""
    entry: dict[str, Any] = {
        "model": target["model"],
        "client": target["client"],
        "base_url": target["base_url"],
        "status": "nokey",
        "ok": 0,
        "ttft_ms": None,
        "tps": None,
        "usage": zero_usage(),
        "cost_usd": cost_usd(zero_usage(), pricing),
        "error": None,
        "checked_at": None,
        "samples": [],
    }
    api_key = os.environ.get(target["api_key_env"], "").strip()
    if not api_key:
        entry["checked_at"] = utc_stamp(datetime.now(timezone.utc))
        return entry

    async with semaphore:
        errors: list[str] = []
        try:
            # one client for every sample, so that only the first pays for connecting and signing in
            client = AutoLLMClient(
                model=target["model"],
                api_key=api_key,
                base_url=target["base_url"],
                client_type=target["client"],
            )
        except Exception as exc:
            errors.append(describe_error(exc, secrets))
        else:
            for index in range(int(settings["samples"])):
                if index:
                    await asyncio.sleep(SAMPLE_GAP_S)
                entry["samples"].append(await probe_sample(client, settings["prompt"], config, secrets))

    for sample in entry["samples"]:
        if sample["usage"] is not None:
            for field in USAGE_FIELDS:
                entry["usage"][field] += sample["usage"][field]
        if sample["error"] is not None:
            errors.append(sample["error"])
    succeeded = [sample for sample in entry["samples"] if sample["error"] is None]
    ttfts = [sample["ttft_ms"] for sample in succeeded if sample["ttft_ms"] is not None]
    rates = [sample["tps"] for sample in succeeded if sample["tps"] is not None]
    entry["ok"] = len(succeeded)
    if not errors:
        entry["status"] = "up"
    else:
        entry["status"] = "degraded" if succeeded else "down"
    entry["ttft_ms"] = round(statistics.median(ttfts)) if ttfts else None
    entry["tps"] = round(statistics.median(rates), 1) if rates else None
    entry["cost_usd"] = cost_usd(entry["usage"], pricing)
    entry["error"] = errors[-1] if errors else None
    entry["checked_at"] = utc_stamp(datetime.now(timezone.utc))
    return entry


async def probe_all(
    targets: list[dict[str, Any]], settings: dict[str, Any], config: dict[str, Any], prices: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    secrets = known_secrets()
    semaphore = asyncio.Semaphore(CONCURRENCY)
    entries = await asyncio.gather(
        *(
            probe_target(target, settings, config, prices.get(target_key(target)), secrets, semaphore)
            for target in targets
        )
    )
    return {target_key(entry): entry for entry in entries}


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_name(f".{path.name}.partial")
    partial.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    partial.replace(path)


def write_run(out: Path, run: dict[str, Any], date: str) -> None:
    """Append the run to its day's file, which keeps every run of the day for the monthly cost."""
    path = out / "runs" / f"{date}.json"
    day = read_json(path, {"date": date, "runs": []})
    day["runs"].append(run)
    write_json(path, day)


def write_latest(out: Path, run: dict[str, Any], configured: list[str]) -> None:
    """Rewrite latest.json; a target this run skipped keeps its previous entry while it is configured."""
    previous = read_json(out / "latest.json", {}).get("targets", {})
    targets = {}
    for key in configured:
        if key in run["targets"]:
            targets[key] = {name: value for name, value in run["targets"][key].items() if name != "samples"}
        elif key in previous:
            targets[key] = previous[key]
    latest = {"generated_at": run["generated_at"], "run_id": run["run_id"], "samples": run["samples"]}
    write_json(out / "latest.json", {**latest, "targets": targets})


def write_history(out: Path, run: dict[str, Any], today: datetime) -> None:
    """Upsert today's entry per probed target (the day's last run wins) and drop days past the window."""
    history = read_json(out / "history.json", {"days": HISTORY_DAYS, "targets": {}})
    date = today.strftime("%Y-%m-%d")
    for key, entry in run["targets"].items():
        days = history["targets"].setdefault(key, {})
        days[date] = {field: entry[field] for field in ("status", "ok", "ttft_ms", "tps", "cost_usd", "error")} | {
            "samples": run["samples"]
        }
    oldest = (today - timedelta(days=HISTORY_DAYS - 1)).strftime("%Y-%m-%d")
    kept = {}
    for key, days in history["targets"].items():
        recent = {day: days[day] for day in sorted(days) if day >= oldest}
        if recent:
            kept[key] = recent
    write_json(out / "history.json", {"days": HISTORY_DAYS, "targets": kept})


def write_monthly(out: Path, month: str) -> dict[str, Any]:
    """Recount this month's probe cost from its run files; earlier months stay as they were written.

    A target the registry has no price for is left out, as its cost is unknown rather than zero.
    """
    runs = 0
    targets: dict[str, float] = {}
    for path in sorted((out / "runs").glob(f"{month}-*.json")):
        for run in read_json(path, {"runs": []})["runs"]:
            runs += 1
            for key, entry in run["targets"].items():
                if entry["cost_usd"] is not None:
                    targets[key] = round(targets.get(key, 0.0) + entry["cost_usd"], 8)
    summary = {"runs": runs, "total_usd": round(sum(targets.values(), 0.0), 8), "targets": targets}
    monthly = read_json(out / "monthly.json", {"months": {}})
    monthly["months"][month] = summary
    write_json(out / "monthly.json", {"months": dict(sorted(monthly["months"].items()))})
    return summary


def summary_table(run: dict[str, Any], month: str, monthly: dict[str, Any]) -> str:
    def cell(value: Any, suffix: str = "") -> str:
        return "" if value is None else f"{value}{suffix}"

    lines = [
        f"### Model status, run {run['run_id']}",
        "",
        "| Target | Status | OK | TTFT | TPS | Cost (USD) | Error |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for key, entry in run["targets"].items():
        error = cell(entry["error"]).replace("|", "\\|")
        lines.append(
            f"| `{key}` | {entry['status']} | {entry['ok']}/{run['samples']} | {cell(entry['ttft_ms'], ' ms')} "
            f"| {cell(entry['tps'])} | {cell(entry['cost_usd'])} | {error} |"
        )
    lines += ["", f"{month}: {monthly['runs']} runs, {monthly['total_usd']} USD", ""]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe the configured model channels.")
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS, help="the targets file")
    parser.add_argument("--out", type=Path, default=Path("data"), help="the status data directory")
    parser.add_argument("--run-id", default=os.getenv("GITHUB_RUN_ID", "local"), help="recorded with the run")
    parser.add_argument("--only", default="", help="comma-separated target keys or model ids; empty probes all")
    args = parser.parse_args()

    only = [name.strip() for name in args.only.split(",") if name.strip()]
    settings, targets = load_settings(args.targets, only)
    config = uni_config(settings)
    prices = {target_key(entry): entry.get("pricing") for entry in list_supported_models("USD")}
    for target in targets:
        if prices.get(target_key(target)) is None:
            print(f"warning: the registry has no price for {target_key(target)}; its cost is null", file=sys.stderr)

    entries = asyncio.run(probe_all(targets, settings, config, prices))
    now = datetime.now(timezone.utc)
    date, month = now.strftime("%Y-%m-%d"), now.strftime("%Y-%m")
    run = {
        "generated_at": utc_stamp(now),
        "run_id": str(args.run_id),
        "samples": int(settings["samples"]),
        "targets": entries,
    }
    write_run(args.out, run, date)
    write_history(args.out, run, now)
    monthly = write_monthly(args.out, month)
    write_latest(args.out, run, [target_key(target) for target in settings["targets"]])

    table = summary_table(run, month, monthly)
    print(table)
    if summary := os.getenv("GITHUB_STEP_SUMMARY"):
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(table + "\n")


if __name__ == "__main__":
    main()
