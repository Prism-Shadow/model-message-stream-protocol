---
description: The clients MMSP is made of, the models each one serves, and how to call any compatible endpoint.
---

A client is named by its `client_type`. An **official client** speaks its vendor's own API, knows the vendor's models, and reads the vendor's key from the environment. A **compatible client** speaks one wire protocol for any endpoint that serves it.

Use exact model ids. A model id that begins with a known family names its official client on its own, so `client_type` may be omitted for it; any other id raises and asks for one.

## Official clients

| `client_type` | Models | Speaks | Key and endpoint |
| --- | --- | --- | --- |
| `openai-official` | `gpt-6.1-sol`, `gpt-6-astra`, `gpt-5.6-sol`, `gpt-5.5`; `text-embedding-3-large`, `text-embedding-3-small` | OpenAI Responses; Embeddings for `text-embedding-*` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| `anthropic-official` | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1`, `claude-opus-5`, `claude-sonnet-5` | Anthropic Messages | `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` |
| `google-official` | `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.1-pro-preview`; `gemini-3.1-flash-image`, `gemini-3.8-flash-tts`; `gemini-embedding-2` | Gemini Interactions | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| `zai-official` | `glm-5.3`, `glm-5.3-flash`, `glm-5.2` | Chat Completions | `ZAI_API_KEY` `ZAI_BASE_URL` |
| `moonshot-official` | `kimi-k3`, `kimi-k2.6` | Chat Completions | `MOONSHOT_API_KEY` `MOONSHOT_BASE_URL` |
| `deepseek-official` | `deepseek-flash`, `deepseek-v4-pro` | Responses | `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` |
| `minimax-official` | `MiniMax-M3.1-Flash`, `MiniMax-M3` | Responses | `MINIMAX_API_KEY` `MINIMAX_BASE_URL` |

Each row names the environment variables the client reads: the key, then the endpoint, which defaults to the vendor's own. An official client reads them whatever endpoint it is given, so it also serves a gateway that mirrors the vendor's API: OpenRouter serves `deepseek/deepseek-v4-pro` through `deepseek-official`, and SiliconFlow serves `Pro/moonshotai/Kimi-K2.6` through `moonshot-official`, each with the gateway's `base_url` and `api_key`.

Gemini 4 Argon (`gemini-4-argon`) supports `low`, `medium` (default), and `high` thinking. MMSP maps `none` to `low` and `xhigh`/`max` to `high`. Its 1,048,576-token context window is shared by input, thinking, and output; synchronous streaming is limited to 65,536 output tokens. Longer outputs require Google's stored background execution, outside MMSP's stateless streaming interface. Caching is implicit only.

MiniMax-M3.1-Flash (`MiniMax-M3.1-Flash`) always thinks and supports `low` through `max` (default `max`). MMSP maps `none` to `low` and passes `xhigh` and `max` through. It has no priority tier and ignores `tool_choice: "none"`, so `fast_mode` and `tool_choice: "none"` raise `UnsupportedParameterError`.

## Routing by model id

Without a `client_type`, the family the model id begins with names the client:

| The id begins with | `client_type` |
| --- | --- |
| `gpt-`, `text-embedding-` | `openai-official` |
| `claude-` | `anthropic-official` |
| `gemini-` | `google-official` |
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

Seven compatible clients call any endpoint that serves their protocol. Name one with `client_type`, and give it the endpoint and its key together: as `base_url` and `api_key`, or as `OPENAI_BASE_URL` and `OPENAI_API_KEY` in the environment (the `ANTHROPIC_` pair for `ant-messages`, the `GEMINI_` pair for `google-genai`, the `VLLM_` pair for `openai-chat-vllm-adapter`, the `MMSP_` pair for `mmsp`). A `base_url` other than the client's default endpoint without an `api_key` raises: the environment's key is not sent to an endpoint named in code ([the rule](/docs/client/)). `openai-chat-vllm-adapter` and `mmsp` call it keyless instead, because their servers may take no key; without either, they reach `http://127.0.0.1:8000/v1` and `http://127.0.0.1:25752/v1`.

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

Common base URLs, and the variable the examples read each key from:

| Gateway | Base URL | Key |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| TokenDance | `https://tokendance.space/gateway/v1`, and `https://tokendance.space/gateway` for Anthropic Messages | `TOKENDANCE_API_KEY` |
| Google Vertex AI | `https://aiplatform.googleapis.com` | `VERTEX_API_KEY`: the service-account JSON |
| Amazon Bedrock | `bedrock://<region>`, such as `bedrock://us-east-1` | `BEDROCK_API_KEY`: `ACCESS_KEY,SECRET_KEY` |
| ModelVerse | `https://api.modelverse.cn/v1`, and `https://api.modelverse.cn/` for Claude | `MODELVERSE_API_KEY` |
| vLLM | `http://127.0.0.1:8000/v1/` | |

TokenDance serves several protocols with one key. Its model list names the protocols of each model; pick a client that speaks one of them, such as `deepseek-v4.1-flash` through `openai-chat`, and the vendor's official client where TokenDance speaks the vendor's API: `kimi-k3` through `moonshot-official`, `glm-5.3` through `zai-official`.

## Gemini on Vertex AI

Name `google-genai` and pass the service-account JSON key as the API key. Vertex AI's Interactions endpoint serves none of these models, so `google-official`, which speaks Interactions, refuses such a key. The client calls the global endpoint, `https://aiplatform.googleapis.com`, with or without that `base_url`.

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

## Claude on Amazon Bedrock

Name `anthropic-official`, pass `bedrock://<region>` as the base URL and the AWS access key and secret key, joined by a comma, as the API key. The model id is a Bedrock inference profile such as `global.anthropic.claude-opus-5-5`; the `global.` profiles cost the Anthropic list price, the geo profiles (`us.`, `eu.`, `jp.`, `au.`) 10% more.

<div class="code-group">

```typescript
const client = new AutoLLMClient({
  model: "global.anthropic.claude-opus-5-5",
  clientType: "anthropic-official",
  baseUrl: "bedrock://us-east-1",
  apiKey: process.env.BEDROCK_API_KEY, // "ACCESS_KEY,SECRET_KEY"
});
```

```python
client = AutoLLMClient(
    model="global.anthropic.claude-opus-5-5",
    client_type="anthropic-official",
    base_url="bedrock://us-east-1",
    api_key=os.environ["BEDROCK_API_KEY"],  # "ACCESS_KEY,SECRET_KEY"
)
```

</div>

## Wire protocols

Every client speaks one protocol on the wire, whichever `client_type` reaches it.

| `client_type` | Wire protocol |
| --- | --- |
| `google-official`, `google-genai` | `google-genai` |
| `anthropic-official`, `ant-messages` | `ant-messages` |
| `openai-official`, `deepseek-official`, `minimax-official`, `openai-responses` | `openai-responses` |
| `zai-official`, `moonshot-official`, `openai-chat`, `openai-chat-vllm-adapter` | `openai-chat` |
| `openai-embedding`, and `openai-official` for `text-embedding-*` | `openai-embedding` |
| `mmsp` | `mmsp` |
