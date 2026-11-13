# MMSP-RFC-0003 写入 GPT-6.1 Terra、allowed-tools 列表与 12 小时缓存

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`
- **PR:** [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313)

[English](2026-11-02-gpt-6-1-terra-rfc.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改，中英文同步，Introduction 加入了这次的事由。§6.1 匹配 `"gpt-6"` 但排除 `"gpt-6-luna"` 与 `"gpt-6.1-terra"`，并列出 `"gpt-5.6"`；`openai-responses` 在 Luna 与 GPT-6.1 Terra 以外的 GPT-6 上把 `none` 发成 `low`；`detail: "high"` 覆盖 GPT-6 也会拒绝的图片，与 GPT-5.6 相同。§6.3 把 GPT-6.1 Terra 列入以 `none` 为关闭开关的模型。§6.4 写明工具名列表在 `openai-official` 与 `openai-responses` 上是带 `mode: "required"` 的 `allowed_tools`，以及 `enhance` 在 `openai-official` 上对 GPT-5.6 及之后的模型是 `prompt_cache_options: {ttl: "12h"}`。
