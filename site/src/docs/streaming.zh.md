---
description: UniEvent，以及每条流都遵循的同一套文法，无论来自哪家服务商。
---

流式响应是一系列 `UniEvent` 对象。分为两种：响应进行中的 `delta`，和响应结束时的 `stop`。

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
| `usage_metadata` | null | 本次请求的 token 用量 |
| `finish_reason` | null | `"stop"`、`"length"`、`"tool_call"` 或 `"unknown"` |
| `created_at` | Unix 时间戳，毫秒 | Unix 时间戳，毫秒 |

## 文法

```text
stream := delta_event* stop_event
items  := group*                 delta 事件里的内容项，每个事件一项，按顺序
group  := K.delta+ K.done        K = text | thinking | tool_call | inline_data | inline_thinking | embedding
```

- **每个 delta 事件只含一项内容。** 按顺序看，这些项组成一个个组：先是一个或多个 `K.delta` 片段，然后是一个持有完整内容项的 `K.done`。
- **`.done` 项就是最终的消息。** 按流顺序，结合 `stop` 事件的用量和结束原因，它们构成有状态调用记录的助手消息。
- **组之间绝不交错。** 一个组的 `.done` 一定在下一个组的第一个 `.delta` 之前到达，因此每个片段都明确属于当前打开的组，无需 id 来归属。
- **`stop` 事件总是最后一个。** 它只出现一次，不携带内容项，但一定包含用量和结束原因。用量应在此读取，不要跨事件累加。
- **一条流以 `stop` 事件或异常结束，二者不会同时出现。** 详见[错误处理](/zh/docs/errors/)。

## Delta 项

| 类型 | 增长的字段 | 说明 |
| --- | --- | --- |
| `text.delta` | `text` | |
| `thinking.delta` | `thinking` | |
| `tool_call.delta` | `arguments`，JSON 字符串片段 | `name` 和 `tool_call_id` 仅在调用的第一个片段设置，后续为空 |
| `inline_data.delta` | `data` 字节 | 音频分块到达，每块一项；每张图片独立为一项 |
| `inline_thinking.delta` | `data` 字节 | |
| `embedding.delta` | `embedding` | 整个向量 |

`image_url` 和 `tool_result` 仅由用户侧写入，因此没有 delta 形式。

`.done` 项相当于所在组的第一个片段，但将其增长字段替换为所有片段拼接后的完整内容：拼接的文本或思考、解析后的参数、完整的字节或向量。

## 示例

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

第三个事件只携带了 [`fidelity`](/zh/docs/fidelity/)：签名在思考文本之后到达。一个组内最多一个片段携带 fidelity，`.done` 项携带相同的值。

## 工具调用

- 一次工具调用的首个 `tool_call.delta` 携带 `name` 和 `tool_call_id`。后续片段只携带 `arguments`。
- `tool_call.done` 携带解析为对象的 `arguments`。应从此读取工具调用，并使用对应的 `tool_call_id` 返回每个结果。
- 参数必须能解析为 JSON 对象。如果格式错误、被截断或解析出其他类型，MMSP 会在 `tool_call.done` 的位置抛出 `ToolCallArgumentParseError`。
- `minimax-official` 从服务端已完成的项读取调用，因此其调用流为一个 `tool_call.delta`（携带名称、id 和完整参数）后接 `tool_call.done`。

## 向量

向量模型对你发送的每条消息依次流式输出一个 `embedding.delta` 和一个 `embedding.done`，最后是 `stop` 事件。一条消息的所有内容项共同嵌入为一个向量。
