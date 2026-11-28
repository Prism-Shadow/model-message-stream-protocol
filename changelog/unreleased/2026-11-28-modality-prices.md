# Four prices on every registry row: cached, input, thinking, output

- **Date:** 2026-11-28
- **Type:** feature
- **Scope:** `registry`, `tests`, `site`, `skills`, `.github`
- **PR:** [#367](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/367)
- **Breaking:** yes — `ModelPricing.cached_tokens` and `SupportedModel.pricing` became required, so a TypeScript object of either type built without them no longer compiles

[中文版](2026-11-28-modality-prices.zh.md)

## What changed

- `ModelPricing` held `currency` and four required prices per million, `cached_tokens`, `prompt_tokens`, `thoughts_tokens` and `response_tokens`, in both packages, as [MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.md) ([#365](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/365)) specifies. `thoughts_tokens`, which [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360) had removed before any release, came back. `SupportedModel.pricing` became required, and `list_supported_models` / `listSupportedModels` returned all four prices on every row, in USD and in CNY.
- The registry's `_usd` / `_cny` (`usd` / `cny`) helpers took the cache-hit and thinking prices as optional arguments and defaulted them to the input and the output price, so every row without a cache-hit price of its own priced `cached_tokens` at its input price.
- The 14 rows without a price were priced, and the rows whose vendor prices text output apart from image or video output stored the text rate in `thoughts_tokens` and the media rate in `response_tokens` (tables below).
- The per-image rows stored the price of one image × 1,000 in `response_tokens`, the 1,000 tokens their client counts per image, instead of the price spread over the tokens of one image size.
- 17 rows joined from the PenguinHarness catalog: TokenDance's `glm-5.4`, `hy4-flash` and `deepseek-tts`, six OpenCode Go rows and eight Penguin Go rows. The registry went from 384 to 401 rows.
- The status probe priced each usage bucket at its own price.
- `/models.json` wrote the four prices on every row, and its `pricing` note gave the cost formula: `(cached_tokens * pricing.cached_tokens + prompt_tokens * pricing.prompt_tokens + thoughts_tokens * pricing.thoughts_tokens + response_tokens * pricing.response_tokens) / 1e6`, a null count read as 0.
- The Model Index showed four sortable price columns, Cached / Input / Thinking / Output (缓存 / 输入 / 推理 / 输出), in USD or CNY; on a phone each price put its figure under its name. The rows' markup dropped the per-row price attributes and the per-cell labels and units, and `/models/` went from 1,307,899 to 1,233,184 bytes (60,356 to 57,705 by `gzip -9`), `/zh/models/` from 1,321,737 to 1,247,363 (61,394 to 58,668), and `/models.json` from 126,530 to 143,292 (7,491 to 8,675).
- The usage and client docs, `llms.txt`, the `mmsp-python` and `mmsp-typescript` skills and the `mmsp-dev` skill stated the cost of a turn as the sum of each count times its price.

## Registry metadata

Rows priced for the first time, per 1M:

| Model | Platform | Client | Cached | Input | Thinking | Output |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-3.1-flash-lite-image` | Gemini API | `google-official` | $0.25 | $0.25 | $1.50 | $30 |
| `gemini-3.1-flash-image` | Gemini API | `google-official` | $0.50 | $0.50 | $3 | $60 |
| `gemini-3.8-flash-tts` | Gemini API | `google-official` | $1 | $1 | $18 | $18 |
| `gemini-3.8-flash-lite-tts` | Gemini API | `google-official` | $1 | $1 | $12 | $12 |
| `gemini-embedding-2` | Gemini API | `google-official` | $0.20 | $0.20 | 0 | 0 |
| `google/gemini-3.8-flash-tts` | OpenRouter | `openai-speech` | $1 | $1 | $18 | $18 |
| `google/gemini-3.8-flash-lite-tts` | OpenRouter | `openai-speech` | $1 | $1 | $12 | $12 |
| `Qwen/Qwen3-Embedding-8B` | SiliconFlow | `openai-embedding` | ¥0.28 | ¥0.28 | 0 | 0 |
| `gemini-3.1-flash-image` | Vertex AI | `google-genai` | $0.05 | $0.50 | $3 | $60 |
| `gemini-3.8-flash-tts` | Vertex AI | `google-genai` | $1 | $1 | $18 | $18 |
| `minimax-m3` | TokenDance | `minimax-official` | ¥0.42 | ¥2.1 | ¥8.4 | ¥8.4 |
| `deepseek-ai/DeepSeek-V4.1-Flash`, `Qwen/Qwen3.8-27B`, `Qwen/Qwen3.8-Flash-Next` | ModelScope | `openai-responses` | 0 | 0 | 0 | 0 |

The Gemini TTS rows stored Google's price from 2027-01-01; through 2026-12-31 Google bills half. `minimax-m3` on TokenDance stored the catalog's Chat Completions rate, the catalog listing no rate for the Responses protocol `minimax-official` speaks. ModelScope API-Inference is free.

Rows repriced, per 1M:

| Model | Platform | Client | Cached | Input | Thinking | Output | Before |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | Gemini API | `google-official` | $1.50 | $1.50 | $7.50 | $30 | thinking $30 |
| `gemini-omni-1.2-flash` | Gemini API | `google-official` | $1.50 | $1.50 | $9 | $12 | thinking $12 |
| `google/gemini-nano-banana-2.1` | OpenRouter | `openai-image` | $1.50 | $1.50 | $7.50 | $30 | thinking $30 |
| `bytedance-seed/seedream-5-5` | OpenRouter | `openai-image` | 0 | 0 | $20 | $20 | output $4.790419 |
| `bytedance-seed/seedream-5-0-flash` | OpenRouter | `openai-image` | 0 | 0 | $18 | $18 | output $4.311377 |
| `seedream-5.0-lite` | TokenDance | `openai-image` | 0 | 0 | ¥220 | ¥220 | output ¥13.427734 |

Rows added, per 1M:

| Model | Platform | Client | Input | Context | Cached | Input | Thinking | Output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `glm-5.4` | TokenDance | `openai-chat` | Text, Image | 1,000,000 | ¥2 | ¥8 | ¥28 | ¥28 |
| `hy4-flash` | TokenDance | `openai-responses` | Text, Image | 1,000,000 | ¥0.01 | ¥0.25 | ¥1 | ¥1 |
| `deepseek-tts` | TokenDance (`/gateway/deepseek`) | `deepseek-speech` | Text | – | ¥150 | ¥150 | 0 | 0 |
| `longcat-2.5` | OpenCode Go | `openai-chat` | Text, Image | 1,000,000 | $0.006 | $0.30 | $1.20 | $1.20 |
| `qwen4-max` | OpenCode Go (`/anthropic`) | `ant-messages` | Text, Image | 1,000,000 | $0.075 | $1.50 | $4.50 | $4.50 |
| `hy4` | OpenCode Go | `openai-chat` | Text, Image | 1,048,576 | $0.042 | $0.834 | $2.501 | $2.501 |
| `hy4-flash-free` | OpenCode Go | `openai-chat` | Text, Image | 1,048,576 | 0 | 0 | 0 | 0 |
| `beam-free` | OpenCode Go | `openai-chat` | Text | 1,048,576 | 0 | 0 | 0 | 0 |
| `iceman-contributor-free` | OpenCode Go | `openai-chat` | Text | 262,144 | 0 | 0 | 0 | 0 |
| `gemini-4-hydrogen` | Penguin Go | `mmsp` | Text, Image | 1,048,576 | $0.075 | $1.50 | $7.50 | $7.50 |
| `gemini-nano-banana-2.1` | Penguin Go | `mmsp` | Text, Image | 131,072 | $1.50 | $1.50 | $7.50 | $30 |
| `gemini-omni-1.2-flash` | Penguin Go | `mmsp` | Text, Image | – | $1.50 | $1.50 | $12 | $12 |
| `gemini-3.8-flash-tts` | Penguin Go | `mmsp` | Text | – | $0.50 | $0.50 | $9 | $9 |
| `deepseek-tts` | Penguin Go | `mmsp` | Text | – | ¥300 | ¥300 | 0 | 0 |
| `deepseek-asr` | Penguin Go | `mmsp` | Audio | – | ¥216.67 | ¥216.67 | 0 | 0 |
| `deepseek-search`, `deepseek-fetch` | Penguin Go | `mmsp` | Text | – | ¥5,000 | ¥5,000 | 0 | 0 |

The Penguin Go relay counts one prompt token for each search or fetch it bills (¥0.005).

## Compatibility

- A TypeScript object typed `ModelPricing` sets `cached_tokens` (the input price where the platform has no cache-hit price), and one typed `SupportedModel` sets `pricing`.
- `cached_tokens` is present on every row: a caller that read its absence as "no cache-hit price" compares it with `prompt_tokens` instead.
- On `seedream-5.0-lite`, `bytedance-seed/seedream-5-5` and `bytedance-seed/seedream-5-0-flash`, `pricing.response_tokens` per million is the price of 1,000 images, to go with 1,000 `response_tokens` counted per image; 0.5.12's price for them was spread over the gateway's tokens for one image size.
