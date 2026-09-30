---
description: The models MMSP reaches, the wire protocol each one speaks, and how to call any compatible endpoint.
---

Use exact model ids. `AutoLLMClient` deduces the client from the id, and reads the key and the endpoint from the environment.

## Models

| Family | Served by | Example ids | Key and endpoint |
| --- | --- | --- | --- |
| Gemini 3 to 3.8 | Official, Vertex AI | `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.1-pro-preview` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Gemini image and speech | Official, Vertex AI | `gemini-3.1-flash-image`, `gemini-3-pro-image`, `gemini-3.1-flash-tts-preview` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Gemini embedding | Official, Vertex AI | `gemini-embedding-2` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Claude 4.6 to 5 | Official, Amazon Bedrock, ModelVerse | `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-opus-4-8` | `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` |
| GPT-5.4 to 6 | Official, OpenRouter, ModelVerse | `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.5`, `gpt-5.4` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| OpenAI embedding | Official | `text-embedding-3-small`, `text-embedding-3-large` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| Kimi K2.6, K3 | Official, OpenRouter, SiliconFlow | `kimi-k3`, `kimi-k2.6` | `MOONSHOT_API_KEY` `MOONSHOT_BASE_URL` |
| DeepSeek V4 | Official, OpenRouter, SiliconFlow | `deepseek-v4-pro`, `deepseek-v4-flash` | `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` |
| GLM-5.1 to 5.3 | Official, OpenRouter, SiliconFlow | `glm-5.3`, `glm-5.3-flash`, `glm-5.2` | `ZAI_API_KEY` `ZAI_BASE_URL` |
| MiniMax-M3 | Official | `MiniMax-M3` | `MINIMAX_API_KEY` `MINIMAX_BASE_URL` |

Each row names the environment variables the client reads: the key, then the endpoint, which defaults to the provider's own.

The list in code is always current, with the base URL, the client, the modalities, the context window and the list price of every entry:

<div class="code-group">

```python
from mmsp import list_supported_models

models = list_supported_models(currency="CNY")  # "USD" by default
```

```typescript
import { listSupportedModels } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // "USD" by default
```

</div>

## Any compatible endpoint

Four generic clients call any endpoint that serves their protocol. Name one with `client_type`, and give it the endpoint and its key together: as `base_url` and `api_key`, or as `OPENAI_BASE_URL` and `OPENAI_API_KEY` in the environment (the `ANTHROPIC_` pair for `ant-messages`). A `base_url` without an `api_key` raises: the environment's key is not sent to an endpoint named in code.

| `client_type` | Protocol | Served by |
| --- | --- | --- |
| `openai-responses` | OpenAI Responses | OpenAI, OpenRouter, DeepSeek, Z.AI, MiniMax |
| `openai-chat` | OpenAI Chat Completions. `openai` is an alias. | Most gateways, SiliconFlow, vLLM |
| `openai-chat-vllm-adapter` | Chat Completions as vLLM serves it. Maps `thinking_level` onto the template's own switches. | vLLM |
| `ant-messages` | Anthropic Messages | Anthropic, OpenRouter, DeepSeek, Z.AI, MiniMax |
| `openai-embedding` | OpenAI Embeddings | Any embedding endpoint |

Where a gateway serves more than one, prefer `openai-responses`. OpenRouter serves it for every model it hosts; SiliconFlow serves Chat Completions only.

<div class="code-group">

```python
client = AutoLLMClient(
    model="qwen/qwen3.6-35b-a3b",
    client_type="openai-responses",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
```

```typescript
const client = new AutoLLMClient({
  model: "qwen/qwen3.6-35b-a3b",
  clientType: "openai-responses",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

</div>

Common base URLs:

| Gateway | Base URL |
| --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` |
| SiliconFlow | `https://api.siliconflow.cn/v1` |
| ModelVerse | `https://api.modelverse.cn/v1`, and `https://api.modelverse.cn/` for Claude |
| vLLM | `http://127.0.0.1:8000/v1/` |

## Gemini on Vertex AI

Pass the service-account JSON key as the API key. Such a key is served through generateContent, because Vertex AI's Interactions endpoint serves none of these models. Any other Gemini key uses the Interactions API.

`client_type="gemini-interactions"` and `client_type="gemini-generate-content"` pin the protocol, the second also for gateways that proxy generateContent only.

Thought signatures replay only on the endpoint that issued them. See [Fidelity](/docs/fidelity/).

## Wire protocols

Every client speaks one provider protocol on the wire, whichever `client_type` reaches it.

| `client_type` | Wire protocol |
| --- | --- |
| `gemini-3.8`, `gemini-3.7`, `gemini-3`, `gemini-embedding`, `gemini-interactions`, `gemini-generate-content` | `google-genai` |
| `claude-5`, `claude-4-8`, `claude-4-7`, `claude-4-6`, `ant-messages` | `ant-messages` |
| `gpt-6`, `gpt-5.6`, `gpt-5.5`, `gpt-5.4`, `deepseek-v4`, `minimax-m3`, `openai-responses` | `openai-responses` |
| `glm-5.3`, `glm-5.2`, `glm-5.1`, `kimi-k3`, `kimi-k2.6`, `kimi-k2.5`, `openai-chat`, `openai-chat-vllm-adapter` | `openai-chat` |
| `openai-embedding` | `openai-embedding` |
