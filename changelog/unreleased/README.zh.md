# 未发布

[English](README.md)

- [2026-10-23] 客户端、`AutoLLMClient` 与 `utils` 抛出的每一个裸 `ValueError`、`RuntimeError` 与 `Error` 都改为对应的 MMSP 错误类，且每个类仍是它所取代的内置错误。([详情](2026-10-23-typed-error-sites.zh.md))
- [2026-10-23] 新增 `RoutingError`、`InvalidMessageError`、`UnsupportedContentError`、`UnknownEventError`、`ProviderStreamError` 与 `ConcurrentCallError`，每个都是它所取代的内置错误的子类；每个 MMSP 错误都连同字段经 MMSP 服务端转发。([详情](2026-10-23-typed-error-classes.zh.md), [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
