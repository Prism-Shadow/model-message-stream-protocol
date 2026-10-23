# 未发布

[English](README.md)

- [2026-10-23] TokenDance 上 DeepSeek V4.1 Flash 的注册表条目及其 CI 用例由 `deepseek-official` 改为 `openai-chat`，即该网关的 Chat Completions 协议。([详情](2026-10-23-tokendance-openai-chat.zh.md), [#286](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/286))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
