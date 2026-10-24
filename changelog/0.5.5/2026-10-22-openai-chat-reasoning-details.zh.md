# Chat Completions 客户端保留 OpenRouter 的加密 reasoning_details 片段

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `openai_chat`, `tests`, `site`
- **PR:** [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)

[English](2026-10-22-openai-chat-reasoning-details.md)

## 变更内容

- `OpenaiChatClient` 读取 `delta.reasoning_details`，`OpenaiChatVllmAdapterClient` 随之一起。`reasoning.summary` 或 `reasoning.text` 片段作为思考文本流出。`reasoning.encrypted` 片段原样记录为思考内容项的 `fidelity.reasoning_details`。在 OpenRouter 上，这个片段承载 GPT 加密的推理内容（`format: openai-responses-v1`）和 Gemini 的思考签名（`format: google-gemini-v1`，挂在它所签名的那次调用的 id 下）。这一做法遵循 MMSP-RFC-0011（现为 [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-essential-fields.zh.md)）。
- 回传助手轮次时，记录下的片段按内容项顺序作为 `reasoning_details` 发回，与思考文本放在一起。此前 OpenRouter 在缺少这些片段时照样接受这一轮，模型在没有推理内容的情况下继续。
- 对带有 `reasoning_details` 的数据块，客户端读取片段，而不是镜像这些片段的 `reasoning` 字段。因此来自 OpenRouter 的思考内容项不记录 `reasoning_field`，其文本同时经 `reasoning_content` 和 `reasoning` 发回，OpenRouter 把这两个字段当作同一个。不发送 `reasoning_details` 的端点，`reasoning_content` / `reasoning` 的处理保持原样。
- 网站的 fidelity 页面列出了这个片段。
