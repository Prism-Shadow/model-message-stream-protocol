# Chat Completions 客户端把网关的加密推理块记录在共享的 fidelity 键下

- **Date:** 2026-10-23
- **Type:** refactor
- **Scope:** `openai_chat`, `tests`, `site`, `skills`
- **PR:** [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287)

[English](2026-10-23-openai-chat-generic-fidelity.md)

## 变更内容

- `OpenaiChatClient` 把 `delta.reasoning_details` 中的 `reasoning.encrypted` 块记录为思考内容项的 `fidelity.encrypted_content`，连同该块的 `format`，以及记为 `reasoning_id` 的块 `id`，`OpenaiChatVllmAdapterClient` 随之一起。块的 `type` 与 `index` 不记录。此前整个块原样保存为 `fidelity.reasoning_details`。
- 回传助手轮次时，由这些键按内容项顺序重建块，作为 `reasoning_details` 发出，形如 `{type: reasoning.encrypted, data, format, id}`。`encrypted_content` 不带 `format` 的思考内容项不发送块。
- `reasoning.summary` 或 `reasoning.text` 块照旧作为思考文本流出，不带 fidelity。
- 客户端把 `reasoning_details` 当作 Chat Completions 的扩展字段读取，无论哪个端点发送它；点名某个网关的注释改写了措辞。
- 0.5.5 以 `fidelity.reasoning_details` 记录的思考内容项按原样回传，直到 0.6.0。
- fidelity 页面与 mmsp-dev 技能列出了这些键。
