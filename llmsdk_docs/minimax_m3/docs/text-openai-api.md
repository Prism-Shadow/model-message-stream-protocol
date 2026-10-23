> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# OpenAI SDK

> Call MiniMax models using the OpenAI SDK

To meet developers' needs for the OpenAI API ecosystem, our API now supports the OpenAI API format. With simple configuration, you can integrate MiniMax capabilities into the OpenAI API ecosystem.

## Quick Start

### 1. Install OpenAI SDK

<CodeGroup>
  ```bash Python theme={null}
  pip install openai
  ```

  ```bash Node.js theme={null}
  npm install openai
  ```
</CodeGroup>

### 2. Configure Environment Variables

```bash theme={null}
export OPENAI_BASE_URL=https://api.minimax.io/v1
export OPENAI_API_KEY=${YOUR_API_KEY}
```

### 3. Call API

```python Python theme={null}
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    reasoning_effort="max",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hi, how are you?"},
    ],
)

print(f"Thinking:\n{response.choices[0].message.reasoning_content}\n")
print(f"Text:\n{response.choices[0].message.content}\n")
```

### 4. Important Note

In multi-turn function call conversations, the complete model response (i.e., the assistant message) must be append to the conversation history to maintain the continuity of the reasoning chain.

* Append the full `response_message` object (including the `tool_calls` field) to the message history
  * For native OpenAI API with `MiniMax-M3.1-Flash` `MiniMax-M3` `MiniMax-M2.7` `MiniMax-M2.7-highspeed` `MiniMax-M2.5` `MiniMax-M2.5-highspeed` `MiniMax-M2.1` `MiniMax-M2.1-highspeed` `MiniMax-M2` models, the `content` field will contain `<think>` tag content, which must be preserved completely
  * `MiniMax-M3.1-Flash` provides the model's thinking content separately through the `reasoning_content` field, which must also be preserved completely

## Supported Models

When using the OpenAI SDK, the following MiniMax models are supported.

| Model Name | Context Window | Description |
| :- | :- | :- |
| <span style={{whiteSpace:"nowrap"}}>MiniMax-M3.1-Flash</span> | 1,000,000 | **Frontier multimodal coding model with 1M context window and tunable thinking depth** |
| MiniMax-M3 | 1,000,000 | **Frontier multimodal coding model with 1M context window** |

<Note>
  For details on how tps (Tokens Per Second) is calculated, please refer to [FAQ > About APIs](/docs/faq/about-apis#q-how-is-tps-tokens-per-second-calculated-for-llms).
</Note>

<Note>
  For more model information, please refer to the standard MiniMax API
  documentation.
</Note>

## Multimodal Input

OpenAI-compatible Chat Completions support text, image, and video input for `MiniMax-M3.1-Flash` and `MiniMax-M3`.

Use `image_url` content parts for images and `video_url` content parts for videos. The `detail` field accepts `low`, `default`, or `high` and defaults to `default`; `max_long_side_pixel` can be used to control the longest side. Images support JPEG, PNG, GIF, and WEBP. Videos support MP4, AVI, MOV, and MKV; `fps` defaults to 1 and accepts values from 0.2 to 5. URL or base64 videos can be up to 50 MB, images can be up to 10 MB, and the request body can be up to 64 MB. For larger videos, upload through the Files API and pass `mm_file://{file_id}`; Files API videos can be up to 512 MB.

Image token usage depends on image size and content. Use this as a rough single-image heuristic; check response `usage` or token counting where available for exact usage:

| `detail` | Rough single-image token usage |
| :- | :- |
| `low` | Usually a few hundred tokens, up to \~600 |
| `default` | Often \~1k-3k tokens, up to \~5k |
| `high` | Often several thousand tokens, up to \~15k+ |

```python Python theme={null}
response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    reasoning_effort="max",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Summarize what is happening here."},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.png",
                        "detail": "default",
                    },
                },
                {
                    "type": "video_url",
                    "video_url": {
                        "url": "mm_file://file_id",
                        "detail": "default",
                    },
                },
            ],
        }
    ],
)
```

## MiniMax-M3.1-Flash / MiniMax-M3 Request Parameters

`MiniMax-M3.1-Flash` and `MiniMax-M3` support these additional Chat Completions parameters through the OpenAI-compatible API:

| Parameter | Description |
| :- | :- |
| `thinking` | Controls thinking. `type` can be `disabled` or `adaptive`; when omitted, thinking is on by default. `MiniMax-M3.1-Flash` always thinks and returns `400` if `disabled` is sent. For M2.x models, thinking cannot be disabled. |
| `reasoning_effort` | Thinking depth, effective for `MiniMax-M3.1-Flash` only. Accepts `low`, `medium`, `high`, `xhigh`, and `max`; higher levels think more thoroughly. Defaults to `max` when omitted. `none` is not supported. |
| `stream_options.include_usage` | When streaming, set to `true` to include token usage in the stream. |
| `max_tokens` | Legacy generation length limit. Thinking tokens count toward it too, so a value that is too small yields `finish_reason: "length"` with an empty `content`. |
| `max_completion_tokens` | Generation length limit; use this field for new integrations. |
| `temperature` | Sampling temperature. Range `[0, 2]`, default `1`. |
| `top_p` | Nucleus sampling. Range `[0, 1]`. Default `0.95` for `MiniMax-M3.1-Flash` and `MiniMax-M3`, and `0.9` for M2.x models. |
| `tools` | Function tool definitions. |
| `reasoning_split` | Output-format switch. When `true`, thinking content is separated into the `reasoning_content` field; when `false`, thinking stays inside `content` wrapped in `<think>` tags. `MiniMax-M3.1-Flash` does not support setting this parameter to `false`. |
| `service_tier` | Request admission tier. Supported values are `standard` and `priority`; if omitted, requests use `standard`. The `priority` [price](https://platform.minimax.io/docs/pricing/overview#models/text) is 1.5 times the `standard` price and ensures priority admission so the request is processed ahead of other requests, leading to faster responses and fewer failures. `MiniMax-M3.1-Flash` does not support this field. |

### Thinking Control

The `thinking` parameter controls whether the model can emit thinking content. Behavior differs per model:

| Model | `thinking` omitted | `{"type": "adaptive"}` | `{"type": "disabled"}` |
| :- | :- | :- | :- |
| `MiniMax-M3.1-Flash` | Thinking on | Thinking on | **Returns `400`** — thinking cannot be disabled |
| `MiniMax-M3` | Thinking on | Thinking on | Skips thinking and answers directly |
| M2.x | Thinking on | Thinking on | Accepted but ignored; thinking remains on |

<Note>
  The error returned for `thinking: {"type": "disabled"}` or `reasoning_effort: "none"`:

  ```text theme={null}
  model "MiniMax-M3.1-Flash" requires adaptive thinking; thinking.type="disabled" (including reasoning.effort=none) is not allowed (2013)
  ```
</Note>

```python Python theme={null}
response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    reasoning_effort="max",
    messages=[{"role": "user", "content": "Hi, how are you?"}],
    extra_body={
        "thinking": {"type": "adaptive"},
    },
)
```

### Thinking Depth Control (MiniMax-M3.1-Flash only)

`MiniMax-M3.1-Flash` supports tuning thinking depth with `reasoning_effort`, from `low` through `medium`, `high`, `xhigh`, to `max`. Higher levels make the model think more thoroughly, producing more thinking tokens at higher latency. When omitted, `reasoning_effort` defaults to `max`.

`none` is not supported and returns `400`.

```python Python theme={null}
response = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    reasoning_effort="max",
    messages=[{"role": "user", "content": "Hi, how are you?"}],
)
```

## Examples

### Streaming Response

```python Python theme={null}
from openai import OpenAI

client = OpenAI()

print("Starting stream response...\n")
print("=" * 60)
print("Thinking Process:")
print("=" * 60)

stream = client.chat.completions.create(
    model="MiniMax-M3.1-Flash",
    reasoning_effort="max",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hi, how are you?"},
    ],
    stream=True,
)

reasoning_buffer = ""
text_buffer = ""

for chunk in stream:
    delta = chunk.choices[0].delta

    # Thinking arrives as incremental fragments on reasoning_content
    if getattr(delta, "reasoning_content", None):
        print(delta.reasoning_content, end="", flush=True)
        reasoning_buffer += delta.reasoning_content

    if delta.content:
        text_buffer += delta.content

print("\n" + "=" * 60)
print("Response Content:")
print("=" * 60)
print(f"{text_buffer}\n")

```

### Tool Use & Interleaved Thinking

Learn how to use M3.1-Flash Tool Use and Interleaved Thinking capabilities with OpenAI SDK, please refer to the following documentation.

<Columns cols={1}>
  <Card title="Tool Use & Interleaved Thinking" icon="book-open" href="/docs/guides/text-m3-function-call#openai-sdk" arrow="true" cta="Click here">
    Learn how to leverage MiniMax-M3.1-Flash tool calling and interleaved thinking capabilities to enhance performance in complex tasks.
  </Card>
</Columns>

## Important Notes

<Warning>
  1. The `temperature` parameter range is \[0, 2], recommended value: 1.0, values outside this range will return an error

  2. Some OpenAI parameters (such as `presence_penalty`, `frequency_penalty`, `logit_bias`, etc.) will be ignored

  3. Image and video inputs are supported by `MiniMax-M3.1-Flash` and `MiniMax-M3` through OpenAI-compatible message content parts; audio input is not currently supported

  4. The `n` parameter only supports value 1

  5. The deprecated `function_call` is not supported, please use the `tools` parameter
</Warning>
