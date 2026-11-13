---
description: UniConfig，请求的配置选项，以及每个客户端为它们发送什么。所有字段均为可选。
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
  "session_id": "8d2f0c4e-7a1b-4c3d-9e5f-0a1b2c3d4e5f",
  "fast_mode": false,
  "image_config": {"aspect_ratio": "4:3", "image_size": "1K"},
  "tts_config": [{"voice": "Kore"}],
  "embedding_config": {"dimensions": 768},
  "webtool_config": {"count": 5},
  "trace_id": "agent1/conversation_001"
}
```

## 字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `max_tokens` | 整数 | 输出 token 的数量上限。 |
| `temperature` | 数字 | 采样温度。 |
| `system_prompt` | 字符串 | 系统指令。 |
| `tools` | 列表 | 模型可调用的工具，包含 `name`、`description` 和 JSON Schema 格式的 `parameters`。 |
| `tool_choice` | `"auto"`、`"required"`、`"none"` 或工具名列表 | 指定模型可以或必须调用哪些工具。 |
| `thinking_level` | `"none"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"` | 控制模型的思考深度。 |
| `thinking_summary` | 布尔 | 请求返回思考摘要。实际是否返回取决于模型。 |
| `prompt_caching` | `"enable"`、`"disable"`、`"enhance"` | 提示词缓存策略。 |
| `session_id` | 字符串 | 请求所属的对话。推荐设置：每个对话一个固定的 id，能提高提示词缓存的命中率。 |
| `fast_mode` | 布尔 | 请求使用服务商的快速档位。 |
| `image_config` | 对象 | 图像输出配置，用于 Gemini 和 `openai-image`：`aspect_ratio`（`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`9:16`、`16:9`、`21:9`）和 `image_size`（`1K`、`2K`）。 |
| `tts_config` | 列表 | 语音合成配置：每个说话人对应一项，包含 `voice` 和可选的 `speaker`。Gemini 语音支持两个说话人，此时文本写成台词稿，每轮一行 `Name: 台词`；`openai-speech` 只接受一项。 |
| `embedding_config` | 对象 | 向量生成配置：`dimensions` 指定向量维度。 |
| `webtool_config` | 对象 | 网页搜索配置：`count` 指定一次搜索返回的结果条数。 |
| `trace_id` | 字符串 | 用此 ID 保存当前轮次。详见 [Tracer 与 Playground](/zh/docs/tracing/)。 |

## 模型拒绝的参数值

客户端无法发送的参数值会在请求发出前抛出 `UnsupportedParameterError`，并指明客户端和具体参数。客户端用不到的字段会被忽略。下面的表格按客户端给出这两种情况。

`thinking_level` 永远不会抛错。模型无法关闭思考时，`"none"` 取最少的思考：Claude Opus 5.5、Haiku 5.5、Fable 5、Fable 5.1，GPT-6 Astra、GPT-6.1 Sol，MiniMax-M3.1-Flash 和 GLM-5.3 上是最低的思考档位；Claude Sonnet 5.5 上是不在回答前思考；Gemini 上是 `minimal` 或 `low`，取模型支持的那一个。GPT-6 Luna、GPT-6.1 Terra、Kimi K3 和 Kimi K3.1 Pro 原样接受 `"none"`。

## 每个客户端发送什么

客户端以 `client_type` 命名（见[模型与端点](/zh/docs/models/)）；`openai-official` 通过 `openai-embedding` 服务 `text-embedding-*` 模型，通过 `openai-image` 服务 `gpt-image-*` 模型，`deepseek-official` 通过 `deepseek-webtool` 服务 `deepseek-search` 和 `deepseek-fetch`。三个媒体客户端 `openai-image`、`openai-speech` 和 `openai-transcription` 只发送模型、提示词、输入文本或文件，以及 `image_config` 或 `tts_config`。两个网页工具客户端 `deepseek-webtool` 和 `jina-webtool` 按 ID 里的 `-search` 或 `-fetch` 区分搜索和抓取。在两个 Google 客户端上，ID 含 `tts` 的是语音模型，含 `embedding` 的是向量模型；在 `google-official` 上，ID 含 `gemini-omni` 的是 Gemini Omni。`mmsp` 客户端原样发送配置，由服务端交给该模型自己的客户端处理，因此适用那个客户端的行。

### `max_tokens`

| 客户端 | 发送为 |
| --- | --- |
| `anthropic-official`、`ant-messages` | `max_tokens`；未设置时为 64000，因为 Messages API 要求必填 |
| `zai-official` | `max_tokens` |
| `openai-official`、`openai-responses`、`deepseek-official`、`minimax-official`、`google-official`、`google-genai` | `max_output_tokens`，语音模型也一样 |
| `google-official` 上的 Gemini Omni | 不发送：视频本身的 token 也计入上限（默认视频为 57,920），按文本设定的上限会在视频生成后才失败 |
| `openai-chat`、`openai-chat-vllm-adapter`、`moonshot-official` | `max_completion_tokens` |
| `openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端、Gemini 向量模型 | 忽略 |

### `temperature`

| 客户端 | 发送为 |
| --- | --- |
| `ant-messages`、`openai-responses`、`openai-chat`、`openai-chat-vllm-adapter`、`zai-official` | `temperature`，原值发送 |
| `minimax-official` | 0 到 1 之间的 `temperature`；超出范围时抛错 |
| `anthropic-official`、`openai-official`、`deepseek-official`、`moonshot-official` | 1.0 不发送；其他值抛错 |
| `google-official`、`google-genai` | 任何值都抛错，语音模型也一样 |
| `openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端、Gemini 向量模型 | 忽略 |

### `system_prompt`

| 客户端 | 发送为 |
| --- | --- |
| `anthropic-official`、`ant-messages` | `system` |
| `openai-official`、`openai-responses`、`deepseek-official`、`minimax-official` | `instructions` |
| `google-official`、`google-genai` | `system_instruction`；语音模型忽略 |
| `openai-chat`、`openai-chat-vllm-adapter`、`moonshot-official`、`zai-official` | 一条角色为 `system` 的首条消息；空字符串不发送 |
| `openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端、Gemini 向量模型 | 忽略 |

### `tools`

| 客户端 | 发送为 |
| --- | --- |
| `anthropic-official`、`ant-messages` | `tools`，`parameters` 改为 `input_schema` |
| `openai-official`、`openai-responses`、`deepseek-official`、`minimax-official`、`google-official` | `tools`，每项带 `type: "function"` |
| `openai-chat`、`openai-chat-vllm-adapter`、`moonshot-official`、`zai-official` | `tools`，每项作为一个 `type: "function"` 工具的 `function` |
| `google-genai` | 一个由 `function_declarations` 组成的工具 |
| `google-official` 上的 Gemini Omni | 抛错 |
| `openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端、Gemini 语音和向量模型 | 忽略 |

### `tool_choice`

单元格是发送的值：在 Anthropic 的两个客户端上是 `type`，在 `google-genai` 上是函数调用的 `mode`。

| 客户端 | `"auto"` | `"none"` | `"required"` | 工具名列表 |
| --- | --- | --- | --- | --- |
| `anthropic-official` | `auto` | `none` | `any` | `any` 加 `name`；只能一个名字 |
| `ant-messages` | `auto` | `none` | `any` | `tool` 加 `name`；只能一个名字 |
| `openai-official`、`openai-responses` | `auto` | `none` | `required` | `allowed_tools`，`mode: "required"` |
| `openai-chat`、`openai-chat-vllm-adapter` | `auto` | `none` | `required` | `allowed_tools`，`mode: "auto"` |
| `google-official` | `auto` | `none` | `any` | `allowed_tools`，`mode: "any"` |
| `google-genai` | `AUTO` | `NONE` | `ANY` | `ANY` 加 `allowed_function_names` |
| `moonshot-official` | `auto` | `none` | Kimi K3 与 K3.1 Pro 上为 `required`；Kimi K2 上抛错 | 抛错 |
| `deepseek-official` | `auto` | `none` | 抛错 | 抛错 |
| `minimax-official` | `auto` | `none`；MiniMax-M3.1-Flash 上抛错 | 抛错 | 抛错 |
| `zai-official` | `auto` | 抛错 | 抛错 | 抛错 |

Claude Opus 5.5、Sonnet 5.5、Haiku 5.5 和 Fable 5.1 不能强制调用工具，在它们上面传 `"required"` 或工具名列表会抛错。两个 Google 客户端只在有 `tools` 时发送 `tool_choice`，语音模型忽略它；Gemini Omni 上任何值都抛错。`openai-embedding`、网页工具客户端、媒体客户端和 Gemini 向量模型忽略它。

### `thinking_level`

每个客户端都把级别作为其协议的思考档位发送：Anthropic 的两个客户端上是自适应思考加 `output_config.effort`，Responses 客户端上是 `reasoning.effort`，Kimi K3、K3.1 Pro 和 GLM（同时开启思考）上是 `reasoning_effort`，Gemini 上是 `thinking_level`。Kimi K2 改为发送思考类型；`disabled` 和 `between_tools` 也是思考类型。`openai-chat` 不发送级别，由端点使用其默认值；Mistral 的端点除外，在那里它对 Mistral 模型列表标明会推理的模型发送 `reasoning_effort`。取第一个匹配的行。

| 客户端与模型 | `none` | `low` | `medium` | `high` | `xhigh` | `max` |
| --- | --- | --- | --- | --- | --- | --- |
| `anthropic-official`：Claude Opus 5.5、Haiku 5.5、Fable 5、Fable 5.1 | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `anthropic-official`：Claude Sonnet 5.5 | `between_tools` | `low` | `medium` | `high` | `xhigh` | `max` |
| `anthropic-official`：Claude 4.6 | `disabled` | `low` | `medium` | `high` | `high` | `max` |
| `anthropic-official`：其他 Claude 模型；`ant-messages` | `disabled` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-official`、`openai-responses`：GPT-6 Luna 与 GPT-6.1 Terra 以外的 GPT-6 模型 | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-official`、`openai-responses`：其他模型 | `none` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-chat`：Mistral 端点上会推理的模型 | 不发送 | `low` | `high` | `high` | `xhigh` | `max` |
| `openai-chat`：其他模型 | 不发送 | 不发送 | 不发送 | 不发送 | 不发送 | 不发送 |
| `deepseek-official` | `none` | `low` | `high` | `high` | `high` | `max` |
| `minimax-official`：MiniMax-M3.1-Flash | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `minimax-official`：MiniMax-M3 | `none` | `low` | `medium` | `high` | `high` | `high` |
| `moonshot-official`：Kimi K2 | `disabled` | `enabled` | `enabled` | `enabled` | `enabled` | `enabled` |
| `moonshot-official`：Kimi K3、Kimi K3.1 Pro | `none` | `low` | `high` | `high` | `max` | `max` |
| `zai-official`：GLM-5.3、GLM-5.3-Flash | `low` | `low` | `high` | `high` | `max` | `max` |
| `zai-official`：其他 GLM 模型 | `disabled` | `low` | `medium` | `high` | `xhigh` | `max` |
| `google-official`：Gemini Omni | `low` | `low` | `high` | `high` | `high` | `high` |
| `google-official`、`google-genai`：图像模型 | `minimal` | `minimal` | `high` | `high` | `high` | `high` |
| `google-official`、`google-genai`：Gemini 3 Pro | `low` | `low` | `high` | `high` | `high` | `high` |
| `google-official`、`google-genai`：其他 Pro 模型，Gemini 3.7、3.8、4 Argon、4 Carbon | `low` | `low` | `medium` | `high` | `high` | `high` |
| `google-official`、`google-genai`：其他 Gemini 模型 | `minimal` | `low` | `medium` | `high` | `high` | `high` |

`openai-chat-vllm-adapter` 同样不发送 `reasoning_effort`，而是以 `chat_template_kwargs` 设置所部署模型的对话模板读取的开关：

| 部署的模型 | `chat_template_kwargs` |
| --- | --- |
| Qwen3.8-27B、Qwen3.8-Flash-Next | `none` 为 `enable_thinking: false`；`low` 和 `medium` 原样作为 `reasoning_effort`，`high` 及以上为 `xhigh` |
| DeepSeek-V4-Flash-Vision-Exp | `none` 不发送，即不思考；其余为 `thinking: true` 加 `reasoning_effort`：`low` 为 `low`，`medium` 到 `xhigh` 为 `high`，`max` 为 `max` |
| DeepSeek-V4-Pro、DeepSeek-V4-Flash | 同上，但 `low` 的 `reasoning_effort` 也是 `high` |
| Qwen3.6-35B-A3B、Qwen3.5-0.8B、Qwen3.5-9B 及其他任何模型 | `enable_thinking`：`none` 为 `false`，其余为 `true` |

`openai-embedding`、网页工具客户端、媒体客户端和 Gemini 语音、向量模型忽略 `thinking_level`。

### `thinking_summary`

| 客户端 | `true` | `false` |
| --- | --- | --- |
| `anthropic-official`、`ant-messages` | 思考块上的 `display: "summarized"` | `display: "omitted"` |
| `openai-official`、`deepseek-official` | `reasoning.summary: "concise"` | 不发送 |
| `openai-responses` | 有 `thinking_level` 时为 `reasoning.summary: "concise"`；没有时不发送 | 不发送 |
| `google-official` | `thinking_summaries: "auto"` | `thinking_summaries: "none"` |
| `google-genai` | `include_thoughts: true` | `include_thoughts: false` |
| `openai-chat`、`openai-chat-vllm-adapter`、`minimax-official`、`moonshot-official`、`zai-official` | 忽略 | 忽略 |

在 Anthropic 的两个客户端上，没有 `thinking_level` 时请求摘要会开启自适应思考；思考类型为 `disabled` 或 `between_tools` 时不发送。`openai-embedding`、网页工具客户端、媒体客户端和 Gemini 语音、向量模型忽略它。

### `prompt_caching`

| 客户端 | `"enable"` | `"enhance"` | `"disable"` |
| --- | --- | --- | --- |
| `anthropic-official` | `cache_control: {"type": "ephemeral"}`，未设置时也是 | 同上加 `ttl: "1h"` | 不发送 |
| `anthropic-official`（Bedrock） | 同样的标记加 `ttl: "5m"`，放在最后一条用户消息的最后一块上，未设置时也是 | 同上加 `ttl: "1h"` | 不发送 |
| `moonshot-official`（Kimi K3 与 K3.1 Pro） | 不发送 | `prompt_cache_options: {"mode": "implicit", "ttl": "1h"}` | 抛错 |
| `openai-official`（GPT-5.6 与 GPT-6） | 不发送 | `prompt_cache_options: {"ttl": "12h"}` | 抛错 |
| 其他所有客户端；`moonshot-official`（Kimi K2）；`openai-official`（更早的 GPT 模型） | 不发送 | 抛错 | 抛错 |
| `openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端、Gemini 向量模型 | 忽略 | 忽略 | 忽略 |

GPT-5.6 与 GPT-6 上，12 小时的缓存写入按 30 分钟写入价格的两倍计费；缓存写入计入 `prompt_tokens`，没有单独的计数。

### `session_id`

每个对话设一个 `session_id`（例如一个 UUID），并在这个对话的各轮之间保持不变。按它路由的端点会把对话送回存有其缓存前缀的机器，从而提高缓存命中率。没有这种键的客户端会忽略它，所以每个请求都可以放心设置。

| 客户端 | 发送为 |
| --- | --- |
| `openai-official`、`openai-responses`、`openai-chat`、`openai-chat-vllm-adapter`、`moonshot-official`、`minimax-official` | `prompt_cache_key`：64 个字符以内为 id 本身，超过时为它的 SHA-256 十六进制摘要 |
| `anthropic-official`、`ant-messages`、`google-official`、`google-genai`、`deepseek-official`、`zai-official`、`openai-embedding`、媒体客户端 | 忽略 |

空字符串不发送。

### `fast_mode`

`false` 或未设置时不发送。

| 客户端 | `true` |
| --- | --- |
| `openai-official`、`openai-responses`、`openai-chat`、`openai-chat-vllm-adapter` | `service_tier: "priority"` |
| `google-official` | `service_tier: "priority"`；Gemini Omni 上抛错 |
| `minimax-official` | MiniMax-M3 上为 `service_tier: "priority"`；MiniMax-M3.1-Flash 上抛错 |
| `ant-messages` | `speed: "fast"` 加 beta `fast-mode-2026-02-01` |
| `anthropic-official` | 同上；Bedrock 上以及 Claude 4.6、Sonnet 5.5、Haiku 5.5 和 Fable 5.1 上抛错 |
| `google-genai`、`deepseek-official`、`moonshot-official`、`zai-official`、`openai-embedding`、`deepseek-webtool`、`jina-webtool`、媒体客户端 | 抛错 |
| Gemini 向量模型 | 忽略 |

### `image_config`

| 客户端 | 发送为 |
| --- | --- |
| `google-genai` | `image_config` |
| `google-official` | `response_format`：先是一个文本项，再是一个带 `aspect_ratio` 和 `image_size` 的图像项；Gemini Omni 上抛错 |
| `openai-image` | `size`，取自下表；只有 `aspect_ratio` 时取该比例的 1K 尺寸，只有 `image_size` 时取 1:1，没有 `image_config` 时不发送 `size` |
| 其他所有客户端；Gemini 语音和向量模型 | 忽略 |

这些尺寸取自 Gemini 每个比例的尺寸，每一个都符合 OpenAI 对 GPT Image 的规则：两边都是 16 的倍数，像素数在 655,360 到 8,294,400 之间，最长边不超过 3840，长宽比不超过 3:1。TokenDance 的 `seedream-5.0-lite` 要求至少 3,686,400 像素，对 1K 尺寸返回它自己的错误。

| `aspect_ratio` | `1K` | `2K` |
| --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` |
| `2:3` | `848x1264` | `1696x2528` |
| `3:2` | `1264x848` | `2528x1696` |
| `3:4` | `896x1200` | `1792x2400` |
| `4:3` | `1200x896` | `2400x1792` |
| `9:16` | `768x1376` | `1536x2752` |
| `16:9` | `1376x768` | `2752x1536` |
| `21:9` | `1584x672` | `3168x1344` |

### `tts_config`

Gemini 语音模型，两个 Google 客户端相同：

| `tts_config` | 发送为 |
| --- | --- |
| 未设置 | 音色 `Kore` |
| 一项 | 该项的 `voice` |
| 两项 | 每个 `speaker` 一个音色；缺少 `speaker` 的项会抛错。Gemini 3.8 语音模型收到的台词稿按轮次拆成多段，说话人作为元数据。 |
| 三项及以上 | 抛错 |

`openai-speech`：

| `tts_config` | 发送为 |
| --- | --- |
| 未设置 | 不发送 `voice`：使用端点的默认音色 |
| 一项 | 该项的 `voice` |
| 两项及以上 | 抛错 |

其他模型和客户端忽略它。

### `embedding_config`

| 客户端 | 发送为 |
| --- | --- |
| `openai-embedding` | `dimensions` |
| `google-official`、`google-genai`：向量模型 | `output_dimensionality` |
| 其他所有客户端和模型 | 忽略 |

### `webtool_config`

| 客户端 | `count` 发送为 |
| --- | --- |
| `deepseek-webtool`：搜索 | `count`，取 1 到 50；不设时 DeepSeek 返回 10 条 |
| `jina-webtool`：搜索 | `num`，取 0 到 20；不设时 Jina 返回 10 条 |
| 两个网页工具客户端：抓取 | 忽略：抓取只读一个页面 |
| 其他所有客户端 | 忽略 |

搜索结果的 `content` 是每条结果的摘要：DeepSeek 用 `summary`，Jina 用 `description`（请求时带 `X-Respond-With: no-content`）。抓取返回页面的 Markdown 正文。

### `trace_id`

| 客户端 | 作用 |
| --- | --- |
| 所有客户端 | 用此 ID 保存当前轮次。 |
| `mmsp` | 由服务端保存当前轮次；客户端不保存。 |

## 在 Python 和 TypeScript 中

两种语言的字段名保持一致。两个 SDK 包均导出 `ThinkingLevel` 和 `PromptCaching` 枚举。Python 同时接受普通字符串；TypeScript 需使用枚举成员，例如 `ThinkingLevel.HIGH` 和 `PromptCaching.ENABLE`。
