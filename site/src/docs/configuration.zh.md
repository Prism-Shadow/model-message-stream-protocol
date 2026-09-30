---
description: UniConfig，一次请求的选项。每个字段都是可选的。
---

`UniConfig` 是两个流式方法的第二个参数。传一个空对象即取默认值。

```json
{
  "max_tokens": 1024,
  "temperature": 1.0,
  "system_prompt": "You are a helpful assistant.",
  "tools": [
    {
      "name": "get_weather",
      "description": "Gets the current weather for a given location.",
      "parameters": {
        "type": "object",
        "properties": {"location": {"type": "string", "description": "The city name"}},
        "required": ["location"]
      }
    }
  ],
  "tool_choice": "auto",
  "thinking_level": "high",
  "thinking_summary": true,
  "prompt_caching": "enable",
  "fast_mode": false,
  "image_config": {"aspect_ratio": "4:3", "image_size": "1K"},
  "tts_config": [{"voice": "Kore"}],
  "embedding_config": {"dimensions": 768},
  "trace_id": "agent1/conversation_001"
}
```

## 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `max_tokens` | 整数 | 输出 token 的上限。 |
| `temperature` | 数字 | 采样温度。有些模型固定了它，拒绝其他值。 |
| `system_prompt` | 字符串 | 系统指令。 |
| `tools` | 列表 | 模型可以调用的工具：`name`、`description`，以及 JSON Schema 形式的 `parameters`。 |
| `tool_choice` | `"auto"`、`"required"`、`"none"`，或工具名列表 | 模型可以或必须调用哪些工具。支持程度因模型而异。 |
| `thinking_level` | `"none"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` | 模型思考多少。每个级别都可以放心传：MMSP 会映射到模型支持的最接近的一档。 |
| `thinking_summary` | 布尔 | 请求思考摘要。是否真的返回取决于模型。 |
| `prompt_caching` | `"enable"`、`"disable"`、`"enhance"` | 提示词如何缓存。大多数提供商自行缓存，只接受 `enable`。 |
| `fast_mode` | 布尔 | 请求提供商的更快档位，如果有的话。 |
| `image_config` | 对象 | 图像生成用：`aspect_ratio`（`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`9:16`、`16:9`、`21:9`）和 `image_size`（`1K`、`2K`）。 |
| `tts_config` | 列表 | 语音用：每个说话人一条，含 `voice` 和可选的 `speaker`。 |
| `embedding_config` | 对象 | 向量用：`dimensions`，向量的维数。 |
| `trace_id` | 字符串 | 用这个 id 保存本轮。见 [Tracer 与 Playground](/zh/docs/tracing/)。 |

## 模型拒绝的值

模型无法接受的值会在请求发出之前抛出 `UnsupportedParameterError`，指明客户端和参数。`thinking_level` 是例外：它从不抛错。

## 在 Python 和 TypeScript 中

两种语言的字段名相同。两个包都导出 `ThinkingLevel` 和 `PromptCaching`。Python 也接受普通字符串；TypeScript 接受枚举成员，比如 `ThinkingLevel.HIGH` 和 `PromptCaching.ENABLE`。
