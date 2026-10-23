# The site's top bar: Docs, RFC, Model Index and Model Status

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`

[中文版](2026-10-23-site-top-bar.zh.md)

## What changed

- The top bar's eight entries (Overview, Quickstart, Protocol, Reference, Tools, Models, Status, Changelog) became six: Overview, Docs, RFC, Model Index, Model Status, Changelog. Docs opens the introduction and is the current entry on every docs page; RFC opens the RFC index and is the current entry on every RFC page.
- The models page was titled "Model Index" and the status page "Model Status"; the models page's description names latency and throughput where it named the live status.
- `site/src/shared/i18n.ts` gained, in English and Chinese, the strings of the docs and RFC search, the catalog's latency and throughput columns and code button, and the status page's uptime share and day card ("Last 90 days", "{ok} of {n} answered").
- `site/src/shared/status-build.ts` was added: `statusAtBuild()` reads the status probe's `latest.json`, `history.json` and `monthly.json` once per build, from the directory in `MMSP_STATUS_DIR`, else from the `status-data` branch on raw.githubusercontent.com with a 10 s timeout, else returns none and logs a warning instead of failing the build.
