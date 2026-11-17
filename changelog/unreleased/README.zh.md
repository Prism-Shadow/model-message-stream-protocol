# 未发布

[English](README.md)

- [2026-11-17] 旧版 anthropic 与 google-genai 版本线上的 Python 离线测试改在各自的任务中与实况测试并行运行，TypeScript 测试不再等它们。([详情](2026-11-17-parallel-sdk-lines.zh.md), [#338](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/338))
- [2026-11-17] `deepseek-webtool` 每次请求上报 1,000 个提示 token（原为 1），注册表中 DeepSeek 与 TokenDance 上的 `deepseek-search` 和 `deepseek-fetch` 定价改为每百万提示 token ¥5（原为 ¥5,000）。([详情](2026-11-17-webtool-request-tokens.zh.md), [#337](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/337))
- [2026-11-17] MMSP-RFC-0003 消息请求在原文上修改，把端点按请求计费的一次请求记为 1,000 个提示 token（原为 1）。([详情](2026-11-17-webtool-request-tokens-rfc.zh.md), [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336))
- [2026-11-17] 实况 E2E 测试像重试限流一样重试服务器过载返回的 529。([详情](2026-11-17-e2e-retry-overloaded.zh.md), [#335](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/335))
