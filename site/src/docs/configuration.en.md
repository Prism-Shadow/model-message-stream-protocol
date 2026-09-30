---
description: UniConfig, the options of a request. Every field is optional.
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
| `temperature` | number | The sampling temperature. Some models fix it and reject any other value. |
| `system_prompt` | string | The system instruction. |
| `tools` | list | The tools the model may call: `name`, `description`, and `parameters` as a JSON Schema. |
| `tool_choice` | `"auto"`, `"required"`, `"none"`, or a list of tool names | Which tools the model may or must call. Support varies by model: Claude Opus 5.5, Sonnet 5.5 and Fable 5.1 cannot be forced to call a tool, so `"required"` and a list of names raise on them. |
| `thinking_level` | `"none"`, `"low"`, `"medium"`, `"high"`, `"xhigh"`, `"max"` | How much the model thinks. Every level is safe to pass: MMSP maps it to the closest one the model supports. |
| `thinking_summary` | boolean | Ask for a summary of the thinking. Whether one comes back depends on the model. |
| `prompt_caching` | `"enable"`, `"disable"`, `"enhance"` | How the prompt is cached. Most providers cache on their own and accept only `enable`. |
| `fast_mode` | boolean | Ask for the provider's faster tier, where it has one. |
| `image_config` | object | For image generation: `aspect_ratio` (`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `21:9`) and `image_size` (`1K`, `2K`). |
| `tts_config` | list | For speech: one entry per speaker, with `voice` and an optional `speaker`. With two speakers, the text is a script with one `Name: line` per turn. |
| `embedding_config` | object | For embeddings: `dimensions`, the size of the vector. |
| `trace_id` | string | Saves the turn under this id. See [Tracer and playground](/docs/tracing/). |

## Values a model rejects

A value the model cannot take raises `UnsupportedParameterError` before the request is sent, naming the client and the parameter. `thinking_level` is the exception: it never raises. Where a model cannot turn thinking off, `"none"` asks for the least of it: the lowest effort on Claude Opus 5.5 and Fable 5.1 and on GPT-6, and no up-front thinking on Claude Sonnet 5.5.

## In Python and TypeScript

The field names are the same in both languages. Both packages export `ThinkingLevel` and `PromptCaching`. Python takes the plain strings as well; TypeScript takes the enum members, such as `ThinkingLevel.HIGH` and `PromptCaching.ENABLE`.
