# The Model Status page: one card, uptime labels, a card per day, data baked in at build

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `.github`
- **PR:** [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283)

[中文版](2026-10-23-site-status-page.zh.md)

## What changed

- `/status/` opened with one framed card holding the overall status, the "Checked N ago" link, **Run a check now** and the month's probe cost. The button's explanation left the visible text for its `title` and an `aria-describedby` description; the progress line beside it appeared only after a click.
- The share of up days after each channel's bars read `100% uptime` / `可用率 100%`; the "90 days ago … Today" axis under the bars was removed.
- Each of the 90 daily bars became a button that opened a card on hover, focus or tap: the date, the day's state, the samples that answered (`3/3`), TTFT, TPS and cost, and on a failed day the masked error. The arrow keys, Home and End moved between days, Escape closed the card, and a tap outside the strip closed it on a phone.
- The board filled the page's column, its right edge aligned with the top bar's, instead of stopping at 64 rem.
- `site/src/components/StatusBoard.astro` embedded the probe's `latest.json`, `history.json` and `monthly.json` as read at build (`statusAtBuild()`) and drew the page from them before any request; it then read the `status-data` branch in the background and redrew only when it held a newer run.
- The loaders of `site/src/shared/status.ts` dropped `cache: "no-store"`, gave up on a request after 8 s, and fell back to the GitHub contents API (`https://api.github.com/repos/Prism-Shadow/model-message-stream-protocol/contents/<file>?ref=<status-data|commit>`) when raw.githubusercontent.com did not answer; Run a check now read the published commit's files the same way.
- `.github/workflows/pages.yml` checked out the `status-data` branch and built the site with `MMSP_STATUS_DIR` pointing at it. `.github/workflows/status.yml` gained `actions: write` and started `pages.yml` on `main` after every run that pushed new data.
- `.github/status/probe.py` wrote `ok`, `samples` and `error` into each day of `history.json` as well.
