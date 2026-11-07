# OpenAI Chat 客户端读取 Mistral 的内容块

- **Date:** 2026-11-07
- **Type:** fix
- **Scope:** `openai_chat`
- **Issue:** [#320](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/320)

[English](2026-11-07-openai-chat-content-chunks.md)

## 变更内容

- Mistral 兼容端点上的思考模型把思考放在 `delta.content` 里当作内容块流式下发，思考与答案是同一个列表。`transformModelOutputToUniEvent` / `transform_model_output_to_uni_event` 把 `delta.content` 当作字符串，于是 `StreamItems` 把块对象拼成了 `"[object Object]"`：答案被吞进思考，没有任何思考条目，调用方的历史把它当作模型说过的话记下来。
- 现在按线序把块读成思考与文本——`{type: "thinking", thinking: [{type: "text", text}]}` 块成为 `thinking.delta`，`{type: "text", text}` 块成为 `text.delta`，纯字符串仍是一个 `text.delta`。思考片段的 fidelity 是 `{item_id: "content", reasoning_field: "content"}`，记录它来自 content 字段。
- 回放同样是这个形状：`transformUniMessageToModelInput` / `transform_uni_message_to_model_input` 把这样的 `thinking.done` 放回 `content` 里——`[{type: "thinking", thinking: [{type: "text", text}], closed: true}, …]` 排在答案之前——而不是走该端点会以 `422 extra_forbidden` 拒收的 `reasoning_content`。它也不进入回放字段集合，因此之后的工具调用轮次不会收到空的 `reasoning_content`。
- `tests/reasoning_fidelity` 与 `tests/test_reasoning_fidelity.py` 覆盖块流的条目拆分与回放消息。
