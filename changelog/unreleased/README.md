# Unreleased

[中文版](README.zh.md)

- [2026-11-17] Ran the Python offline tests on the older anthropic and google-genai lines in jobs of their own beside the live tests, so the TypeScript tests no longer wait for them. ([details](2026-11-17-parallel-sdk-lines.md), [#338](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/338))
- [2026-11-17] `deepseek-webtool` reported 1,000 prompt tokens for each request in place of 1, and the registry priced `deepseek-search` and `deepseek-fetch` on DeepSeek and TokenDance at ¥5 per million prompt tokens in place of ¥5,000. ([details](2026-11-17-webtool-request-tokens.md), [#337](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/337))
- [2026-11-17] MMSP-RFC-0003 Message Requests, edited in place, counted a request an endpoint bills by the request as 1,000 prompt tokens in place of 1. ([details](2026-11-17-webtool-request-tokens-rfc.md), [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336))
- [2026-11-17] Made the live E2E tests retry an overloaded server's 529 as they retry a rate limit. ([details](2026-11-17-e2e-retry-overloaded.md), [#335](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/335))
