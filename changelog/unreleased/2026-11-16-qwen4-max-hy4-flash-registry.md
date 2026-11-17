# Qwen4 Max, Hy4 Flash, Gemini 4 Hydrogen, Ling 3.2 Flash and Seedream 5.5 join the registry

- **Date:** 2026-11-16
- **Type:** feature
- **Scope:** `registry`, `site`
- **PR:** [#331](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/331)

[中文版](2026-11-16-qwen4-max-hy4-flash-registry.zh.md)

## What changed

- The registry listed Alibaba's Qwen4 Max on OpenRouter (`qwen/qwen4-max`) and on TokenDance, DashScope and Qwen Token Plan (`qwen4-max`), and on OpenRouter Tencent's `tencent/hy4-flash`, Google's `google/gemini-4-hydrogen`, inclusionAI's `inclusionai/ling-3.2-flash:free` and ByteDance Seed's `bytedance-seed/seedream-5-5` (353 to 361 entries), in both packages.

## Registry metadata

| Model | Base URL | Client | Modalities | Context | Pricing per 1M tokens |
| --- | --- | --- | --- | --- | --- |
| `google/gemini-4-hydrogen` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | $1.5 prompt, $0.075 cached, $7.5 output |
| `inclusionai/ling-3.2-flash:free` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | $0 prompt, $0 output |
| `qwen/qwen4-max` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,000,000 | $1.5 prompt, $0.075 cached, $4.5 output |
| `tencent/hy4-flash` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image → Text | 1,048,576 | $0.07 prompt, $0.003 cached, $0.281 output |
| `bytedance-seed/seedream-5-5` | `https://openrouter.ai/api/v1` | `openai-image` | Text → Image | — | $0 prompt, $4.790419 output |
| `qwen4-max` | `https://tokendance.space/gateway/v1` | `openai-responses` | Text, Image → Text | 1,000,000 | ¥10 prompt, ¥0.5 cached, ¥30 output |
| `qwen4-max` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `openai-chat` | Text, Image → Text | 1,000,000 | ¥10 prompt, ¥0.5 cached, ¥30 output |
| `qwen4-max` | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `openai-chat` | Text, Image → Text | 1,000,000 | ¥10 prompt, ¥0.5 cached, ¥30 output |

OpenRouter quotes `tencent/hy4-flash` at half price ($0.035, $0.0015, $0.1405); the undiscounted rate is stored. `bytedance-seed/seedream-5-5` costs $0.02 per image ($0.035 for its high-resolution variant); the stored rate is the `image_output` price the models API quotes, about $0.02 for a 1K image (4,096 tokens) and four times that for a 2K one (16,384). The cache writes priced for Qwen4 Max by OpenRouter ($1.875) and by Qwen's model page (¥12.5 for 5 minutes, ¥20 for an hour) are not stored.
