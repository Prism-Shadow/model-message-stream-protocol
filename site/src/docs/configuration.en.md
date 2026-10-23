---
description: UniConfig, the options of a request, and what each client sends for them. Every field is optional.
---

`UniConfig` is the second argument of both streaming methods. Pass an empty object to take the defaults.

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

## Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `max_tokens` | integer | The limit on output tokens. |
| `temperature` | number | The sampling temperature. |
| `system_prompt` | string | The system instruction. |
| `tools` | list | The tools the model may call: `name`, `description`, and `parameters` as a JSON Schema. |
| `tool_choice` | `"auto"`, `"required"`, `"none"`, or a list of tool names | Which tools the model may or must call. |
| `thinking_level` | `"none"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"` | How much the model thinks. |
| `thinking_summary` | boolean | Ask for a summary of the thinking. Whether one comes back depends on the model. |
| `prompt_caching` | `"enable"`, `"disable"`, `"enhance"` | How the prompt is cached. |
| `fast_mode` | boolean | Ask for the provider's faster tier. |
| `image_config` | object | For Gemini image output: `aspect_ratio` (`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`) and `image_size` (`1K`, `2K`). |
| `tts_config` | list | For Gemini speech: one entry per speaker, with `voice` and an optional `speaker`. With two speakers, the text is a script with one `Name: line` per turn. |
| `embedding_config` | object | For embeddings: `dimensions`, the size of the vector. |
| `trace_id` | string | Saves the turn under this id. See [Tracer and playground](/docs/tracing/). |

## Values a model rejects

A value a client cannot send raises `UnsupportedParameterError` before the request goes out, naming the client and the parameter. A key a client has no use for is ignored. The tables below give both, per client.

`thinking_level` never raises. Where a model cannot turn thinking off, `"none"` asks for the least of it: the lowest effort on Claude Opus 5.5, Haiku 5.5, Fable 5 and Fable 5.1, GPT-6 Astra and GPT-6.1 Sol, Kimi K3, MiniMax-M3.1-Flash and GLM-5.3; no up-front thinking on Claude Sonnet 5.5; `minimal` or `low` on Gemini, whichever the model takes. GPT-6 Luna takes `"none"` as it is.

## What each client sends

Clients are named by their `client_type` ([Models and endpoints](/docs/models/)); `openai-official` serves the `text-embedding-*` models through `openai-embedding`. On both Google clients, a speech model is one whose id contains `tts` and an embedding model one whose id contains `embedding`. The `mmsp` client sends the configuration unchanged, and the server applies it through the model's own client, so that client's rows hold.

### `max_tokens`

| Client | Sent as |
| --- | --- |
| `anthropic-official`, `ant-messages` | `max_tokens`; 64000 when not set, because the Messages API requires it |
| `zai-official` | `max_tokens` |
| `openai-official`, `openai-responses`, `deepseek-official`, `minimax-official`, `google-official`, `google-genai` | `max_output_tokens`, speech models included |
| `openai-chat`, `openai-chat-vllm-adapter`, `moonshot-official` | `max_completion_tokens` |
| `openai-embedding`, Gemini embedding models | ignored |

### `temperature`

| Client | Sent as |
| --- | --- |
| `ant-messages`, `openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `zai-official` | `temperature`, as given |
| `minimax-official` | `temperature` from 0 to 1; outside that range it raises |
| `anthropic-official`, `openai-official`, `deepseek-official`, `moonshot-official` | nothing for 1.0; any other value raises |
| `google-official`, `google-genai` | any value raises, speech models included |
| `openai-embedding`, Gemini embedding models | ignored |

### `system_prompt`

| Client | Sent as |
| --- | --- |
| `anthropic-official`, `ant-messages` | `system` |
| `openai-official`, `openai-responses`, `deepseek-official`, `minimax-official` | `instructions` |
| `google-official`, `google-genai` | `system_instruction`; ignored by speech models |
| `openai-chat`, `openai-chat-vllm-adapter`, `moonshot-official`, `zai-official` | a first message with the role `system`; nothing for an empty string |
| `openai-embedding`, Gemini embedding models | ignored |

### `tools`

| Client | Sent as |
| --- | --- |
| `anthropic-official`, `ant-messages` | `tools`, with `parameters` as `input_schema` |
| `openai-official`, `openai-responses`, `deepseek-official`, `minimax-official`, `google-official` | `tools`, each with `type: "function"` |
| `openai-chat`, `openai-chat-vllm-adapter`, `moonshot-official`, `zai-official` | `tools`, each as the `function` of a `type: "function"` tool |
| `google-genai` | one tool of `function_declarations` |
| `openai-embedding`, Gemini speech and embedding models | ignored |

### `tool_choice`

A cell is the value sent: the `type` on the Anthropic clients, the function calling `mode` on `google-genai`.

| Client | `"auto"` | `"none"` | `"required"` | A list of names |
| --- | --- | --- | --- | --- |
| `anthropic-official` | `auto` | `none` | `any` | `any` with the `name`; one name only |
| `ant-messages` | `auto` | `none` | `any` | `tool` with the `name`; one name only |
| `openai-official`, `openai-responses` | `auto` | `none` | `required` | `mode: "required"` with the tools |
| `openai-chat`, `openai-chat-vllm-adapter` | `auto` | `none` | `required` | `allowed_tools` with `mode: "auto"` |
| `google-official` | `auto` | `none` | `any` | `allowed_tools` with `mode: "any"` |
| `google-genai` | `AUTO` | `NONE` | `ANY` | `ANY` with `allowed_function_names` |
| `moonshot-official` | `auto` | `none` | `required` on Kimi K3; raises on Kimi K2 | raises |
| `deepseek-official` | `auto` | `none` | raises | raises |
| `minimax-official` | `auto` | `none`; raises on MiniMax-M3.1-Flash | raises | raises |
| `zai-official` | `auto` | raises | raises | raises |

Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 cannot be forced to call a tool, so `"required"` and a list raise on them. The Google clients send `tool_choice` only with `tools`, and speech models ignore it. `openai-embedding` and Gemini embedding models ignore it.

### `thinking_level`

Each client sends the level as its protocol's effort: `output_config.effort` with adaptive thinking on the Anthropic clients, `reasoning.effort` on the Responses clients, `reasoning_effort` on Kimi K3 and GLM (with thinking enabled), `thinking_level` on Gemini. Kimi K2 gets a thinking type instead; `disabled` and `between_tools` are thinking types too. `openai-chat` sends no level, so the endpoint runs its default. The first row that matches applies.

| Client and model | `none` | `low` | `medium` | `high` | `xhigh` | `max` |
| --- | --- | --- | --- | --- | --- | --- |
| `anthropic-official`: Claude Opus 5.5, Haiku 5.5, Fable 5, Fable 5.1 | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `anthropic-official`: Claude Sonnet 5.5 | `between_tools` | `low` | `medium` | `high` | `xhigh` | `max` |
| `anthropic-official`: Claude 4.6 | `disabled` | `low` | `medium` | `high` | `high` | `max` |
| `anthropic-official`: other Claude models; `ant-messages` | `disabled` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-official`, `openai-responses`: GPT-6 models except GPT-6 Luna | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-official`, `openai-responses`: other models | `none` | `low` | `medium` | `high` | `xhigh` | `max` |
| `openai-chat` | not sent | not sent | not sent | not sent | not sent | not sent |
| `deepseek-official` | `none` | `low` | `high` | `high` | `high` | `max` |
| `minimax-official`: MiniMax-M3.1-Flash | `low` | `low` | `medium` | `high` | `xhigh` | `max` |
| `minimax-official`: MiniMax-M3 | `none` | `low` | `medium` | `high` | `high` | `high` |
| `moonshot-official`: Kimi K2 | `disabled` | `enabled` | `enabled` | `enabled` | `enabled` | `enabled` |
| `moonshot-official`: Kimi K3 | `low` | `low` | `high` | `high` | `max` | `max` |
| `zai-official`: GLM-5.3, GLM-5.3-Flash | `low` | `low` | `high` | `high` | `max` | `max` |
| `zai-official`: other GLM models | `disabled` | `low` | `medium` | `high` | `xhigh` | `max` |
| `google-official`, `google-genai`: image models | `minimal` | `minimal` | `high` | `high` | `high` | `high` |
| `google-official`, `google-genai`: Gemini 3 Pro | `low` | `low` | `high` | `high` | `high` | `high` |
| `google-official`, `google-genai`: other Pro models, Gemini 3.7, 3.8, 4 Argon | `low` | `low` | `medium` | `high` | `high` | `high` |
| `google-official`, `google-genai`: other Gemini models | `minimal` | `low` | `medium` | `high` | `high` | `high` |

`openai-chat-vllm-adapter` sends no `reasoning_effort` either. It sets the switch the served model's chat template reads, as `chat_template_kwargs`:

| Served model | `chat_template_kwargs` |
| --- | --- |
| Qwen3.8-27B, Qwen3.8-Flash-Next | `enable_thinking: false` for `none`; `reasoning_effort` `low` and `medium` as given, `xhigh` for `high` and above |
| DeepSeek-V4-Flash-Vision-Exp | nothing for `none`, so no thinking; `thinking: true` with `reasoning_effort` `low` for `low`, `high` for `medium` to `xhigh`, `max` for `max` |
| DeepSeek-V4-Pro, DeepSeek-V4-Flash | the same, but `reasoning_effort` `high` for `low` too |
| Qwen3.6-35B-A3B, Qwen3.5-0.8B, Qwen3.5-9B and any other model | `enable_thinking`: `false` for `none`, `true` otherwise |

`openai-embedding` and Gemini speech and embedding models ignore `thinking_level`.

### `thinking_summary`

| Client | `true` | `false` |
| --- | --- | --- |
| `anthropic-official`, `ant-messages` | `display: "summarized"` on the thinking block | `display: "omitted"` |
| `openai-official`, `deepseek-official` | `reasoning.summary: "concise"` | nothing |
| `openai-responses` | `reasoning.summary: "concise"` with a `thinking_level`; nothing without one | nothing |
| `google-official` | `thinking_summaries: "auto"` | `thinking_summaries: "none"` |
| `google-genai` | `include_thoughts: true` | `include_thoughts: false` |
| `openai-chat`, `openai-chat-vllm-adapter`, `minimax-official`, `moonshot-official`, `zai-official` | ignored | ignored |

On the Anthropic clients, a summary asked for without a `thinking_level` turns adaptive thinking on; with thinking `disabled` or `between_tools`, nothing is sent. `openai-embedding` and Gemini speech and embedding models ignore it.

### `prompt_caching`

| Client | `"enable"` | `"enhance"` | `"disable"` |
| --- | --- | --- | --- |
| `anthropic-official` | `cache_control: {"type": "ephemeral"}`, also when not set | the same with `ttl: "1h"` | nothing |
| `anthropic-official` on Bedrock | the same marker with `ttl: "5m"` on the last block of the last user message, also when not set | the same with `ttl: "1h"` | nothing |
| Every other client | nothing | raises | raises |
| `openai-embedding`, Gemini embedding models | ignored | ignored | ignored |

### `fast_mode`

`false` or not set sends nothing.

| Client | `true` |
| --- | --- |
| `openai-official`, `openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `google-official` | `service_tier: "priority"` |
| `minimax-official` | `service_tier: "priority"` on MiniMax-M3; raises on MiniMax-M3.1-Flash |
| `ant-messages` | `speed: "fast"` with the beta `fast-mode-2026-02-01` |
| `anthropic-official` | the same; raises on Bedrock and on Claude 4.6, Sonnet 5.5, Haiku 5.5 and Fable 5.1 |
| `google-genai`, `deepseek-official`, `moonshot-official`, `zai-official`, `openai-embedding` | raises |
| Gemini embedding models | ignored |

### `image_config`

| Client | Sent as |
| --- | --- |
| `google-genai` | `image_config` |
| `google-official` | `response_format`: a text entry, then an image entry carrying `aspect_ratio` and `image_size` |
| Every other client; Gemini speech and embedding models | ignored |

### `tts_config`

Gemini speech models, on both Google clients:

| `tts_config` | Sent as |
| --- | --- |
| Not set | the voice `Kore` |
| One entry | its `voice` |
| Two entries | one voice per `speaker`; an entry without a `speaker` raises. Gemini 3.8 speech models get the script as one part per turn, with the speaker as metadata. |
| Three or more | raises |

Every other model and client ignores it.

### `embedding_config`

| Client | Sent as |
| --- | --- |
| `openai-embedding` | `dimensions` |
| `google-official`, `google-genai`: embedding models | `output_dimensionality` |
| Every other client and model | ignored |

### `trace_id`

| Client | What it does |
| --- | --- |
| Every client | Saves the turn under this id. |
| `mmsp` | The server saves the turn; the client saves nothing. |
| `moonshot-official` on Kimi K2 | Also sends it as `prompt_cache_key`. |

## In Python and TypeScript

The field names are the same in both languages. Both packages export `ThinkingLevel` and `PromptCaching`. Python takes the plain strings as well; TypeScript takes the enum members, such as `ThinkingLevel.HIGH` and `PromptCaching.ENABLE`.
