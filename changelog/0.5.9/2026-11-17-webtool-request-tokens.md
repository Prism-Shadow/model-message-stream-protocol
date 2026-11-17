# A DeepSeek web tool request counts as 1,000 prompt tokens

- **Date:** 2026-11-17
- **Type:** feature
- **Scope:** `deepseek_webtool`, `registry`
- **PR:** [#337](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/337)
- **Breaking:** yes — `deepseek-webtool` reports 1,000 prompt tokens for each request in place of 1

[中文版](2026-11-17-webtool-request-tokens.zh.md)

## What changed

- `deepseek-webtool`'s `stop` reported 1,000 prompt tokens for each request DeepSeek bills, in place of 1, in both packages, as [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) §3.2 specifies.
- The registry priced `deepseek-search` and `deepseek-fetch`, on DeepSeek and on TokenDance, at ¥5 per million prompt tokens in place of ¥5,000: the price of 1,000 requests, at ¥5 per 1,000.
- The streaming docs said a DeepSeek request counts 1,000.

## Compatibility

- A caller that counts DeepSeek web tool requests from `prompt_tokens` divides it by 1,000. A cost computed as `prompt_tokens` times the registry's price is unchanged, ¥0.005 per request.
