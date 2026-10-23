# Unreleased

[中文版](README.zh.md)

- [2026-10-23] Retyped every bare `ValueError`, `RuntimeError` and `Error` the clients, `AutoLLMClient` and `utils` raised to the MMSP class for it, each still the built-in it replaced. ([details](2026-10-23-typed-error-sites.md), [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290))
- [2026-10-23] Added `RoutingError`, `InvalidMessageError`, `UnsupportedContentError`, `UnknownEventError`, `ProviderStreamError` and `ConcurrentCallError`, each a subclass of the built-in error it replaces, and relayed every MMSP error through the MMSP server with its fields. ([details](2026-10-23-typed-error-classes.md), [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288))
- [2026-10-23] A token count of 0 stayed 0 in both packages instead of becoming null, and the Responses-compatible clients reported a count the server left out as null instead of 0. ([details](2026-10-23-usage-zero-counts.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] Made the live E2E tests retry an `IncompleteStreamError` as they retry a rate limit. ([details](2026-10-23-e2e-retry-incomplete-stream.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
