# 工具调用的参数是模型写出的 JSON 文本

- **Date:** 2026-11-17
- **Type:** feature
- **Scope:** `types`, `stream_items`, `legacy`, `base_client`, every client that sends tool calls, `integration`
- **PR:** [#340](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/340)
- **Breaking:** yes — `tool_call.done` 的 `arguments` 改为字符串（对象的 JSON 文本），不再是解析后的对象

[English](2026-11-17-tool-call-arguments-text.md)

## 变更内容

- 两个包的 `tool_call.done` 以其片段拼接后的 JSON 文本作为 `arguments`，片段拼接为空时为 `{}`，遵循 [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) §3.4 与 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) §4.3。`StreamItems` 仍检查文本能解析为 JSON 对象，不能解析时抛出 `ToolCallArgumentParseError`，但不再保留解析后的对象。9007199254740993 这样的整数和超过 17 位的小数按模型写出的原样输出；此前的解析会在 TypeScript 中把前者变成 9007199254740992，并在两种语言中把后者变成最接近的浮点数。
- Responses 与 Chat Completions 客户端（`openai-official`、`openai-responses`、`openai-chat` 及其 vLLM 适配器、`deepseek-official`、`minimax-official`、`moonshot-official`、`zai-official`）原样回放这段文本。Anthropic 客户端和两个 Google 客户端只为构建线路要求的对象而解析它，即 Messages 的 `input`、generateContent 的 `args` 与 Interactions 的 `arguments`。两个包在 Chat Completions 与 Responses 线路上发送的参数现在完全相同，此前二者的空格不同。
- 工具调用的 `arguments` 不是对象的 JSON 文本时，`streaming_response` 在请求之前抛出 `InvalidMessageError`，带 `item_type` `tool_call.done` 与 `message_index`。
- `normalize_legacy_messages` 把 0.5.8 及更早版本以对象记录的工具调用 `arguments` 转换为它的 JSON 文本，每个进程警告一次，读取到 0.6.0 为止（[MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.zh.md) §7）。
- playground 与 tracer 按模型写出的原样显示参数，不再为美化而解析。
- 文档、README、示例与两个 skill 在运行工具之前先解析参数。

## 兼容性

- 读取 `arguments` 的调用方需先解析：Python 用 `json.loads(item["arguments"])`，TypeScript 用 `JSON.parse(item.arguments)`。
- 手动构建 `tool_call.done` 的调用方传入 JSON 文本。对象在 0.6.0 之前仍被接受并给出弃用警告，0.5.8 保存的历史与 trace 回放不变。
- 要求对象的线路收到的内容不变：文本在边界处解析，TypeScript 的数保留 53 位。Gemini 以对象交付的参数仍像以前一样序列化，保存的是 Gemini 留下的内容。
