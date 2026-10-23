# Unreleased

[中文版](README.zh.md)

- [2026-10-23] The configuration page gives, for each `UniConfig` key, what each client sends, ignores or raises on. ([details](2026-10-23-configuration-docs.md), [#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
