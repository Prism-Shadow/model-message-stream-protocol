# Model Selection

Use exact model IDs, and pass the model's client type as `client_type`. If a model ID is not listed, ask the user to confirm the exact ID before using it. A model ID that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`) names its official client on its own, so `client_type` may be omitted for it; any other ID, such as a gateway's `moonshotai/kimi-k3` or Bedrock's `global.anthropic.claude-fable-5`, raises without one. The supported model entries (base URL, client, modalities, context window, USD/CNY pricing) are also available at runtime via `mmsp.list_supported_models()`.

| Family | Provider | Model IDs | Client type | API Key | Base URL |
| --- | --- | --- | --- | --- | --- |
| Gemini 3 | Official / Vertex AI | `gemini-3.1-pro-preview`, `gemini-3.5-flash`, `gemini-3.1-flash-lite` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini 3.6 | Official / Vertex AI | `gemini-3.6-flash`, `gemini-3.5-flash-lite` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini 3.8 | Official / Vertex AI | `gemini-3.8-flash` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini 3.7 | Official / Vertex AI | `gemini-3.7-flash` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini 3 Image | Official / Vertex AI | `gemini-3.1-flash-image`, `gemini-3.1-flash-lite-image`, `gemini-3-pro-image` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini 3.8 TTS | Official | `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` | `google-official` | `GEMINI_API_KEY` (not served on Vertex AI) | `GEMINI_BASE_URL` |
| Gemini 3 TTS | Official / Vertex AI | `gemini-3.1-flash-tts-preview` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Gemini Embedding | Official / Vertex AI | `gemini-embedding-2` | `google-official` (Vertex AI: `google-genai`) | `GEMINI_API_KEY` (Vertex AI: the service-account JSON as the key) | `GEMINI_BASE_URL` |
| Claude 4.6 | Official / ModelVerse | `claude-sonnet-4-6` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 4.6 | Bedrock | `global.anthropic.claude-sonnet-4-6` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 4.7 | Official / ModelVerse | `claude-opus-4-7` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 4.7 | Bedrock | `global.anthropic.claude-opus-4-7` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 4.8 | Official / ModelVerse | `claude-opus-4-8` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 4.8 | Bedrock | `global.anthropic.claude-opus-4-8` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 5.5 / Fable 5.1 | Official | `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 5 | Official / ModelVerse | `claude-fable-5`, `claude-opus-5`, `claude-sonnet-5` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| Claude 5 | Bedrock | `global.anthropic.claude-fable-5` | `anthropic-official` | `ANTHROPIC_API_KEY` | `ANTHROPIC_BASE_URL` |
| GPT 5.4 | Official / ModelVerse | `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano` | `openai-official` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GPT 5.5 | Official / ModelVerse | `gpt-5.5` | `openai-official` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GPT 5.6 | Official | `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna` | `openai-official` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GPT 5.6 | OpenRouter | `openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna` | `openai-responses` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GPT 6 | Official | `gpt-6.1-sol`, `gpt-6-astra` | `openai-official` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| GPT 6 | OpenRouter | `openai/gpt-6-astra` | `openai-responses` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| OpenAI Embedding | Official | `text-embedding-3-small`, `text-embedding-3-large` | `openai-official` | `OPENAI_API_KEY` | `OPENAI_BASE_URL` |
| Kimi-K2.6 | Official | `kimi-k2.6` | `moonshot-official` | `MOONSHOT_API_KEY` | `MOONSHOT_BASE_URL` |
| Kimi-K2.6 | OpenRouter | `moonshotai/kimi-k2.6` | `moonshot-official` | `MOONSHOT_API_KEY` | `MOONSHOT_BASE_URL` |
| Kimi-K2.6 | SiliconFlow | `Pro/moonshotai/Kimi-K2.6` | `moonshot-official` | `MOONSHOT_API_KEY` | `MOONSHOT_BASE_URL` |
| Kimi-K3 | Official | `kimi-k3` | `moonshot-official` | `MOONSHOT_API_KEY` | `MOONSHOT_BASE_URL` |
| Kimi-K3 | OpenRouter | `moonshotai/kimi-k3` | `moonshot-official` | `MOONSHOT_API_KEY` | `MOONSHOT_BASE_URL` |
| DeepSeek V4 | Official | `deepseek-flash`, `deepseek-v4-pro` | `deepseek-official` | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| DeepSeek V4 | OpenRouter | `deepseek/deepseek-v4-pro`, `deepseek/deepseek-v4-flash` | `deepseek-official` | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| DeepSeek V4 | SiliconFlow | `deepseek-ai/DeepSeek-V4-Pro`, `deepseek-ai/DeepSeek-V4-Flash` | `openai-chat` | `DEEPSEEK_API_KEY` | `DEEPSEEK_BASE_URL` |
| GLM-5.1 | Official | `glm-5.1` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.1 | OpenRouter | `z-ai/glm-5.1` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.1 | SiliconFlow | `Pro/zai-org/GLM-5.1` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.2 | Official | `glm-5.2` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.2 | OpenRouter | `z-ai/glm-5.2` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.2 | SiliconFlow | `zai-org/GLM-5.2` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.3 | Official | `glm-5.3`, `glm-5.3-flash` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| GLM-5.3 | OpenRouter | `z-ai/glm-5.3` | `zai-official` | `ZAI_API_KEY` | `ZAI_BASE_URL` |
| MiniMax-M3 | Official | `MiniMax-M3` | `minimax-official` | `MINIMAX_API_KEY` | `MINIMAX_BASE_URL` |

`google-official` serves Gemini models through the Interactions API with a Gemini API key. On Vertex AI, pass `client_type: "google-genai"`, which speaks generateContent, with the service-account JSON key; Vertex AI serves no Gemini model through Interactions, and `google-official` refuses a service-account key. Embedding models use `embedContent` on either client. Thought signatures only replay on the endpoint that issued them, so a history recorded with an API key cannot move to a Vertex AI key with its signatures, or the reverse.

Common gateway base URLs:

- OpenRouter: `https://openrouter.ai/api/v1`
- SiliconFlow: `https://api.siliconflow.cn/v1`
- ModelVerse: `https://api.modelverse.cn/v1` (`https://api.modelverse.cn/` for Claude)
- vLLM: `http://127.0.0.1:8000/v1/`

Every client type, and what it speaks:

- Official clients speak their vendor's own API and read the vendor's key and base URL from the environment, whatever endpoint they are given: `openai-official` (Responses; `text-embedding-*` models through Embeddings), `anthropic-official` (Messages), `google-official` (Interactions), `zai-official` and `moonshot-official` (Chat Completions), `deepseek-official` and `minimax-official` (Responses).
- Compatible clients speak one wire protocol for any endpoint that serves it, and read `OPENAI_API_KEY` / `OPENAI_BASE_URL` (`ANTHROPIC_*` for `ant-messages`, `GEMINI_*` for `google-genai`): `openai-responses`, `openai-chat` (bare `openai` is an alias), `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai` (generateContent, as the Google GenAI SDK speaks it, for Vertex AI, the Gemini API, and gateways), `mmsp` (MMSP itself, for an MMSP server started with `python -m mmsp.integration.server --config <file>`; `MMSP_API_KEY` / `MMSP_BASE_URL`, by default `http://127.0.0.1:25752/v1`).

For models accessed through OpenAI-compatible APIs (e.g., Qwen series models via SiliconFlow or OpenRouter), pass a compatible client type with the gateway's base URL and key. Prefer `openai-responses` on gateways that serve the OpenAI Responses protocol, which OpenRouter does for every model it hosts; SiliconFlow serves Chat Completions only, so use `openai-chat` there. Use `openai-embedding` for embedding endpoints and `ant-messages` for Anthropic Messages endpoints:

```python
client = AutoLLMClient(
    model="Qwen/Qwen3-Embedding-0.6B",
    client_type="openai-embedding",
    base_url="https://api.siliconflow.cn/v1",
    api_key=os.environ["SILICONFLOW_API_KEY"],
)
```
