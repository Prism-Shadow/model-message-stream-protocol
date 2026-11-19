# deepseek-webtool counts only the requests DeepSeek bills

- **Date:** 2026-11-19
- **Type:** fix
- **Scope:** `deepseek_webtool`, `registry`, `site`
- **PR:** [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351)

[中文版](2026-11-19-deepseek-webtool-metering.zh.md)

## What changed

- `deepseek-webtool`'s `stop` counted 1,000 prompt tokens only for a search that returned non-empty `results` and a fetch that returned non-empty `content`, the requests DeepSeek bills, in both packages, as [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) §3.2 specifies after [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353). A search that found nothing and a fetch of an empty page counted 0 in place of 1,000, and still streamed their `webtool` item.
- The streaming docs and the registry comments said which requests count.
