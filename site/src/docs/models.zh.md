---
description: MMSP 能对接的模型、每个模型讲的线上协议，以及如何调用任何兼容端点。
---

使用精确的模型 id。`AutoLLMClient` 从 id 推断客户端，并从环境变量读取 key 和端点。

## 模型

| 系列 | 提供方 | 示例 id | Key 与端点 |
| --- | --- | --- | --- |
| Gemini 3 到 3.8 | 官方、Vertex AI | `gemini-3.8-flash`、`gemini-3.7-flash`、`gemini-3.6-flash`、`gemini-3.1-pro-preview` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Gemini 图像与语音 | 官方、Vertex AI | `gemini-3.1-flash-image`、`gemini-3-pro-image`、`gemini-3.1-flash-tts-preview` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Gemini 向量 | 官方、Vertex AI | `gemini-embedding-2` | `GEMINI_API_KEY` `GEMINI_BASE_URL` |
| Claude 4.6 到 5 | 官方、Amazon Bedrock、ModelVerse | `claude-opus-5`、`claude-sonnet-5`、`claude-fable-5`、`claude-opus-4-8` | `ANTHROPIC_API_KEY` `ANTHROPIC_BASE_URL` |
| GPT-5.4 到 6 | 官方、OpenRouter、ModelVerse | `gpt-6-astra`、`gpt-5.6-sol`、`gpt-5.5`、`gpt-5.4` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| OpenAI 向量 | 官方 | `text-embedding-3-small`、`text-embedding-3-large` | `OPENAI_API_KEY` `OPENAI_BASE_URL` |
| Kimi K2.6、K3 | 官方、OpenRouter、SiliconFlow | `kimi-k3`、`kimi-k2.6` | `MOONSHOT_API_KEY` `MOONSHOT_BASE_URL` |
| DeepSeek V4 | 官方、OpenRouter、SiliconFlow | `deepseek-v4-pro`、`deepseek-v4-flash` | `DEEPSEEK_API_KEY` `DEEPSEEK_BASE_URL` |
| GLM-5.1 到 5.3 | 官方、OpenRouter、SiliconFlow | `glm-5.3`、`glm-5.3-flash`、`glm-5.2` | `ZAI_API_KEY` `ZAI_BASE_URL` |
| MiniMax-M3 | 官方 | `MiniMax-M3` | `MINIMAX_API_KEY` `MINIMAX_BASE_URL` |

每一行给出客户端读取的环境变量：先是 key，然后是端点，端点默认为提供商官方端点。

代码里的列表永远是最新的，带有每一条的 base URL、客户端、模态、上下文窗口和标价：

<div class="code-group">

```python
from mmsp import list_supported_models

models = list_supported_models(currency="CNY")  # 默认 "USD"
```

```typescript
import { listSupportedModels } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // 默认 "USD"
```

</div>

## 任何兼容端点

四个通用客户端可以调用任何提供其协议的端点。用 `client_type` 指名一个，并把端点和它的 key 一起给它：作为 `base_url` 和 `api_key`，或者作为环境变量里的 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY`（`ant-messages` 对应 `ANTHROPIC_` 那一对）。只给 `base_url` 不给 `api_key` 会抛错：环境变量里的 key 不会发往代码里指定的端点。

| `client_type` | 协议 | 提供方 |
| --- | --- | --- |
| `openai-responses` | OpenAI Responses | OpenAI、OpenRouter、DeepSeek、Z.AI、MiniMax |
| `openai-chat` | OpenAI Chat Completions。`openai` 是它的别名。 | 大多数网关、SiliconFlow、vLLM |
| `openai-chat-vllm-adapter` | vLLM 所提供的 Chat Completions。把 `thinking_level` 映射到模板自己的开关上。 | vLLM |
| `ant-messages` | Anthropic Messages | Anthropic、OpenRouter、DeepSeek、Z.AI、MiniMax |
| `openai-embedding` | OpenAI Embeddings | 任何向量端点 |

当网关提供不止一种协议时，优先用 `openai-responses`。OpenRouter 为它托管的每个模型都提供该协议；SiliconFlow 只提供 Chat Completions。

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

常见的 base URL：

| 网关 | Base URL |
| --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` |
| SiliconFlow | `https://api.siliconflow.cn/v1` |
| ModelVerse | `https://api.modelverse.cn/v1`，Claude 用 `https://api.modelverse.cn/` |
| vLLM | `http://127.0.0.1:8000/v1/` |

## Vertex AI 上的 Gemini

把服务账号的 JSON key 作为 API key 传入。这样的 key 走 generateContent，因为 Vertex AI 的 Interactions 端点不提供这些模型。其他任何 Gemini key 都使用 Interactions API。

`client_type="gemini-interactions"` 和 `client_type="gemini-generate-content"` 可以固定协议，后者也适用于只代理 generateContent 的网关。

思考签名只能在签发它的端点上重放。见 [Fidelity](/zh/docs/fidelity/)。

## 线上协议

每个客户端在线上只讲一种提供商协议，不论通过哪个 `client_type` 到达它。

| `client_type` | 线上协议 |
| --- | --- |
| `gemini-3.8`、`gemini-3.7`、`gemini-3`、`gemini-embedding`、`gemini-interactions`、`gemini-generate-content` | `google-genai` |
| `claude-5`、`claude-4-8`、`claude-4-7`、`claude-4-6`、`ant-messages` | `ant-messages` |
| `gpt-6`、`gpt-5.6`、`gpt-5.5`、`gpt-5.4`、`deepseek-v4`、`minimax-m3`、`openai-responses` | `openai-responses` |
| `glm-5.3`、`glm-5.2`、`glm-5.1`、`kimi-k3`、`kimi-k2.6`、`kimi-k2.5`、`openai-chat`、`openai-chat-vllm-adapter` | `openai-chat` |
| `openai-embedding` | `openai-embedding` |
