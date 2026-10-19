# Daily model status probe

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `.github`

[中文版](2026-10-19-status-probe.zh.md)

## What changed

- `status.yml` ran `.github/status/probe.py` every day at 04:30 UTC and on dispatch, optionally for some targets only, and committed the results to the `status-data` branch, creating it on the first run.
- `targets.json` listed the probed channels as registry triples with their key variables: `deepseek-flash` on the DeepSeek API and `gemini-3.8-flash` on Vertex AI.
- `probe.py` streamed each target three times through `AutoLLMClient` and recorded its status (`up`, `degraded`, `down`, `nokey`), median TTFT and TPS, summed usage, and the cost at the registry's USD list price. Errors were recorded on one line with keys masked.
- The run wrote `latest.json`, a 90-day `history.json`, a `monthly.json` recounted from the month's runs, and one `runs/YYYY-MM-DD.json` per day holding every run.
- `plan.py` ran offline checks only for changes to the probe, and `pytest.yml` linted `.github/status` with the package's ruff configuration.
