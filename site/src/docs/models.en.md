---
description: The clients MMSP is made of, the models each one serves, and how to call any compatible endpoint.
---

A client is named by its `client_type`. An **official client** speaks its vendor's own API, knows the vendor's models, and reads the vendor's key from the environment. A **compatible client** speaks one wire protocol for any endpoint that serves it.

Use exact model ids. A model id that begins with a known family names its official client on its own, so `client_type` may be omitted for it; any other id raises and asks for one.

## Official clients

| `client_type` | Models | Speaks | Key and endpoint |
| --- | --- | --- | --- |
| `openai-official` | `gpt-6.1-sol`, `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.5`; `text-embedding-3-large`, `text-embedding-3-small` | OpenAI Responses; Embeddings for `text-embedding-*` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| `anthropic-official` | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-fable-5-1`, `claude-opus-5`, `claude-sonnet-5` | Anthropic Messages | `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` |
| `gemini-official` | `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.1-pro-preview`; `gemini-3.1-flash-image`, `gemini-3.8-flash-tts`; `gemini-embedding-2` | Gemini Interactions | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| `zai-official` | `glm-5.3`, `glm-5.3-flash`, `glm-5.2` | Chat Completions | `ZAI_API_KEY` `ZAI_BASE_URL` |
| `moonshot-official` | `kimi-k3`, `kimi-k2.6` | Chat Completions | `MOONSHOT_API_KEY` `MOONSHOT_BASE_URL` |
| `deepseek-official` | `deepseek-flash`, `deepseek-v4-pro` | Responses | `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` |
| `minimax-official` | `MiniMax-M3` | Responses | `MINIMAX_API_KEY` `MINIMAX_BASE_URL` |

Each row names the environment variables the client reads: the key, then the endpoint, which defaults to the vendor's own. An official client reads them whatever endpoint it is given, so it also serves a gateway that mirrors the vendor's API: OpenRouter serves `deepseek/deepseek-v4-pro` through `deepseek-official`, and SiliconFlow serves `Pro/moonshotai/Kimi-K2.6` through `moonshot-official`, each with the gateway's `base_url` and `api_key`.

## Routing by model id

Without a `client_type`, the family the model id begins with names the client:

| The id begins with | `client_type` |
| --- | --- |
| `gpt-`, `text-embedding-` | `openai-official` |
| `claude-` | `anthropic-official` |
| `gemini-` | `gemini-official` |
| `glm-` | `zai-official` |
| `kimi-` | `moonshot-official` |
| `deepseek-` | `deepseek-official` |
| `minimax-` | `minimax-official` |

The match ignores case, so `MiniMax-M3` routes. A gateway's id such as `moonshotai/kimi-k3`, or Amazon Bedrock's `global.anthropic.claude-fable-5`, begins with no family and needs its `client_type`. The environment variable `CLIENT_TYPE` names one for every client the code does not.

The list in code is always current, with the base URL, the client, the modalities, the context window and the list price of every entry:

<div class="code-group">

```typescript
import { listSupportedModels } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // "USD" by default
```

```python
from mmsp import list_supported_models

models = list_supported_models(currency="CNY")  # "USD" by default
```

</div>

## Compatible clients

Seven compatible clients call any endpoint that serves their protocol. Name one with `client_type`, and give it the endpoint and its key together: as `base_url` and `api_key`, or as `OPENAI_BASE_URL` and `OPENAI_API_KEY` in the environment (the `ANTHROPIC_` pair for `ant-messages`, the `GEMINI_` pair for `google-genai`, the `MMSP_` pair for `mmsp`). A `base_url` without an `api_key` raises: the environment's key is not sent to an endpoint named in code.

| `client_type` | Protocol | Served by |
| --- | --- | --- |
| `openai-responses` | OpenAI Responses | OpenAI, OpenRouter, DeepSeek, Z.AI, MiniMax |
| `openai-chat` | OpenAI Chat Completions. `openai` is an alias. | Most gateways, SiliconFlow, vLLM |
| `openai-chat-vllm-adapter` | Chat Completions as vLLM serves it. Maps `thinking_level` onto the template's own switches. | vLLM |
| `openai-embedding` | OpenAI Embeddings | Any embedding endpoint |
| `ant-messages` | Anthropic Messages | Anthropic, OpenRouter, DeepSeek, Z.AI, MiniMax |
| `google-genai` | Google generateContent, as the Google GenAI SDK speaks it | Vertex AI, the Gemini API, gateways that proxy it |
| `mmsp` | MMSP itself | An [MMSP server](/docs/server/) |

Where a gateway serves more than one, prefer `openai-responses`. OpenRouter serves it for every model it hosts; SiliconFlow serves Chat Completions only.

<div class="code-group">

```typescript
const client = new AutoLLMClient({
  model: "qwen/qwen3.8-27b",
  clientType: "openai-responses",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

```python
client = AutoLLMClient(
    model="qwen/qwen3.8-27b",
    client_type="openai-responses",
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)
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

Name `google-genai` and pass the service-account JSON key as the API key. Vertex AI's Interactions endpoint serves none of these models, so `gemini-official`, which speaks Interactions, refuses such a key.

<div class="code-group">

```typescript
const client = new AutoLLMClient({
  model: "gemini-3.8-flash",
  clientType: "google-genai",
  apiKey: fs.readFileSync("service-account.json", "utf8"),
});
```

```python
client = AutoLLMClient(
    model="gemini-3.8-flash",
    client_type="google-genai",
    api_key=open("service-account.json").read(),
)
```

</div>

Thought signatures replay only on the endpoint that issued them. See [Fidelity](/docs/fidelity/).

## Wire protocols

Every client speaks one protocol on the wire, whichever `client_type` reaches it.

| `client_type` | Wire protocol |
| --- | --- |
| `gemini-official`, `google-genai` | `google-genai` |
| `anthropic-official`, `ant-messages` | `ant-messages` |
| `openai-official`, `deepseek-official`, `minimax-official`, `openai-responses` | `openai-responses` |
| `zai-official`, `moonshot-official`, `openai-chat`, `openai-chat-vllm-adapter` | `openai-chat` |
| `openai-embedding`, and `openai-official` for `text-embedding-*` | `openai-embedding` |
| `mmsp` | `mmsp` |
