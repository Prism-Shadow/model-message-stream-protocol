---
description: UniMessage，每个服务商都能读写的消息，以及它所包含的内容项。
---

`UniMessage` 是对话中的一条消息。你发送它，有状态客户端将它存入历史，一条结束的流最终也合成它。

```json
{
  "role": "assistant",
  "content_items": [
    {"type": "thinking.done", "thinking": "The user wants the weather.", "fidelity": {"signature": "EuYB..."}},
    {"type": "text.done", "text": "Let me check."},
    {"type": "tool_call.done", "name": "get_weather", "arguments": {"location": "Paris"}, "tool_call_id": "call_1"}
  ],
  "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27},
  "finish_reason": "tool_call",
  "created_at": 1694502400000
}
```

## 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `role` | `"user"` 或 `"assistant"` | 消息的作者。工具结果放在 `user` 消息里发送。 |
| `content_items` | 内容项列表 | 消息的载荷，按产生顺序排列。 |
| `usage_metadata` | 对象或 null | token 计数，出现在由流产生的助手消息上。见 [Token 用量](/zh/docs/usage/)。 |
| `finish_reason` | `"stop"`、`"length"`、`"tool_call"`、`"unknown"` 或 null | 响应结束的原因。 |
| `created_at` | 整数 | Unix 时间，单位毫秒。没有这个字段的消息由 MMSP 补上。 |

你写的消息只需要 `role` 和 `content_items`。

## 内容项

消息里的每一项都是完整的，类型以 `.done` 结尾。

| 类型 | 字段 | 作者 |
| --- | --- | --- |
| `text.done` | `text` | 用户和助手 |
| `image_url.done` | `image_url`，一个 URL 或 data URI | 用户 |
| `inline_data.done` | `data` 字节，`mime_type` | 用户和助手：图片、音频 |
| `thinking.done` | `thinking` | 助手 |
| `inline_thinking.done` | `data` 字节，`mime_type` | 助手：图像生成模型用来思考的图片 |
| `tool_call.done` | `name`、作为对象的 `arguments`、`tool_call_id` | 助手 |
| `tool_result.done` | `text`、可选的 `images`、`tool_call_id` | 用户 |
| `embedding.done` | `embedding`，一个数字列表 | 助手 |

助手写的任何一项都可能带有 [`fidelity`](/zh/docs/fidelity/)：服务商在下一轮接受这一项时需要拿回的东西。

在 Python 中 `data` 是 `bytes`，在 TypeScript 中是 `Buffer`。

## 顺序很重要

内容项保持模型产生它们的顺序：先思考，再文本，再工具调用。MMSP 按这个顺序送回，模型因此能接着一个思考与工具调用交错的轮次继续下去。

## 0.5.0 之前保存的消息

0.5.0 之前的内容项类型没有后缀：`text`、`tool_call` 等等。MMSP 在 0.6.0 之前仍然接受它们，会把它们转换成 `.done` 类型，丢弃多余的 `partial_tool_call` 项，并在每个进程里警告一次。

这个转换作用于请求消息、传给有状态调用的消息、`set_history`，以及 tracer 加载的追踪文件。要自己转换已存储的数据，在 Python 中调用 `normalize_legacy_messages`，在 TypeScript 中调用 `normalizeLegacyMessages`。
