---
description: UniConfig，请求的配置选项。所有字段均为可选。
---

`UniConfig` 是两个流式方法的第二个参数。传入空对象即使用默认配置。

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
| `max_tokens` | 整数 | 输出 token 的数量上限。 |
| `temperature` | 数字 | 采样温度。部分模型会固定此值，拒绝其他设置。 |
| `system_prompt` | 字符串 | 系统指令。 |
| `tools` | 列表 | 模型可调用的工具，包含 `name`、`description` 和 JSON Schema 格式的 `parameters`。 |
| `tool_choice` | `"auto"`、`"required"`、`"none"` 或工具名列表 | 指定模型可以或必须调用哪些工具。具体支持情况因模型而异：Claude Opus 5.5、Sonnet 5.5 和 Fable 5.1 不能强制调用工具，在它们上面传 `"required"` 或工具名列表会抛错。 |
| `thinking_level` | `"none"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` | 控制模型的思考深度。所有级别均可安全传入，MMSP 会自动映射到模型支持的最接近级别。 |
| `thinking_summary` | 布尔 | 请求返回思考摘要。实际是否返回取决于模型能力。 |
| `prompt_caching` | `"enable"`、`"disable"`、`"enhance"` | 提示词缓存策略。多数服务商自行管理缓存，通常只接受 `enable`。 |
| `fast_mode` | 布尔 | 请求使用服务商的快速档位（如果支持）。 |
| `image_config` | 对象 | 图像生成配置：`aspect_ratio`（`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`9:16`、`16:9`、`21:9`）和 `image_size`（`1K`、`2K`）。 |
| `tts_config` | 列表 | 语音合成配置：每个说话人对应一项，包含 `voice` 和可选的 `speaker`。两个说话人时，文本写成台词稿，每轮一行 `Name: 台词`。 |
| `embedding_config` | 对象 | 向量生成配置：`dimensions` 指定向量维度。 |
| `trace_id` | 字符串 | 用此 ID 保存当前轮次。详见 [Tracer 与 Playground](/zh/docs/tracing/)。 |

## 模型拒绝的参数值

如果模型不支持某个参数值，会在请求发出前抛出 `UnsupportedParameterError`，并指明客户端和具体参数。`thinking_level` 例外，它永远不会抛错。模型无法关闭思考时，`"none"` 取最少的思考：Claude Opus 5.5、Fable 5.1 和 GPT-6 上是最低的思考档位，Claude Sonnet 5.5 上是不在回答前思考。

## 在 Python 和 TypeScript 中

两种语言的字段名保持一致。两个 SDK 包均导出 `ThinkingLevel` 和 `PromptCaching` 枚举。Python 同时接受普通字符串；TypeScript 需使用枚举成员，例如 `ThinkingLevel.HIGH` 和 `PromptCaching.ENABLE`。
