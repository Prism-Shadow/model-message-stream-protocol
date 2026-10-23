# 未发布

[English](README.md)

- [2026-10-23] Chat Completions 客户端把网关的加密推理块记录为 `encrypted_content`、`format` 与 `reasoning_id`，并在回传时重建该块，不再原样保存整个块。([详情](2026-10-23-openai-chat-generic-fidelity.zh.md), [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
