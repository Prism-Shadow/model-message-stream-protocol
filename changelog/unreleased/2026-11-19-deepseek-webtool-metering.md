# DeepSeek meters web results

- **Date:** 2026-11-19
- **Type:** fix
- **Scope:** `deepseek-webtool`
- **PR:** [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351)

[中文版](2026-11-19-deepseek-webtool-metering.zh.md)

## What changed

Search with no matches and Fetch with an empty page now contribute zero prompt units. A request that produces a result contributes 1,000 units, even when the search returns multiple pages. Both SDKs still return the web item for an empty result.
