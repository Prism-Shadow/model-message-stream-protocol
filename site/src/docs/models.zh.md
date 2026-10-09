---
description: MMSP 的客户端构成、各客户端支持的模型，以及如何调用任意兼容端点。
---

客户端由 `client_type` 指定。**官方客户端**直接对接厂商原生 API，识别该厂商的模型，并从环境变量读取厂商的 key。**兼容客户端**则使用统一的接口协议，可调用任何提供该协议的端点。

使用模型时需传入精确的模型 id。如果模型 id 以已知的系列名开头，系统会自动识别其对应的官方客户端，此时可省略 `client_type`；否则会报错并要求显式指定。

## 官方客户端

| `client_type` | 模型 | 协议 | Key 与端点 |
| --- | --- | --- | --- |
| `openai-official` | `gpt-6.1-sol`、`gpt-6-astra`、`gpt-5.6-sol`、`gpt-5.5`；`text-embedding-3-large`、`text-embedding-3-small` | OpenAI Responses；`text-embedding-*` 走 Embeddings | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| `anthropic-official` | `claude-opus-5-5`、`claude-sonnet-5-5`、`claude-haiku-5-5`、`claude-fable-5-1`、`claude-opus-5`、`claude-sonnet-5` | Anthropic Messages | `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` |
| `google-official` | `gemini-3.8-flash`、`gemini-3.7-flash`、`gemini-3.1-pro-preview`；`gemini-3.1-flash-image`、`gemini-3.8-flash-tts`；`gemini-embedding-2` | Gemini Interactions | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| `zai-official` | `glm-5.3`、`glm-5.3-flash`、`glm-5.2` | Chat Completions | `ZAI_API_KEY` `ZAI_BASE_URL` |
| `moonshot-official` | `kimi-k3`、`kimi-k2.6` | Chat Completions | `MOONSHOT_API_KEY` `MOONSHOT_BASE_URL` |
| `deepseek-official` | `deepseek-flash`、`deepseek-v4-pro` | Responses | `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` |
| `minimax-official` | `MiniMax-M3` | Responses | `MINIMAX_API_KEY` `MINIMAX_BASE_URL` |

每行列出了客户端读取的环境变量：先是 key，然后是端点。端点默认为厂商官方地址。官方客户端始终读取这些变量，因此也能用于对接镜像了厂商 API 的网关。例如，OpenRouter 上的 `deepseek/deepseek-v4-pro` 可通过 `deepseek-official` 调用，SiliconFlow 上的 `Pro/moonshotai/Kimi-K2.6` 可通过 `moonshot-official` 调用，只需传入网关的 `base_url` 和 `api_key` 即可。

## 按模型 id 路由

若不指定 `client_type`，系统会根据模型 id 开头的系列名自动路由：

| id 前缀 | `client_type` |
| --- | --- |
| `gpt-`、`text-embedding-` | `openai-official` |
| `claude-` | `anthropic-official` |
| `gemini-` | `google-official` |
| `glm-` | `zai-official` |
| `kimi-` | `moonshot-official` |
| `deepseek-` | `deepseek-official` |
| `minimax-` | `minimax-official` |

匹配不区分大小写，因此 `MiniMax-M3` 也能正确路由。网关的模型 id（如 `moonshotai/kimi-k3`）或 Amazon Bedrock 的 id（如 `global.anthropic.claude-fable-5`）不以已知系列开头，必须显式指定 `client_type`。环境变量 `CLIENT_TYPE` 可为代码中未指定的客户端设置默认值。

代码中的支持模型列表始终保持最新，包含每个模型的 base URL、客户端类型、模态、上下文窗口和标价：

<div class="code-group">

```typescript
import { listSupportedModels } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // 默认 "USD"
```

```python
from mmsp import list_supported_models

models = list_supported_models(currency="CNY")  # 默认 "USD"
```

</div>

## 兼容客户端

七个兼容客户端可调用任何提供对应协议的端点。使用时需用 `client_type` 指定协议，并同时提供端点和 key：可以传入 `base_url` 和 `api_key` 参数，或在环境变量中设置 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`（`ant-messages` 对应 `ANTHROPIC_` 变量对，`google-genai` 对应 `GEMINI_` 变量对，`mmsp` 对应 `MMSP_` 变量对）。如果只传 `base_url` 而不提供 `api_key` 会报错：环境变量中的 key 不会自动用于代码指定的端点。

| `client_type` | 协议 | 提供方 |
| --- | --- | --- |
| `openai-responses` | OpenAI Responses | OpenAI、OpenRouter、DeepSeek、Z.AI、MiniMax |
| `openai-chat` | OpenAI Chat Completions。`openai` 是其别名。 | 大多数网关、SiliconFlow、vLLM |
| `openai-chat-vllm-adapter` | vLLM 提供的 Chat Completions。将 `thinking_level` 映射到模板自有的开关。 | vLLM |
| `openai-embedding` | OpenAI Embeddings | 任何向量端点 |
| `ant-messages` | Anthropic Messages | Anthropic、OpenRouter、DeepSeek、Z.AI、MiniMax |
| `google-genai` | Google generateContent，即 Google GenAI SDK 所用的协议 | Vertex AI、Gemini API、代理此协议的网关 |
| `mmsp` | MMSP 本身 | [MMSP 服务端](/zh/docs/server/) |

如果网关支持多种协议，优先选择 `openai-responses`。OpenRouter 为其所有托管模型提供此协议；SiliconFlow 仅提供 Chat Completions。

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

常见网关的 base URL：

| 网关 | Base URL |
| --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` |
| SiliconFlow | `https://api.siliconflow.cn/v1` |
| ModelVerse | `https://api.modelverse.cn/v1`，Claude 模型使用 `https://api.modelverse.cn/` |
| vLLM | `http://127.0.0.1:8000/v1/` |

## Vertex AI 上的 Gemini

指定 `google-genai`，并将服务账号的 JSON key 作为 API key 传入。Vertex AI 的 Interactions 端点不提供这些模型，所以使用 Interactions 的 `google-official` 会拒绝此类 key。

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

思考签名仅在签发它的端点上有效。详见 [Fidelity](/zh/docs/fidelity/)。

## 接口协议

每个客户端在底层只使用一种协议，无论通过哪个 `client_type` 调用。

| `client_type` | 接口协议 |
| --- | --- |
| `google-official`、`google-genai` | `google-genai` |
| `anthropic-official`、`ant-messages` | `ant-messages` |
| `openai-official`、`deepseek-official`、`minimax-official`、`openai-responses` | `openai-responses` |
| `zai-official`、`moonshot-official`、`openai-chat`、`openai-chat-vllm-adapter` | `openai-chat` |
| `openai-embedding`，以及 `text-embedding-*` 下的 `openai-official` | `openai-embedding` |
| `mmsp` | `mmsp` |
