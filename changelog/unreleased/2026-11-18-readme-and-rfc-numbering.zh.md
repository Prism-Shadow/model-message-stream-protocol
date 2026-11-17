# 精简中英文 README 并修正连续的 RFC 编号

- **Date:** 2026-11-18
- **Type:** process
- **Scope:** `design`, `site`
- **PR:** [#347](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/347)

[English](2026-11-18-readme-and-rfc-numbering.md)

## 变更内容

- [`README.md`](../../README.md) 将 `## Supported Models` 与 `### Clients` 精简为重点支持的模型家族和核心官方/兼容协议客户端，移除网页搜索与语音/转写等专项示例（`deepseek-search`、`deepseek-speech`、`openai-transcription`），收紧 `## APIs` 与 `## MMSP Server` 说明，删去重复的 `## Wire Protocols` 表格，并添加指向 [`README.zh.md`](../../README.zh.md) 的语言切换入口。
- 新增根目录中文版 [`README.zh.md`](../../README.zh.md)，与英文版逐节对应。
- [MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-prompt-cache-sessions.zh.md) 提示缓存会话（中英文）由 `MMSP-RFC-0014` 重编号为 `MMSP-RFC-0011`，使 [`design/README.zh.md`](../../design/README.zh.md) 中的 RFC 编号从 `0001` 至 `0011` 保持连续，并在 `site/astro.config.mjs` 中为旧网址 `mmsp-rfc-0014-prompt-cache-sessions` 添加重定向。
