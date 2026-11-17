# Unreleased

[中文版](README.zh.md)

- [2026-11-17] Ran the Python offline tests on the older anthropic and google-genai lines in jobs of their own beside the live tests, so the TypeScript tests no longer wait for them. ([details](2026-11-17-parallel-sdk-lines.md), [#338](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/338))
- [2026-11-17] `tool_call.done` carried `arguments` as the JSON text the model wrote in place of the parsed object, so large integers and long decimals kept every digit; the clients replayed it as it was where the wire takes a string. ([details](2026-11-17-tool-call-arguments-text.md), [#340](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/340))
- [2026-11-17] MMSP-RFC-0002, 0003 and 0009, edited in place, kept a tool call's `arguments` as the JSON text the model wrote in place of the parsed object. ([details](2026-11-17-tool-call-arguments-text-rfc.md), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339))
- [2026-11-17] `deepseek-webtool` reported 1,000 prompt tokens for each request in place of 1, and the registry priced `deepseek-search` and `deepseek-fetch` on DeepSeek and TokenDance at ¥5 per million prompt tokens in place of ¥5,000. ([details](2026-11-17-webtool-request-tokens.md), [#337](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/337))
- [2026-11-17] MMSP-RFC-0003 Message Requests, edited in place, counted a request an endpoint bills by the request as 1,000 prompt tokens in place of 1. ([details](2026-11-17-webtool-request-tokens-rfc.md), [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336))
- [2026-11-17] Made the live E2E tests retry an overloaded server's 529 as they retry a rate limit. ([details](2026-11-17-e2e-retry-overloaded.md), [#335](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/335))
