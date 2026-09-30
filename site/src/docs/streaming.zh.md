---
description: UniEvent，以及每条流都遵守的同一套文法，不论它来自哪家提供商。
---

一条流式响应是一串 `UniEvent` 对象。它有两种：响应进行中的 `delta`，和响应结束后的 `stop`。

```json
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "Hel"}], "usage_metadata": null, "finish_reason": null, "created_at": 1694502400000}
```

```json
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 10, "thoughts_tokens": null, "response_tokens": 5}, "finish_reason": "stop", "created_at": 1694502400100}
```

## 字段

| 字段 | 在 `delta` 事件上 | 在 `stop` 事件上 |
| --- | --- | --- |
| `role` | `"assistant"` | `"assistant"` |
| `content_items` | 恰好一项，`.delta` 或 `.done` | 空 |
| `usage_metadata` | null | 本次请求的 token 计数 |
| `finish_reason` | null | `"stop"`、`"length"`、`"tool_call"` 或 `"unknown"` |
| `created_at` | Unix 时间，毫秒 | Unix 时间，毫秒 |

## 文法

```text
stream := delta_event* stop_event
items  := group*                 delta 事件里的内容项，每个事件一项，按顺序
group  := K.delta+ K.done        K = text | thinking | tool_call | inline_data | inline_thinking | embedding
```

- **每个 delta 事件一项。** 按顺序看，这些项组成一个个组：一个或多个 `K.delta` 片段，然后是一个持有完整内容项的 `K.done`。
- **`.done` 项就是消息。** 按流的顺序，加上 `stop` 事件的用量和结束原因，它们就是有状态调用记录下来的助手消息。
- **组之间绝不交错。** 一个组的 `.done` 在下一个组的第一个 `.delta` 之前到达，所以每个片段都属于当前打开的组。归属不需要任何 id。
- **`stop` 永远最后。** 它恰好出现一次，不带内容项，总是带有用量和结束原因。在这里读用量，不要跨事件累加。
- **一条流以 `stop` 或异常结束，二者不会同时出现。** 见[错误](/zh/docs/errors/)。

## Delta 项

| 类型 | 增长的字段 | 说明 |
| --- | --- | --- |
| `text.delta` | `text` | |
| `thinking.delta` | `thinking` | |
| `tool_call.delta` | `arguments`，JSON 字符串的一个片段 | `name` 和 `tool_call_id` 只在一次调用的第一个片段上设置，之后为空 |
| `inline_data.delta` | `data` 字节 | 音频作为一项分块到达；每张图片各是一项 |
| `inline_thinking.delta` | `data` 字节 | |
| `embedding.delta` | `embedding` | 一整个向量 |

`image_url` 和 `tool_result` 只由用户写，因此没有 delta 形式。

一个 `.done` 项等于它所在组的第一个片段，把增长的字段替换成所有片段所携带的全部内容：拼接后的文本、思考或字节，解析后的参数，向量。

## 一个例子

Claude 的一个轮次，先思考，再调用工具：

```text
delta  thinking.delta   thinking="Let me"
delta  thinking.delta   thinking=" check"
delta  thinking.delta   thinking=""  fidelity={"signature": "..."}
delta  thinking.done    thinking="Let me check"  fidelity={"signature": "..."}
delta  tool_call.delta  name="get_weather"  tool_call_id="toolu_1"  arguments=""
delta  tool_call.delta  name=""  tool_call_id=""  arguments="{\"location\": "
delta  tool_call.delta  name=""  tool_call_id=""  arguments="\"Paris\"}"
delta  tool_call.done   name="get_weather"  tool_call_id="toolu_1"  arguments={"location": "Paris"}
stop   usage_metadata={...}  finish_reason="tool_call"
```

第三个事件除了 [`fidelity`](/zh/docs/fidelity/) 什么都不带：签名在思考文本之后才到。一个组里最多一个片段带 fidelity，`.done` 项带同样的值。

## 工具调用

- 一次调用的第一个 `tool_call.delta` 带有它的 `name` 和 `tool_call_id`。之后的片段只带 `arguments`。
- `tool_call.done` 带有解析成对象的 `arguments`。从这里读取工具调用，并带着它的 `tool_call_id` 送回每个结果。
- 参数必须能解析成一个 JSON 对象。当参数格式错误、被截断或解析出别的东西时，MMSP 会在原本该出现 `tool_call.done` 的位置抛出 `ToolCallArgumentParseError`。
- `minimax-m3` 从服务端的已完成项读取每次调用，所以它的调用是一个带有名字、id 和全部参数的 `tool_call.delta`，然后是 `tool_call.done`。

## 向量

向量模型对你发送的每条消息各流式输出一个 `embedding.delta` 和一个 `embedding.done`，按发送顺序，然后是 `stop` 事件。一条消息的所有内容项一起嵌入为一个向量。
