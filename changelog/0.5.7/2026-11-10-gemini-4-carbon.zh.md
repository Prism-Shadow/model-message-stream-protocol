# Gemini 4 Carbon，以及已退役模型移出注册表

- **Date:** 2026-11-10
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `registry`, `tests`, `site`, `docs`
- **PR:** [#324](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/324)

[English](2026-11-10-gemini-4-carbon.md)

## 变更内容

- 两个包中注册了 `gemini-4-carbon`（Gemini API，`google-official`）与 `google/gemini-4-carbon`（OpenRouter，`openai-responses`）。它的模型页、What's new 指南，以及最新的 latest-model、价格与弃用页面快照保存在 `llmsdk_docs/gemini4/`。
- `google-official` 与 `google-genai` 向 Gemini 4 Carbon 发送与 Gemini 4 Argon 相同的思考档位：`none` 发成 `low`，`xhigh` 和 `max` 发成 `high`。
- 注册表删去 12 个模型已退役的条目；加上两个 Carbon 条目，并以 Vertex AI 的 `gemini-3.8-flash-tts` 替换 `gemini-3.1-flash-tts-preview` 后，从 353 条变为 344 条。
- 共享模型测试目录在 `google-official` 和走 Gemini API 的 `google-genai` 上改测 `gemini-3.8-flash`（原为 `gemini-4-argon`），在 Vertex AI 上改测 `gemini-3.8-flash-tts`（原为 `gemini-3.1-flash-tts-preview`）。
- 模型索引变小：`/models/` 从 1,205,711 字节降到 1,176,575 字节（gzip 后从 56,473 降到 55,841），`/zh/models/` 从 1,218,410 降到 1,188,972（57,361 降到 56,721），`/models.json` 从 117,324 降到 114,407（7,000 降到 6,865）。
- README 的 DeepSeek 示例改用 `deepseek-flash`，Python TTS 示例的默认模型改为 `gemini-3.8-flash-tts`，并刷新了 `llmsdk_docs/deepseek_v4/docs/models-and-pricing.zh.md`。

## 配置行为

| 键 | 客户端与模型 | 发送 |
| --- | --- | --- |
| `thinking_level: "none"` | `google-official`、`google-genai`：Gemini 4 Carbon | `low` |
| `thinking_level: "xhigh"`、`"max"` | `google-official`、`google-genai`：Gemini 4 Carbon | `high` |

与 Gemini 4 Argon 一样，`temperature` 抛出 `UnsupportedParameterError`，`prompt_caching` 只接受 `enable`。

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 | 上下文 | 每百万 tokens 价格 |
| --- | --- | --- | --- | --- | --- |
| `gemini-4-carbon` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image, Video, Audio | 1,048,576 | 输入 $4，缓存 $0.20，输出 $20 |
| `google/gemini-4-carbon` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image | 1,048,576 | 输入 $4，缓存 $0.20，输出 $20 |
| `gemini-3.8-flash-tts` | `https://aiplatform.googleapis.com` | `google-genai` | Text | – | – |

Google 为 Gemini 4 Carbon 提供的首发价格持续到 2026-11-30：输入 $2，缓存 $0.10，输出 $10；注册表记录的是标价。

| 删除的条目 | 平台 | 状态 |
| --- | --- | --- |
| `gemini-3.7-flash` | Gemini API | 已路由到 `gemini-3.8-flash` |
| `gemini-3.5-flash` | Gemini API | 已路由到 `gemini-3.6-flash` |
| `gemini-3.1-flash-tts-preview` | Gemini API、Vertex AI | 2026-11-17 停用 |
| `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` | DeepSeek | 由 DeepSeek-V4.1-Flash-1017 提供服务 |
| `deepseek-v4-flash` | TokenDance | 已不在其模型目录中 |
| `inception/mercury-3`、`inception/mercury-2.5` | OpenRouter | 已无可用端点 |
| `google/gemini-3.7-flash`、`google/gemini-3.5-flash` | OpenRouter | Google 已将其路由到更新的模型 |
| `gemini-3.5-flash` | Penguin Go | Google 已将其路由到 `gemini-3.6-flash` |
