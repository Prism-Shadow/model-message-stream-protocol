# Unreleased

[English](README.md)

- [2026-10-10] Playground：向另一个模型发送消息时在分隔线下开始新对话；server 页面可把模型行直接向上游测试（首个 token、总耗时、输出 token、TPS），运行中的服务端没有 key 时显示提示，Start 和 Apply 前先确认。([详情](2026-10-10-playground-server-ux.zh.md), [#250](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/250))
- [2026-10-09] 支持 Claude Haiku 5.5：`anthropic-official` 支持 `claude-haiku-5-5`，`list_supported_models` 列出它和 OpenRouter 上的 `anthropic/claude-haiku-5.5`；Claude Sonnet 5.5 的缓存读取降到 0.10 美元。([详情](2026-10-09-claude-haiku-5-5.zh.md), [#249](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/249))
- [2026-10-09] Gemini 官方客户端改名为 `google-official`（别名 `gemini-official`），与其他官方客户端一样以厂商命名；类名改为 `GoogleOfficialClient`。([详情](2026-10-09-google-official.zh.md), [#248](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/248))
- [2026-10-02] 新增 MMSP 服务端，通过 HTTP 把一张表里的模型提供为 MMSP 流（`python -m mmsp.integration.server --config FILE`、`npm run server -- --config FILE`）；Playground 的 `/server/` 页面把表保存到配置文件，据此启动服务端并画出其最近 60 天的指标；新增调用它的 `mmsp` 客户端；服务端报告的错误以新增的 `UpstreamError` 抛出。([详情](2026-10-02-mmsp-server.zh.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
