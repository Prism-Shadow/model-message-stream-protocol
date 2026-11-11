# 客户端插件，以及 openai-chat 上 Mistral 的思考块与推理档位

- **Date:** 2026-11-11
- **Type:** fix
- **Scope:** `base_client`, `plugin`, `openai_chat`, `openai_responses`, `ant_messages`, `tests`, `site`
- **PR:** pending
- **Issue:** [#320](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/320), [#321](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/321)

[English](2026-11-11-client-plugins.md)

## 变更内容

- 两个包新增 `ClientPlugin` 与 `enabled_plugins` / `enabledPlugins`（`src_py/mmsp/plugin.py`、`src_ts/src/plugin.ts`），按 [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.zh.md) §9 的规定实现。基类以 `_plugins` 保存客户端启用的插件。`openai-chat`、`openai-responses` 与 `ant-messages` 从各自的 `plugins/` 文件夹构建插件，在 SDK 调用之前调用 `on_request` / `onRequest`，在事件转换之前调用 `on_wire_event` / `onWireEvent`，在它之后调用 `on_event` / `onEvent`。
- `openai-chat` 把 Mistral 在 `delta.content` 中以内容块流式返回的思考读作 `reasoning_content` 思考；此前在 TypeScript 中，这些内容块被拼进文本，成为 `[object Object]`。它把这段思考作为思考块放在该回合内容之前发回，不再以推理字段发回，因为 Mistral 会以 422 `extra_forbidden` 拒绝推理字段。它还对 Mistral 模型列表标明 `capabilities.reasoning` 的模型发送 `reasoning_effort`，每个客户端只读取一次模型列表。这三项都来自它在 `mistral.ai` 上启用的 `mistral` 插件，移植自 ParaN3xus 的 [#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322) 与 [#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323)。
- OpenRouter 补全 token 数的修正从 `openai-chat` 与 `ant-messages` 的转换方法中移入它们的 `openrouter` 插件。`openai-responses` 在 GPT-6 上把 `none` 发成 `low` 的处理，以及 `openai-chat` 与 `openai-responses` 为 GPT-5.6 和 GPT-6 设置图片 `detail: "high"` 的处理，移入它们的 `gpt` 插件。各自发送的内容不变。

## 配置行为

| 键 | 客户端与端点 | 发送 |
| --- | --- | --- |
| `thinking_level` | `mistral.ai` 上的 `openai-chat`，`capabilities.reasoning` 为 true 的模型 | `reasoning_effort`：`low` 发 `low`，`medium` 与 `high` 发 `high`，`xhigh`、`max`；`none` 不发送 |
| `thinking_level` | `mistral.ai` 上的 `openai-chat`，其他模型 | 不发送 |
