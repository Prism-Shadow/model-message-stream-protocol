![Header](.github/images/header.png)

# MMSP - Model Message Stream Protocol

[![GitHub Repo stars](https://img.shields.io/github/stars/Prism-Shadow/model-message-stream-protocol?style=social)](https://github.com/Prism-Shadow/model-message-stream-protocol/stargazers)
[![GitHub last commit](https://img.shields.io/github/last-commit/Prism-Shadow/model-message-stream-protocol)](https://github.com/Prism-Shadow/model-message-stream-protocol/commits/main)
[![GitHub contributors](https://img.shields.io/github/contributors/Prism-Shadow/model-message-stream-protocol?color=orange)](https://github.com/Prism-Shadow/model-message-stream-protocol/graphs/contributors)
[![CI](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/workflows/ci.yml/badge.svg)](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/mmsp)](https://pypi.org/project/mmsp/)
[![NPM](https://img.shields.io/npm/v/@prismshadow/mmsp)](https://www.npmjs.com/package/@prismshadow/mmsp)

English | [简体中文](README.zh.md)

**Integrate every model the same way, and keep one API in your head instead of one per provider.**

MMSP, the Model Message Stream Protocol, takes the per-provider differences off a developer's mind: one message format and one streaming grammar for every model provider, in Python and TypeScript.

📖 Documentation: [mmsp.penguin.ooo](https://mmsp.penguin.ooo)

Design: the specifications MMSP conforms to and the decisions that changed it, one RFC each, live in [`design/`](design/).

Using a coding agent? Install the MMSP SKILL files from [`skills/`](skills/) so it can use MMSP correctly in generated code.

📢 Follow us on [![X](https://img.shields.io/badge/X-code%5Fhiyouga-000000?logo=x&logoColor=white)](https://x.com/code_hiyouga) or join our [![Discord](https://img.shields.io/badge/Discord-join%20chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/eFHKqqcU3D)

## Why MMSP?

- 🔗 **Unified**: A consistent and intuitive interface for developing **agents** across different LLMs.

- 🎯 **Precise**: Automatically handles **[interleaved thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking#interleaved-thinking)** during multi-step tool calls, preventing performance degradation.

- 🧭 **Traceable**: Provides lightweight yet fine-grained **tracing** for debugging and auditing LLM executions.

## Features

### AutoLLMClient (Python & TypeScript)

Switch different LLMs with **zero code changes** and **no performance loss**.

![MMSP](.github/images/mmsp.png)

### Built-in Observability

Audit LLM executions by adding **a single `trace_id` parameter**, no database required.

![Tracer](.github/images/tracer.gif)

## Supported Models

These are the model families we focus on supporting. The [Model Index](https://mmsp.penguin.ooo/models/) and `list_supported_models()` list every variant, provider, and pricing.

| Model Name        | Vendor                                                                   | Example Model ID     | Input Modalities | Output Modalities              |
| ----------------- | ------------------------------------------------------------------------ | -------------------- | ---------------- | ------------------------------ |
| Gemini 3-4        | Official, Google Vertex AI, OpenRouter, OpenCode Go, Penguin Go          | `gemini-4-carbon`    | Text, Image      | Text, Image, Speech, Embedding |
| Claude 4.5-5.5    | Official, Amazon Bedrock, OpenRouter, OpenCode Go                        | `claude-opus-5-5`    | Text, Image      | Text                           |
| GPT-5.3-6.2       | Official, OpenRouter, OpenCode Go                                        | `gpt-6.2-sol`        | Text, Image      | Text, Embedding                |
| DeepSeek V3.2/V4  | Official, OpenRouter, SiliconFlow, TokenDance, OpenCode Go, Penguin Go, vLLM | `deepseek-flash` | Text, Image      | Text                           |
| Kimi-K2.5-K3.1    | Official, OpenRouter, SiliconFlow, TokenDance, OpenCode Go               | `kimi-k3.1-pro`      | Text, Image      | Text                           |
| GLM-4.5-5.3       | Official, OpenRouter, SiliconFlow, TokenDance, OpenCode Go               | `glm-5.3`            | Text, Image      | Text                           |
| MiniMax-M2.5-M3.1 | Official, OpenRouter, TokenDance, OpenCode Go                            | `MiniMax-M3.1-Flash` | Text, Image      | Text                           |
| Qwen3-4           | DashScope, Qwen Token Plan, OpenRouter, SiliconFlow, TokenDance, OpenCode Go, vLLM | `qwen4-max` | Text, Image     | Text, Embedding                |
| Grok 4.3-4.7      | OpenRouter, OpenCode Go                                                  | `x-ai/grok-4.7`      | Text, Image      | Text                           |
| Hy3/Hy4           | OpenRouter, SiliconFlow, TokenDance, OpenCode Go                         | `hy4`                | Text, Image      | Text                           |
| MiMo-V2.5/V2.6    | OpenRouter, TokenDance, OpenCode Go                                      | `mimo-v2.6-pro`      | Text, Image      | Text                           |

Custom compatible endpoints also work, covering 1000+ online and local models.

### Clients

`AutoLLMClient` takes a model id and an optional `client_type`. An **official client** speaks its vendor's own API and reads the vendor's key from the environment; a **compatible client** speaks one wire protocol for any endpoint that serves it.

| `client_type`              | Speaks                                                                       | Key and endpoint                          |
| -------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `openai-official`          | OpenAI Responses and Embeddings                                              | `OPENAI_API_KEY`, `OPENAI_BASE_URL`       |
| `anthropic-official`       | Anthropic Messages                                                           | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| `google-official`          | Gemini Interactions                                                          | `GEMINI_API_KEY`, `GEMINI_BASE_URL`       |
| `deepseek-official`        | DeepSeek Responses                                                           | `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`   |
| `moonshot-official`        | Moonshot Chat Completions                                                    | `MOONSHOT_API_KEY`, `MOONSHOT_BASE_URL`   |
| `zai-official`             | Z.AI Chat Completions                                                        | `ZAI_API_KEY`, `ZAI_BASE_URL`             |
| `minimax-official`         | MiniMax Responses                                                            | `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`     |
| `openai-responses`         | OpenAI Responses (OpenAI, OpenRouter, DeepSeek, Z.AI, MiniMax)               | `OPENAI_API_KEY`, `OPENAI_BASE_URL`       |
| `openai-chat` (`openai`)   | OpenAI Chat Completions (most gateways, SiliconFlow, vLLM)                   | `OPENAI_API_KEY`, `OPENAI_BASE_URL`       |
| `openai-chat-vllm-adapter` | Chat Completions for vLLM, mapping `thinking_level` to template switches     | `VLLM_API_KEY`, `VLLM_BASE_URL`           |
| `openai-embedding`         | OpenAI Embeddings                                                            | `OPENAI_API_KEY`, `OPENAI_BASE_URL`       |
| `ant-messages`             | Anthropic Messages (Anthropic, OpenRouter, DeepSeek, Z.AI, MiniMax)          | `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` |
| `google-genai`             | Google generateContent (Vertex AI, Gemini API, compatible gateways)          | `GEMINI_API_KEY`, `GEMINI_BASE_URL`       |
| `mmsp`                     | MMSP stream protocol ([MMSP server](#mmsp-server))                           | `MMSP_API_KEY`, `MMSP_BASE_URL`           |

`client_type` may be omitted when the model id starts with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `deepseek-`, `kimi-`, `glm-`, `minimax-`, `jina-`); any other id needs one. Additional clients for image generation, speech, transcription and web search/fetch, as well as Vertex AI, Amazon Bedrock and gateway setups, are documented in [Models and endpoints](https://mmsp.penguin.ooo/docs/models/).

Query the built-in model registry in code:

```python
from mmsp import list_supported_models

models = list_supported_models(currency="CNY")  # "USD" by default
```

```typescript
import { listSupportedModels } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // "USD" by default
```

## Installation

### Python package

Install from PyPI:

```bash
uv add mmsp
# or
pip install mmsp
```

Build from source:

```bash
cd src_py && make
```

See [src_py/README.md](src_py/README.md) for comprehensive usage examples and API documentation.

### TypeScript package

Install from npm:

```bash
npm install @prismshadow/mmsp
```

Build from source:

```bash
cd src_ts && make install && make build
```

See [src_ts/README.md](src_ts/README.md) for comprehensive usage examples and API documentation.

## Agent Skills

MMSP provides Codex/Claude Code skill files for assistants that need to help users consume the SDK packages:

- Python skill: [`skills/mmsp-python/SKILL.md`](skills/mmsp-python/SKILL.md)
- TypeScript skill: [`skills/mmsp-typescript/SKILL.md`](skills/mmsp-typescript/SKILL.md)

## APIs

`AutoLLMClient` is the main class for interacting with the MMSP SDK. It takes `model` and optional `client_type`, `api_key`, `base_url`, and `default_headers` (see [Client API](https://mmsp.penguin.ooo/docs/client/)).

- `(async) streaming_response(messages, config)`: Streams the response of LLMs in a stateless manner.
- `(async) streaming_response_stateful(message, config)`: Streams the response of LLMs in a stateful manner.
- `(async) list_models()`: Lists the model ids served by the configured endpoint.
- `clear_history()`: Clears the history of the stateful LLM client.
- `get_history()`: Returns the history of the stateful LLM client.
- `set_history(history)`: Replaces the history of the stateful LLM client with a copy of the provided list.

Both streaming methods yield `delta` events, each carrying one content item, followed by a single `stop` event carrying the usage and the finish reason (see [UniEvent](#unievent)).

## Basic Usage

> [!NOTE]
> We recommend using the **stateful interface** when calling the MMSP SDK.

### OpenAI GPT-5.6

Python Example:

```python
import asyncio
import os
from mmsp import AutoLLMClient

os.environ["OPENAI_API_KEY"] = "your-openai-api-key"

async def main():
    client = AutoLLMClient(model="gpt-5.6-sol")
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
        },
        config={"temperature": 1.0}
    ):
        print(event)

asyncio.run(main())
# {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': 'Hello'}], 'usage_metadata': None, 'finish_reason': None}
# {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': ','}], 'usage_metadata': None, 'finish_reason': None}
# {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': ' World'}], 'usage_metadata': None, 'finish_reason': None}
# {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': '!'}], 'usage_metadata': None, 'finish_reason': None}
# {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.done', 'text': 'Hello, World!'}], 'usage_metadata': None, 'finish_reason': None}
# {'role': 'assistant', 'event_type': 'stop', 'content_items': [], 'usage_metadata': {'cached_tokens': 0, 'prompt_tokens': 12, 'thoughts_tokens': 0, 'response_tokens': 8}, 'finish_reason': 'stop'}
```

TypeScript Example:

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.OPENAI_API_KEY = "your-openai-api-key";

async function main() {
  const client = new AutoLLMClient({ model: "gpt-5.6-sol" });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{ type: "text.done", text: "Say 'Hello, World!'" }]
    },
    config: {}
  })) {
    console.log(event);
  }
}

main().catch(console.error);
// {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': 'Hello'}], 'usage_metadata': null, 'finish_reason': null}
// {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': ','}], 'usage_metadata': null, 'finish_reason': null}
// {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': ' World'}], 'usage_metadata': null, 'finish_reason': null}
// {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.delta', 'text': '!'}], 'usage_metadata': null, 'finish_reason': null}
// {'role': 'assistant', 'event_type': 'delta', 'content_items': [{'type': 'text.done', 'text': 'Hello, World!'}], 'usage_metadata': null, 'finish_reason': null}
// {'role': 'assistant', 'event_type': 'stop', 'content_items': [], 'usage_metadata': {'cached_tokens': 0, 'prompt_tokens': 12, 'thoughts_tokens': 0, 'response_tokens': 8}, 'finish_reason': 'stop'}
```

### Anthropic Claude Opus 5

<details><summary><strong>Python Example</strong></summary>

```python
import asyncio
import os
from mmsp import AutoLLMClient

os.environ["ANTHROPIC_API_KEY"] = "your-anthropic-api-key"

async def main():
    client = AutoLLMClient(model="claude-opus-5")
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
        },
        config={}
    ):
        print(event)

asyncio.run(main())
```

</details>

<details><summary><strong>TypeScript Example</strong></summary>

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.ANTHROPIC_API_KEY = "your-anthropic-api-key";

async function main() {
  const client = new AutoLLMClient({ model: "claude-opus-5" });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{"type": "text.done", "text": "Say 'Hello, World!'"}]
    },
    config: {}
  })) {
    console.log(event);
  }
}

main().catch(console.error);
```

</details>

### OpenRouter GLM-5.3

<details><summary><strong>Python Example</strong></summary>

```python
import asyncio
import os
from mmsp import AutoLLMClient

os.environ["ZAI_API_KEY"] = "your-openrouter-api-key"
os.environ["ZAI_BASE_URL"] = "https://openrouter.ai/api/v1"

async def main():
    client = AutoLLMClient(model="z-ai/glm-5.3", client_type="zai-official")
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
        },
        config={}
    ):
        print(event)

asyncio.run(main())
```

</details>
<details><summary><strong>TypeScript Example</strong></summary>

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.ZAI_API_KEY = "your-openrouter-api-key";
process.env.ZAI_BASE_URL = "https://openrouter.ai/api/v1";

async function main() {
  const client = new AutoLLMClient({ model: "z-ai/glm-5.3", clientType: "zai-official" });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{"type": "text.done", "text": "Say 'Hello, World!'"}]
    },
    config: {}
  })) {
    console.log(event);
  }
}

main().catch(console.error);
```
</details>

### SiliconFlow Qwen3.8 27B via OpenAI-compatible API

<details><summary><strong>Python Example</strong></summary>

```python
import asyncio
import os
from mmsp import AutoLLMClient

os.environ["OPENAI_API_KEY"] = "your-siliconflow-api-key"
os.environ["OPENAI_BASE_URL"] = "https://api.siliconflow.cn/v1"

async def main():
    client = AutoLLMClient(model="Qwen/Qwen3.8-27B", client_type="openai-chat")
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
        },
        config={}
    ):
        print(event)

asyncio.run(main())
```

</details>
<details><summary><strong>TypeScript Example</strong></summary>

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.OPENAI_API_KEY = "your-siliconflow-api-key";
process.env.OPENAI_BASE_URL = "https://api.siliconflow.cn/v1";

async function main() {
  const client = new AutoLLMClient({
    model: "Qwen/Qwen3.8-27B",
    clientType: "openai-chat",
  });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{ type: "text.done", text: "Say 'Hello, World!'" }],
    },
    config: {}
  })) {
    console.log(event);
  }
}

main().catch(console.error);
```
</details>

### SiliconFlow Qwen3 Embedding 8B via OpenAI-compatible API

<details><summary><strong>Python Example</strong></summary>

```python
import asyncio
import os
from mmsp import AutoLLMClient

os.environ["OPENAI_API_KEY"] = "your-siliconflow-api-key"
os.environ["OPENAI_BASE_URL"] = "https://api.siliconflow.cn/v1"

async def main():
    client = AutoLLMClient(model="Qwen/Qwen3-Embedding-8B", client_type="openai-embedding")

    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Hello world"}],
        },
        config={},
    ):
        print(event)

asyncio.run(main())
```
</details>

<details><summary><strong>TypeScript Example</strong></summary>

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.OPENAI_API_KEY = "your-siliconflow-api-key";
process.env.OPENAI_BASE_URL = "https://api.siliconflow.cn/v1";

async function main() {
  const client = new AutoLLMClient({
    model: "Qwen/Qwen3-Embedding-8B",
    clientType: "openai-embedding",
  });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{ type: "text.done", text: "Hello world" }],
    },
    config: {},
  })) {
    console.log(event);
  }
}

main().catch(console.error);
```
</details>

### DeepSeek via the OpenAI Responses protocol

Any compatible endpoint can be called through the generic protocol clients by picking the
client type (`openai-chat` / `openai-responses` / `ant-messages`) and the provider's base
URL for that protocol:

<details><summary><strong>Python Example</strong></summary>

```python
import asyncio
import os
from mmsp import AutoLLMClient

async def main():
    client = AutoLLMClient(
        model="deepseek-flash",
        api_key=os.environ["DEEPSEEK_API_KEY"],
        base_url="https://api.deepseek.com",
        client_type="openai-responses",
    )
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
        },
        config={}
    ):
        print(event)

asyncio.run(main())
```
</details>

<details><summary><strong>TypeScript Example</strong></summary>

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

async function main() {
  const client = new AutoLLMClient({
    model: "deepseek-flash",
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: "https://api.deepseek.com",
    clientType: "openai-responses",
  });
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{ type: "text.done", text: "Say 'Hello, World!'" }],
    },
    config: {},
  })) {
    console.log(event);
  }
}

main();
```
</details>

The same model works over `client_type="ant-messages"` (base URL `https://api.deepseek.com/anthropic`) and `client_type="openai-chat"` (base URL `https://api.deepseek.com`); OpenRouter, Z.AI, and MiniMax expose all three protocols the same way.

## Concepts: UniConfig, UniMessage and UniEvent

### UniConfig

UniConfig is an object that contains the configuration for LLMs.

Example UniConfig:

```json
{
  "max_tokens": 1024,
  "temperature": 1.0,
  "tools": [
    {
      "name": "get_current_weather",
      "description": "Get the current weather in a given location",
      "parameters": {
          "type": "object",
          "properties": {
              "location": {
                  "type": "string",
                  "description": "The city and state, e.g. San Francisco, CA"
              }
          },
          "required": ["location"]
      }
    }
  ],
  "thinking_summary": true,
  "thinking_level": "none | low | medium | high | xhigh | max",
  "tool_choice": "auto | required | none | a list of allowed tool names",
  "system_prompt": "You are a helpful assistant.",
  "prompt_caching": "enable | disable | enhance",
  "session_id": "one stable id per conversation; recommended, it raises the prompt cache hit rate",
  "fast_mode": false,
  "image_config": {"aspect_ratio": "4:3", "resolution": "1K"},
  "video_config": {"aspect_ratio": "9:16", "resolution": "720p", "duration": 8},
  "tts_config": [{"voice": "Kore"}],
  "embedding_config": {"dimensions": 768},
  "webtool_config": {"count": 5},
  "trace_id": null
}
```

### UniMessage

UniMessage is an object that contains the input for LLMs. Its content items are complete items, typed with a `.done` suffix.

Example UniMessage:

```json
{
  "role": "user | assistant",
  "content_items": [
    {"type": "text.done", "text": "How are you doing?"},
    {"type": "image_url.done", "image_url": "https://example.com/image.jpg"},
    {"type": "inline_data.done", "mime_type": "image/jpeg", "data": "base64-encoded-image"},
    {"type": "thinking.done", "thinking": "I am thinking.", "fidelity": {"signature": "0x123456"}},
    {"type": "inline_thinking.done", "mime_type": "image/jpeg", "data": "base64-encoded-image"},
    {"type": "tool_call.done", "name": "math", "arguments": "{\"expression\": \"2 + 3\"}", "tool_call_id": "123"},
    {"type": "tool_result.done", "text": "2 + 3 = 5", "images": [], "tool_call_id": "123"}
  ]
}
```

Messages saved before 0.5.0 use item types without the `.done` suffix. They are still accepted, and converted with a deprecation warning, until 0.6.0; `normalize_legacy_messages` / `normalizeLegacyMessages` converts stored data.

### UniEvent

UniEvent is an object that contains streaming output of LLMs. A stream is a run of `delta` events, each carrying exactly one content item, closed by exactly one `stop` event that carries no items but always the usage and the finish reason. Each item streams as one or more `.delta` fragments followed by its complete `.done` item, and items never interleave.

Example UniEvents for a tool call:

```jsonl
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "tool_call.delta", "name": "math", "arguments": "{\"expression\": ", "tool_call_id": "123"}], "usage_metadata": null, "finish_reason": null, "created_at": 1694502400000}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "tool_call.delta", "name": "", "arguments": "\"2 + 3\"}", "tool_call_id": ""}], "usage_metadata": null, "finish_reason": null, "created_at": 1694502400010}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "tool_call.done", "name": "math", "arguments": "{\"expression\": \"2 + 3\"}", "tool_call_id": "123"}], "usage_metadata": null, "finish_reason": null, "created_at": 1694502400010}
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": null, "prompt_tokens": 10, "thoughts_tokens": null, "response_tokens": 12}, "finish_reason": "tool_call", "created_at": 1694502400020}
```

Read complete items, such as tool calls, from the `.done` items, and the usage from the `stop` event.

## Token Usage

MMSP provides detailed token usage information through the `usage_metadata` field of the `stop` event, the last event of every stream.

The `usage_metadata` object contains four fields:
- `cached_tokens`: Cached input tokens
- `prompt_tokens`: Non-cached input tokens
- `thoughts_tokens`: Chain-of-thought output tokens
- `response_tokens`: Non-chain-of-thought output tokens

You can calculate the total token usage as follows:
- `input_tokens = cached_tokens + prompt_tokens`
- `output_tokens = thoughts_tokens + response_tokens`
- `total_tokens = input_tokens + output_tokens`

```
█████████████  ░░░░░░░░░░░░░ → LLM → ███████████████  ░░░░░░░░░░░░░░░
cached_tokens  prompt_tokens         thoughts_tokens  response_tokens
        input_tokens                          output_tokens
```

## Tracing LLM Executions

![Tracer Screenshot](.github/images/tracer.png)

We provide a tracer to help you monitor and debug your LLM executions. You can enable tracing by setting the `trace_id` parameter to a unique identifier in the `config` object.

```python
async for event in client.streaming_response_stateful(
    message={
        "role": "user",
        "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}]
    },
    config={"trace_id": "unique-trace-id"}
):
    print(event)
```

```bash
cd src_py && uv run python -m mmsp.integration.tracer --host 127.0.0.1 --port 25750
```

```bash
cd src_ts && npm run tracer
```

Then you can view the tracing output in the dashboard at `http://localhost:25750/`.

## LLM Playground

![Playground Screenshot](.github/images/playground.png)

We provide a LLM playground to help you test your LLMs.

```bash
cd src_py && uv run python -m mmsp.integration.playground --host 127.0.0.1 --port 25751
```

```bash
cd src_ts && npm run playground
```

You can access the playground at `http://localhost:25751/`, the integrated tracer at `http://localhost:25751/tracer/`, and the server dashboard at `http://localhost:25751/server/`.

## MMSP Server

The MMSP server serves a configured table of upstream models over HTTP as MMSP streams (see [MMSP Server docs](https://mmsp.penguin.ooo/docs/server/)).

```json
{
  "models": [
    {"model_id": "claude-sonnet-5-5", "api_key": "$ANTHROPIC_API_KEY", "server_model_id": "claude"},
    {"model_id": "qwen/qwen3.8-27b", "base_url": "https://openrouter.ai/api/v1", "api_key": "$OPENROUTER_API_KEY", "server_model_id": "qwen3.8", "client_type": "openai-responses"}
  ],
  "api_keys": ["$MMSP_SERVER_API_KEY"]
}
```

```bash
cd src_py && uv run python -m mmsp.integration.server --config mmsp-server.json --metrics mmsp-server-metrics.json
# or in TypeScript:
cd src_ts && npm run server -- --config mmsp-server.json --metrics mmsp-server-metrics.json
```

Connect to the server with `client_type="mmsp"`:

```python
client = AutoLLMClient(model="claude", client_type="mmsp", base_url="http://127.0.0.1:25752/v1", api_key=os.environ["MMSP_SERVER_API_KEY"])
```

## Related Work

- [OpenRouter](https://openrouter.ai/)
- [Open Responses](https://www.openresponses.org/)

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## Used By

Projects built on MMSP:

- [PenguinHarness](https://github.com/Prism-Shadow/penguin-harness)
