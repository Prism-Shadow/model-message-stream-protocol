# Unreleased

[中文版](README.zh.md)

- [2026-10-23] TokenDance's DeepSeek V4.1 Flash rows and their CI case moved from `deepseek-official` to `openai-chat`, the gateway's Chat Completions path. ([details](2026-10-23-tokendance-openai-chat.md))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
