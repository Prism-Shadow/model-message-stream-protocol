> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Anthropic SDK

> Call MiniMax models using the Anthropic SDK

To meet developers' needs for the Anthropic API ecosystem, our API now supports the Anthropic API format. With simple configuration, you can integrate MiniMax capabilities into the Anthropic API ecosystem.

## Quick Start

### 1. Install Anthropic SDK

<CodeGroup>
  ```bash Python theme={null}
  pip install anthropic
  ```

  ```bash Node.js theme={null}
  npm install @anthropic-ai/sdk
  ```
</CodeGroup>

### 2. Configure Environment Variables

```bash theme={null}
export ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
export ANTHROPIC_API_KEY=${YOUR_API_KEY}
```

### 3. Call API

```python Python theme={null}
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="MiniMax-M3.1-Flash",
    output_config={"effort": "max"},
    max_tokens=4096,
    system="You are a helpful assistant.",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hi, how are you?"
                }
            ]
        }
    ]
)

for block in message.content:
    if block.type == "thinking":
        print(f"Thinking:\n{block.thinking}\n")
    elif block.type == "text":
        print(f"Text:\n{block.text}\n")
```

### 4. Important Note

In multi-turn function call conversations, the complete model response (i.e., the assistant message) must be append to the conversation history to maintain the continuity of the reasoning chain.

* Append the full `response.content` list to the message history (includes all content blocks: thinking/text/tool\_use)

## Supported Models

When using the Anthropic SDK, the following models are supported.

| Model Name | Context Window | Description |
| :- | :- | :- |
| <span style={{whiteSpace:"nowrap"}}>MiniMax-M3.1-Flash</span> | 1,000,000 | **Frontier multimodal coding model with 1M context window and tunable thinking depth** |
| MiniMax-M3 | 1,000,000 | **Frontier multimodal coding model with 1M context window** |

<Note>
  For details on how tps (Tokens Per Second) is calculated, please refer to [FAQ > About APIs](/docs/faq/about-apis#q-how-is-tps-tokens-per-second-calculated-for-llms).
</Note>

<Note>
  The Anthropic API compatibility interface currently only supports the
  `MiniMax-M3.1-Flash` `MiniMax-M3` models. For other models, please use the standard MiniMax API
  interface.
</Note>

## Compatibility

### Supported Parameters

When using the Anthropic SDK, we support the following input parameters:

| Parameter | Support Status | Description |
| :- | :- | :- |
| `model` | Fully supported | supports `MiniMax-M3.1-Flash` `MiniMax-M3` models |
| `messages` | Partial support | `MiniMax-M3.1-Flash` and `MiniMax-M3` support text, image, video, tool use, tool result, and thinking blocks. The M2.7, M2.5, M2.1, and M2 series support text and tool-call content blocks only; they do not support image or video input |
| `max_tokens` | Fully supported | Maximum number of tokens to generate. Thinking tokens count toward it too, so a value that is too small yields `stop_reason: "max_tokens"` with no text output |
| `stream` | Fully supported | Streaming response |
| `system` | Fully supported | System prompt |
| `temperature` | Fully supported | Range \[0, 2], controls output randomness, recommended value: 1 |
| `tool_choice` | Fully supported | Tool selection strategy |
| `tools` | Fully supported | Tool definitions |
| `top_p` | Fully supported | Nucleus sampling parameter, range \[0, 1]. Default 0.95 for `MiniMax-M3.1-Flash` and `MiniMax-M3`, and 0.9 for M2.x models |
| `metadata` | Fully Supported | Metadata |
| `thinking` | Fully Supported | `MiniMax-M3.1-Flash` always thinks and returns `400` if `disabled` is sent. Thinking is off by default for `MiniMax-M3` and can be enabled with `adaptive`. Thinking cannot be disabled for M2.x models. |
| `output_config.effort` | Fully Supported | Tunes thinking depth for `MiniMax-M3.1-Flash`. Accepts `low`, `medium`, `high`, `xhigh`, and `max`; defaults to `max` when omitted. |
| `service_tier` | Fully Supported | Request admission tier. Supported values are `standard` and `priority`; if omitted, requests use `standard`. The `priority` [price](https://platform.minimax.io/docs/pricing/overview#models/text) is 1.5 times the `standard` price and ensures priority admission so the request is processed ahead of other requests, leading to faster responses and fewer failures. `MiniMax-M3.1-Flash` does not support this field. |
| `top_k` | Ignored | This parameter will be ignored |
| `stop_sequences` | Ignored | This parameter will be ignored |
| `mcp_servers` | Ignored | This parameter will be ignored |
| `context_management` | Ignored | This parameter will be ignored |
| `container` | Ignored | This parameter will be ignored |

### Thinking Control

The `thinking` parameter controls whether the model can emit `thinking` content blocks. Behavior differs per model:

| Model | `thinking` omitted | `{"type": "adaptive"}` | `{"type": "disabled"}` |
| :- | :- | :- | :- |
| `MiniMax-M3.1-Flash` | Thinking on | Thinking on | **Returns `400`** — thinking cannot be disabled |
| `MiniMax-M3` | Thinking off | Thinking on | Thinking stays off |
| M2.x | Thinking on | Thinking on | Accepted but ignored; thinking remains on |

<Note>
  The error returned for `thinking: {"type": "disabled"}`:

  ```text theme={null}
  model "MiniMax-M3.1-Flash" requires adaptive thinking; thinking.type="disabled" (including reasoning.effort=none) is not allowed (2013)
  ```
</Note>

When a response includes `thinking` blocks, preserve them unchanged in later turns, especially in tool-use conversations.

### Thinking Depth Control (MiniMax-M3.1-Flash only)

`MiniMax-M3.1-Flash` supports tuning thinking depth through `output_config.effort`, from `low` through `medium`, `high`, `xhigh`, to `max`. Higher levels make the model think more thoroughly, producing more thinking tokens at higher latency. When omitted, `output_config.effort` defaults to `max`.

`none` is not supported and returns `400`.

```bash curl theme={null}
curl https://api.minimax.io/anthropic/v1/messages \
  -H "Authorization: Bearer <MINIMAX_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MiniMax-M3.1-Flash",
    "max_tokens": 2048,
    "output_config": { "effort": "max" },
    "messages": [{ "role": "user", "content": "Hi, how are you?" }]
  }'
```

### Messages Field Support

| Field Type | Support Status | Description |
| :- | :- | :- |
| `type="text"` | Fully supported | Text messages |
| `type="image"` | M3.1-Flash / M3 only | Image input via URL or base64. Supports JPEG, PNG, GIF, WEBP |
| `type="video"` | M3.1-Flash / M3 only | Video input via URL, base64, or `mm_file://{file_id}`. Supports MP4, AVI, MOV, MKV |
| `type="tool_use"` | Fully supported | Tool calls |
| `type="tool_result"` | Fully supported | Tool call results |
| `type="thinking"` | Fully supported | Reasoning content. Return the block unchanged in multi-turn thinking conversations |

For `MiniMax-M3.1-Flash` and `MiniMax-M3`, URL or base64 videos can be up to 50 MB, images can be up to 10 MB, and the request body can be up to 64 MB. For larger videos, upload through the Files API and pass `mm_file://{file_id}`; Files API videos can be up to 512 MB.

Image token usage depends on image size and content. Use this as a rough single-image heuristic; check `POST /anthropic/v1/messages/count_tokens` or response `usage` for exact usage:

| `detail` | Rough single-image token usage |
| :- | :- |
| `low` | Usually a few hundred tokens, up to \~600 |
| `default` | Often \~1k-3k tokens, up to \~5k |
| `high` | Often several thousand tokens, up to \~15k+ |

The Anthropic-compatible API also supports `POST /anthropic/v1/messages/count_tokens` for `MiniMax-M3.1-Flash` and `MiniMax-M3` token estimation. This endpoint returns input token usage without generating model output.

## Examples

### Streaming Response

```python Python theme={null}
import anthropic

client = anthropic.Anthropic()

print("Starting stream response...\n")
print("=" * 60)
print("Thinking Process:")
print("=" * 60)

stream = client.messages.create(
    model="MiniMax-M3.1-Flash",
    output_config={"effort": "max"},
    max_tokens=4096,
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": [{"type": "text", "text": "Hi, how are you?"}]}
    ],
    stream=True,
)

reasoning_buffer = ""
text_buffer = ""

for chunk in stream:
    if chunk.type == "content_block_start":
        if hasattr(chunk, "content_block") and chunk.content_block:
            if chunk.content_block.type == "text":
                print("\n" + "=" * 60)
                print("Response Content:")
                print("=" * 60)

    elif chunk.type == "content_block_delta":
        if hasattr(chunk, "delta") and chunk.delta:
            if chunk.delta.type == "thinking_delta":
                # Stream output thinking process
                new_thinking = chunk.delta.thinking
                if new_thinking:
                    print(new_thinking, end="", flush=True)
                    reasoning_buffer += new_thinking
            elif chunk.delta.type == "text_delta":
                # Stream output text content
                new_text = chunk.delta.text
                if new_text:
                    print(new_text, end="", flush=True)
                    text_buffer += new_text

print("\n")
```

## Important Notes

<Warning>
  1. The Anthropic API compatibility interface currently only supports the `MiniMax-M3.1-Flash` `MiniMax-M3` models

  2. The `temperature` parameter range is \[0, 2], values outside this range will return an error

  3. Some Anthropic parameters (such as `top_k`, `stop_sequences`, `mcp_servers`, `context_management`, `container`) will be ignored

  4. `MiniMax-M3.1-Flash` and `MiniMax-M3` support image and video input through Anthropic-compatible content blocks
</Warning>
