# The Model Status page: a status card, one line per channel, a day range to page through, data baked in at build

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `.github`
- **PR:** [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283)

[中文版](2026-10-23-site-status-page.zh.md)

## What changed

- `/status/` opened with one card. Its border and head band took the colour of the overall state (green when every channel was up, amber when one was degraded, red on an outage, grey without data or keys), and the band held that state's icon and words. Under the band sat the "Checked N ago" link, **Run a check now** and the month's probe cost. The button's explanation left the visible text for its `title` and an `aria-describedby` description; the progress line beside it appeared only after a click.
- The probe's states were drawn as icons instead of dots (`statusIcon()` in `site/src/shared/status.ts`): a check in a green circle for up, which replaced the brand blue, a triangle with an exclamation mark for degraded, a cross for down, a dash for no key and a ring for a day not probed.
- Each channel's block opened with one line: the state icon, vendor, model id and provider on the left, and TTFT, TPS, the month's cost and the uptime share (`100% uptime` / `可用率 100%`) on the right; on a phone the numbers took the next line. The bars ran under that line across the block's full width. The "90 days ago … Today" axis under the bars was removed.
- The bars became 16 px tall and at most 20 px wide. A switch above the blocks showed 7, 30 or 90 days, remembered as `mmsp-site.status-range`, and a pager beside it (`‹ Jul 26 – Oct 23 ›`) moved that window back and forth by its length, back to the oldest day the probe's files held. The uptime share counted the days shown, and each strip was named by the window's dates.
- `.github/status/probe.py` kept 365 days in `history.json` instead of 90, and every day for good in `history/YYYY.json`, one file per UTC year, which its first run filled from `history.json`.
- Each daily bar became a button that opened a card on hover, focus or tap: the date, the day's state, the samples that answered (`3/3`), TTFT, TPS and cost, and on a failed day the masked error. The arrow keys, Home and End moved between days, Escape closed the card, and a tap outside the strip closed it on a phone.
- The board filled the page's column, its right edge aligned with the top bar's, instead of stopping at 64 rem.
- `site/src/components/StatusBoard.astro` embedded the probe's `latest.json`, `history.json` and `monthly.json` as read at build (`statusAtBuild()`), the last 180 days of the history, and drew the page from them before any request; it then read the `status-data` branch in the background and redrew only when it held a newer run. Paging further back read the branch's full `history.json`, then the archive of each year the window reached.
- The loaders of `site/src/shared/status.ts` dropped `cache: "no-store"`, gave up on a request after 8 s, and fell back to the GitHub contents API (`https://api.github.com/repos/Prism-Shadow/model-message-stream-protocol/contents/<file>?ref=<status-data|commit>`) when raw.githubusercontent.com did not answer; Run a check now read the published commit's files the same way.
- The status files keyed each target by its registry triple joined by `+` (`deepseek-official+https://api.deepseek.com+deepseek-flash`) instead of `|`, which split the table cells of the run's step summary. `.github/status/probe.py` rewrote the `|` keys of `latest.json`, `history.json` and `monthly.json` as it read them, and the site did the same for files written before (`withCurrentKeys()` in `site/src/shared/status.ts`). The block anchors on `/status/` stayed the same.
- `.github/status/targets.json` probed TokenDance's `deepseek-v4.1-flash` through `openai-chat` instead of `deepseek-official`.
- `.github/workflows/pages.yml` checked out the `status-data` branch and built the site with `MMSP_STATUS_DIR` pointing at it. `.github/workflows/status.yml` gained `actions: write` and started `pages.yml` on `main` after every run that pushed new data.
- `.github/status/probe.py` wrote `ok`, `samples` and `error` into each day of `history.json` as well.
