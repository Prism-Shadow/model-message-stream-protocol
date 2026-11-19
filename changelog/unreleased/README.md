# Unreleased

[中文版](README.zh.md)

- [2026-11-20] `google-official` and `google-genai` in TypeScript spoke in `Kore` for an empty `tts_config`, as the Python clients did, instead of raising. ([details](2026-11-20-empty-tts-config-parity.md), [#355](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/355))
- [2026-11-20] The README's OpenRouter GLM-5.3 example passed `client_type="zai-official"`, both READMEs listed `jina-` among the model families and used the registry's `Qwen/Qwen3-Embedding-8B`, and MMSP-RFC-0001 recorded the renumbering of `MMSP-RFC-0014` to `MMSP-RFC-0011`. ([details](2026-11-20-readme-routing-and-rfc-renumbering-record.md), [#354](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/354))
- [2026-11-20] MMSP-RFC-0003 Message Requests, edited in place, counted 1,000 prompt tokens for each request a per-request endpoint bills and 0 for each it does not, in place of 1,000 for every request. ([details](2026-11-20-webtool-billed-requests-rfc.md), [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353))
- [2026-11-19] `deepseek-webtool` counted 1,000 prompt tokens only for a search that returned results or a fetch that returned the page's Markdown, the requests DeepSeek bills, and 0 for the rest. ([details](2026-11-19-deepseek-webtool-metering.md), [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351))
