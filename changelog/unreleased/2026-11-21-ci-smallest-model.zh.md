# 实况测试在每个官方端点只测最新一代的最小模型

- **Date:** 2026-11-21
- **Type:** process
- **Scope:** `ci`
- **PR:** [#363](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/363)

[English](2026-11-21-ci-smallest-model.md)

## 变更内容

- `.github/ci/models.json` 从 `openai-official` 去掉了 `gpt-6.2-sol` 与 `gpt-6.1-terra`，从 `anthropic-official` 去掉了 `claude-sonnet-5-5`。这两个官方端点各留一个文本用例，即该厂商最新一代中最小的模型 `gpt-6-luna` 与 `claude-haiku-5-5`；Bedrock 保留 `global.anthropic.claude-sonnet-4-6`，这是它的密钥唯一能调用的模型。
- 其余官方端点本来就只有一个这样的模型：`gemini-4-hydrogen`、`glm-5.3-flash`、`MiniMax-M3.1-Flash`、`deepseek-flash` 与 `kimi-k3.1-pro`。图像、TTS、语音转写、视频、嵌入与网络工具用例，兼容客户端与网关用例，以及 `slow` 用例都保持不变。
- `.github/ci/README.md` 在 “Model catalog” 一节写明这条规则，并链接 MMSP-RFC-0002。
