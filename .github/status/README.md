# Model status probe

`status.yml` runs `probe.py` every day at 04:30 UTC and commits the results to the `status-data` branch, which the site reads from `https://raw.githubusercontent.com/Prism-Shadow/model-message-stream-protocol/status-data/<file>`. GitHub fires scheduled runs from `main` only. The first run creates the branch.

## Targets

`targets.json` lists what is probed and how:

| Field | Meaning |
| --- | --- |
| `samples` | Answers per target per run, one after another, 2 s apart |
| `max_tokens`, `thinking_level` | The `UniConfig` every sample sends |
| `prompt` | The user message every sample sends |
| `targets[].model`, `.client`, `.base_url` | The registry entry's `model`, `client` and `base_url`, copied exactly from `list_supported_models()` |
| `targets[].api_key_env` | The environment variable that holds the key |

To add a target, copy the triple of a registry entry and name its key variable. A key the workflow does not pass yet needs a repository secret and a line in the `env:` of the Probe step in `status.yml`. A triple the registry lacks is still probed, with a warning, and its cost is `null`.

## What a run measures

- **TTFT**: from the request to the first non-empty text or thinking delta.
- **TPS**: thoughts plus response tokens, over the time from the first such delta to the last.
- **Status**: `up` when every sample answered, `degraded` when some did, `down` when none did or the client could not be built, `nokey` when the key variable is empty (configuration, not an outage). A sample fails on any error or after 120 s.
- **Cost**: the summed usage at the registry's USD list price per million tokens. Cached input is billed at the cache-hit price, or at the input price where the platform publishes none. Promotions and peak-hour rates are not counted.
- **Errors**: `Class: message` on one line, at most 200 characters. Every `*_API_KEY` value in the environment, every `key=` URL parameter and every masked key tail a provider quotes (`****cdef`) is replaced by `***`.

## Data files

The key of every target is `<client>|<base_url>|<model>`.

```jsonc
// latest.json: the last result of every configured target
{"generated_at": "2026-10-19T04:35:12Z", "run_id": "123456", "samples": 3,
 "targets": {"<key>": {
   "model": "...", "client": "...", "base_url": "...",
   "status": "up",                       // "up" | "degraded" | "down" | "nokey"
   "ok": 3, "ttft_ms": 412, "tps": 87.3, // medians over the samples that answered; null when none did
   "usage": {"cached_tokens": 0, "prompt_tokens": 60, "thoughts_tokens": 40, "response_tokens": 1230}, // summed
   "cost_usd": 0.00031,                  // null when the registry has no price for the key
   "error": null,                        // the last error when a sample failed
   "checked_at": "2026-10-19T04:35:02Z"}}}
// history.json: one entry per UTC day per target, the day's last run, 90 days
{"days": 90, "targets": {"<key>": {"2026-10-19": {"status": "up", "ttft_ms": 412, "tps": 87.3, "cost_usd": 0.00031}}}}
// monthly.json: every run of the month counted, manual ones included; null for a target without a price
{"months": {"2026-10": {"runs": 19, "total_usd": 0.0093, "targets": {"<key>": 0.0046}}}}
// runs/2026-10-19.json: every run of the day, each the latest.json shape plus its samples
{"date": "2026-10-19", "runs": [{"generated_at": "...", "run_id": "...", "samples": 3, "targets": {"<key>": {
   "...": "...", "samples": [{"ttft_ms": 405, "tps": 88.1, "elapsed_ms": 14520, "usage": {}, "finish_reason": "stop", "error": null}]}}}]}
```

A run that probes some targets only keeps the other targets' `latest.json` entries. `monthly.json` recounts the current month from its run files on every run.

## Running it

```sh
# from main; targets is optional, a comma-separated list of model ids or keys
gh workflow run status.yml --ref main -f targets=deepseek-flash
```

Locally, from the repository root (it calls the providers and spends real money):

```sh
uv venv && uv pip install ./src_py
.venv/bin/python -I .github/status/probe.py --out /tmp/status --only deepseek-flash
```
