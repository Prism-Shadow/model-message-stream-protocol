# 注册表每一行都有四档价格：缓存、输入、推理、输出

- **Date:** 2026-11-28
- **Type:** feature
- **Scope:** `registry`, `tests`, `site`, `skills`, `.github`
- **Breaking:** yes — `ModelPricing.cached_tokens` 与 `SupportedModel.pricing` 改为必填，缺少它们的 TypeScript 对象无法再通过编译

[English](2026-11-28-modality-prices.md)

## 变更内容

- 两个包的 `ModelPricing` 都包含 `currency` 和四个必填的每百万单价：`cached_tokens`、`prompt_tokens`、`thoughts_tokens` 与 `response_tokens`，依据 [MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.zh.md)（[#365](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/365)）。[#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360) 在发布前去掉的 `thoughts_tokens` 恢复。`SupportedModel.pricing` 改为必填，`list_supported_models` / `listSupportedModels` 在 USD 与 CNY 下都为每一行返回全部四个价格。
- 注册表的 `_usd` / `_cny`（`usd` / `cny`）辅助函数把缓存命中价与思考价作为可选参数，缺省分别取输入价与输出价；因此没有单独缓存命中价的行，`cached_tokens` 都按输入价计。
- 此前没有价格的 14 行补上了价格；厂商对文本输出与图像或视频输出分别定价的行，把文本单价存入 `thoughts_tokens`，媒体单价存入 `response_tokens`（见下表）。
- 按张计费的行在 `response_tokens` 中存单张价格 × 1,000，对应客户端每张图计的 1,000 个 token，不再把单价摊到某一种尺寸的 token 数上。
- 从 PenguinHarness 目录新增 17 行：TokenDance 的 `glm-5.4`、`hy4-flash` 与 `deepseek-tts`，OpenCode Go 的六行，以及 Penguin Go 的八行。注册表从 384 行增至 401 行。
- 状态探测按各自的单价为每个用量字段计费。
- `/models.json` 在每一行写出四个价格，其 `pricing` 说明给出成本公式：`(cached_tokens * pricing.cached_tokens + prompt_tokens * pricing.prompt_tokens + thoughts_tokens * pricing.thoughts_tokens + response_tokens * pricing.response_tokens) / 1e6`，为 null 的计数按 0 计。
- 模型索引显示四列可排序的价格：缓存 / 输入 / 推理 / 输出（Cached / Input / Thinking / Output），可切换 USD 与 CNY；在手机上每个价格的数值排在名称下方。行内标记去掉了每行重复的价格属性和每个单元格的名称与单位，`/models/` 从 1,307,899 字节降至 1,233,184（`gzip -9` 后从 60,356 降至 57,705），`/zh/models/` 从 1,321,737 降至 1,247,363（61,394 降至 58,668），`/models.json` 从 126,530 增至 143,292（7,491 增至 8,675）。
- 用量与客户端文档、`llms.txt`、`mmsp-python` 与 `mmsp-typescript` 两个 Skill 以及 `mmsp-dev` Skill 把一轮调用的成本写为各计数乘以各自单价之和。

## 注册表元数据

首次定价的行，每 1M：

| 模型 | 平台 | 客户端 | 缓存 | 输入 | 推理 | 输出 |
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
| `deepseek-ai/DeepSeek-V4.1-Flash`、`Qwen/Qwen3.8-27B`、`Qwen/Qwen3.8-Flash-Next` | ModelScope | `openai-responses` | 0 | 0 | 0 | 0 |

Gemini TTS 各行存的是 Google 自 2027-01-01 起的价格，2026-12-31 前 Google 按半价计费。TokenDance 上的 `minimax-m3` 存的是目录中 Chat Completions 的价格，目录没有列出 `minimax-official` 所用 Responses 协议的价格。ModelScope API-Inference 免费。

重新定价的行，每 1M：

| 模型 | 平台 | 客户端 | 缓存 | 输入 | 推理 | 输出 | 此前 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | Gemini API | `google-official` | $1.50 | $1.50 | $7.50 | $30 | 推理 $30 |
| `gemini-omni-1.2-flash` | Gemini API | `google-official` | $1.50 | $1.50 | $9 | $12 | 推理 $12 |
| `google/gemini-nano-banana-2.1` | OpenRouter | `openai-image` | $1.50 | $1.50 | $7.50 | $30 | 推理 $30 |
| `bytedance-seed/seedream-5-5` | OpenRouter | `openai-image` | 0 | 0 | $20 | $20 | 输出 $4.790419 |
| `bytedance-seed/seedream-5-0-flash` | OpenRouter | `openai-image` | 0 | 0 | $18 | $18 | 输出 $4.311377 |
| `seedream-5.0-lite` | TokenDance | `openai-image` | 0 | 0 | ¥220 | ¥220 | 输出 ¥13.427734 |

新增的行，每 1M：

| 模型 | 平台 | 客户端 | 输入模态 | 上下文 | 缓存 | 输入 | 推理 | 输出 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `glm-5.4` | TokenDance | `openai-chat` | Text, Image | 1,000,000 | ¥2 | ¥8 | ¥28 | ¥28 |
| `hy4-flash` | TokenDance | `openai-responses` | Text, Image | 1,000,000 | ¥0.01 | ¥0.25 | ¥1 | ¥1 |
| `deepseek-tts` | TokenDance（`/gateway/deepseek`） | `deepseek-speech` | Text | – | ¥150 | ¥150 | 0 | 0 |
| `longcat-2.5` | OpenCode Go | `openai-chat` | Text, Image | 1,000,000 | $0.006 | $0.30 | $1.20 | $1.20 |
| `qwen4-max` | OpenCode Go（`/anthropic`） | `ant-messages` | Text, Image | 1,000,000 | $0.075 | $1.50 | $4.50 | $4.50 |
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
| `deepseek-search`、`deepseek-fetch` | Penguin Go | `mmsp` | Text | – | ¥5,000 | ¥5,000 | 0 | 0 |

Penguin Go 中继对每次计费（¥0.005）的搜索或抓取计一个 prompt token。

## 兼容性

- 类型为 `ModelPricing` 的 TypeScript 对象须设置 `cached_tokens`（平台没有缓存命中价时取输入价），类型为 `SupportedModel` 的对象须设置 `pricing`。
- 每一行都有 `cached_tokens`：此前以该字段缺失判断"没有缓存命中价"的调用方，改为与 `prompt_tokens` 比较。
- 在 `seedream-5.0-lite`、`bytedance-seed/seedream-5-5` 与 `bytedance-seed/seedream-5-0-flash` 上，`pricing.response_tokens` 的每百万单价即 1,000 张图的价格，对应每张图计 1,000 个 `response_tokens`；0.5.12 中这几行的价格摊在网关为某一种尺寸报告的 token 数上。
