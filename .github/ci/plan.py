"""Select client E2E coverage from a PR's complete file diff."""

import json
import os
import subprocess
from pathlib import Path


CATALOG_PATH = ".github/ci/models.json"
SOURCE_ROOTS = ("src_py/mmsp/", "src_ts/src/")


def select_clients(files: list[str], catalog: dict, previous: dict | None, full: bool = False) -> dict:
    """Fall back to all clients for changes outside known client and documentation paths."""
    if full:
        return {"checks": True, "clients": ["*"], "reason": "Full validation requested"}

    selected: set[str] = set()
    checks = False
    for path in files:
        if path == CATALOG_PATH:
            checks = True
            if previous is None or set(previous) != set(catalog):
                return {
                    "checks": True,
                    "clients": ["*"],
                    "reason": "Client catalog structure changed",
                }
            selected.update(client for client in catalog if catalog[client] != previous[client])
            continue
        if path.startswith(("site/", "llmsdk_docs/", "changelog/", ".github/images/", ".agents/")) or path.endswith(
            ".md"
        ):
            continue
        if path in (
            "LICENSE",
            ".gitignore",
            ".github/workflows/pages.yml",
            ".github/workflows/pr.yml",
        ):
            continue
        # the status probe calls models only on its own schedule; the offline checks still lint it
        if path.startswith(".github/status/") or path == ".github/workflows/status.yml":
            checks = True
            continue

        checks = True
        root = next((root for root in SOURCE_ROOTS if path.startswith(root)), None)
        if root:
            directory, separator, _ = path[len(root) :].partition("/")
            client = directory.replace("_", "-")
            if separator and client in catalog:
                selected.add(client)
                continue
        return {
            "checks": True,
            "clients": ["*"],
            "reason": f"Shared or unclassified change: {path}",
        }

    # Include transitive dependents, such as the vLLM adapter inheriting openai-chat.
    while True:
        dependents = {
            client for client, group in catalog.items() if selected.intersection(group.get("depends_on", []))
        }
        if dependents <= selected:
            break
        selected.update(dependents)
    return {
        "checks": checks,
        "clients": sorted(selected),
        "reason": "Affected clients" if selected else "No model changes",
    }


def main() -> None:
    catalog = json.loads(Path(CATALOG_PATH).read_text(encoding="utf-8"))
    previous = None
    base = os.getenv("BASE_SHA")
    if base:
        result = subprocess.run(["git", "show", f"{base}:{CATALOG_PATH}"], capture_output=True, text=True, check=False)
        if result.returncode == 0:
            try:
                previous = json.loads(result.stdout)
            except json.JSONDecodeError:
                pass
    plan = select_clients(
        json.loads(os.getenv("CHANGED_FILES", "[]")),
        catalog,
        previous,
        os.getenv("FORCE_FULL") == "true",
    )
    print(json.dumps(plan, ensure_ascii=False))
    if output := os.getenv("GITHUB_OUTPUT"):
        with open(output, "a", encoding="utf-8") as stream:
            for key, value in plan.items():
                if key != "reason":
                    stream.write(f"{key}={json.dumps(value, ensure_ascii=False)}\n")
    if summary := os.getenv("GITHUB_STEP_SUMMARY"):
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(f"### Model test selection\n\n{plan['reason']}\n\n")
            stream.write(f"Clients: `{json.dumps(plan['clients'], ensure_ascii=False)}`\n\n")
            stream.write(
                "Python and TypeScript use the same selection. `*` covers all clients, excluding slow cases.\n"
            )


if __name__ == "__main__":
    main()
