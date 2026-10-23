# Unreleased

[中文版](README.zh.md)

- [2026-10-23] The Model Status page opened with one card tinted by the overall status, drew states as icons, put each channel's numbers and uptime on one line above its bars, switched between 7, 30 and 90 days and paged that window back and forth through a year of history and its yearly archives, opened a card per daily bar, filled the page's width, and was built with the probe's data, rebuilt after every run; status keys joined the triple with `+`. ([details](2026-10-23-site-status-page.md), [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283))
- [2026-10-23] The site's top bar became Overview, Docs, RFC, Model Index, Model Status and Changelog, and the site build gained a reader for the status probe's files. ([details](2026-10-23-site-top-bar.md), [#282](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/282))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
