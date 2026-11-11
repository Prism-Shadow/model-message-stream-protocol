# Hy4 and ERNIE 5.5 Flash Preview join the registry

- **Date:** 2026-11-11
- **Type:** feature
- **Scope:** `registry`, `site`
- **PR:** [#325](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/325)

[中文版](2026-11-11-hy4-ernie-registry.zh.md)

## What changed

- The registry listed Tencent's `hy4` on OpenRouter and TokenDance, and Baidu's `ernie-5.5-flash-preview` on TokenDance (344 to 347 entries), in both packages.
- The Model Index filed ERNIE under Baidu with lobe-icons' Wenxin mark. `/models/` went from 1,176,575 to 1,187,556 bytes (55,841 to 56,697 gzipped), and `/models.json` from 114,407 to 115,414 (6,865 to 6,921).

## Registry metadata

| Model | Base URL | Client | Input | Context | Pricing per 1M tokens |
| --- | --- | --- | --- | --- | --- |
| `tencent/hy4` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image | 1,048,576 | $0.834 prompt, $0.042 cached, $2.501 output |
| `hy4` | `https://tokendance.space/gateway/v1` | `openai-responses` | Text, Image | 1,024,000 | ¥3 prompt, ¥0.15 cached, ¥9 output |
| `ernie-5.5-flash-preview` | `https://tokendance.space/gateway/v1` | `openai-chat` | Text | 1,000,000 | ¥0.5 prompt, ¥0.05 cached, ¥2 output |

OpenRouter quotes `tencent/hy4` at half price ($0.417, $0.021, $1.2505); the undiscounted rate is stored. TokenDance bills `ernie-5.5-flash-preview` at ¥1, ¥0.1 and ¥4 from 08:00 to 22:00 Beijing time; the rate outside those hours is stored.
