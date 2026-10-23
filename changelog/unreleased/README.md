# Unreleased

[中文版](README.zh.md)

- [2026-10-23] The history held deep copies, a second stateful call while one was in flight raised `ConcurrentCallError`, a message with nothing a client can send raised `InvalidMessageError` instead of being dropped or sent empty, embedding vectors paired with their inputs by `index`, and the `mmsp` client stamped `created_at` and raised `IncompleteStreamError` for a stream ended before its `stop` event. ([details](2026-10-23-history-copies-and-empty-messages.md), [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291))
- [2026-10-23] Added `RoutingError`, `InvalidMessageError`, `UnsupportedContentError`, `UnknownEventError`, `ProviderStreamError` and `ConcurrentCallError`, each a subclass of the built-in error it replaces, and relayed every MMSP error through the MMSP server with its fields. ([details](2026-10-23-typed-error-classes.md), [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
