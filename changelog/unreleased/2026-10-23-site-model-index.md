# The Model Index: latency and throughput columns, the code button at the end of the row, the Xiaomi mark

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`
- **PR:** [#284](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/284)

[中文版](2026-10-23-site-model-index.zh.md)

## What changed

- The Model Index (`/models/`) replaced its status column with Latency and Throughput. A probed entry shows its time to first token (`835 ms`, `3.11 s`) and its tokens per second (`101 tok/s`) on one line, each linking to its channel on Model Status. An up channel shows the numbers alone; a degraded one has an amber dot before its latency; a down one shows a red dot and `Down`. An entry the probe has not reached, or reached without a key, shows `—`. Latency sorts shortest first, Throughput highest first, and entries without a value sort last.
- The two columns were built into the page from the status probe's `latest.json` (`statusAtBuild()`), so they show without a request to GitHub. In the browser the page reads `latest.json` from the `status-data` branch and redraws the two columns when the branch holds a newer run. The count line says how many entries are probed daily.
- The integration kit opened from a `<>` button in each row's last cell, at the far right, instead of from the model cell. On a phone the button ends the row's first line, and only a probed row gets a fourth line with its latency and throughput. The kit dialog lists the entry's latency and throughput beside its prices.
- `site/src/shared/catalog-status.ts` was added: `metricCells()` draws the two cells, at build and in the browser.
- `/models.json` joined each entry's `status_key` with `+` instead of `|` (`deepseek-official+https://api.deepseek.com+deepseek-flash`), and `status.key` reads `client+base_url+model`. `withCurrentKeys()` in `catalog-status.ts` rewrote the keys of a `latest.json` written with `|`, at build and in the browser, so the Model Index filled its latency and throughput from either form. The links to Model Status kept their anchors.
- The Xiaomi entries (`xiaomi/mimo-v2.5` on OpenRouter, `mimo-v2.6-flash` on TokenDance) showed the Xiaomi mark: `marks.ts` gained Simple Icons' MI glyph (CC0) in `#FF6900`, and the Xiaomi vendor in `providers.ts` uses it.
- `models.columns.status` was removed from `i18n.ts`.
