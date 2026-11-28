# Gemini 客户端按输出模态拆分用量，openai-speech 计入 Gemini TTS 的音频 token

- **Date:** 2026-11-28
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `openai_speech`, `llmsdk_docs`, `tests`

[English](2026-11-28-modality-usage.md)

## 变更内容

- `google-official` 与 `google-genai`（Python 与 TypeScript）按响应用量中的模态明细拆分输出（[MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.zh.md) §5，RFC PR [#365](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/365)）：明细列出图像、视频或音频 token 时，`response_tokens` 为这些 token，`thoughts_tokens` 为思考加上其余输出，即文本。明细未列出这类 token 的响应照旧计数。拆分依据每个响应本身，不看模型 id。
- `google-official` 读取 Interactions 的 `output_tokens_by_modality`；文本为 `total_output_tokens` 减去媒体 token，若 `total_output_tokens` 小于媒体 token 则取其全部。`gemini-nano-banana-2.1` 在开启思考摘要流式输出时即是如此，其 `total_output_tokens` 不含图像。
- `google-genai` 读取 generateContent 的 `candidates_tokens_details` / `candidatesTokensDetails`；文本为 `candidates_token_count` 减去媒体 token。
- `openai-speech` 的 `gemini` 插件（`gemini-.*tts`，即 OpenRouter 的 `google/gemini-3.8-flash-tts` 与 `google/gemini-3.8-flash-lite-tts`）对每个响应记 ⌈音频秒数 × 25⌉ 个 `response_tokens`，再按消息求和；秒数由 16 位 PCM 的字节长度与其内容类型中的 `rate`、`channels` 算出（[MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.zh.md) §6）。`openai-speech` 统计每个响应的音频字节数，并通过 `on_wire_event` / `onWireEvent` 把每个响应的计数交给插件；`prompt_tokens` 仍为输入的 UTF-8 字节长度，其他模型的 `response_tokens` 仍为 `0`。
- `llmsdk_docs/gemini_interactions/README.md` 与 `llmsdk_docs/openrouter_media/README.md` 记录了 2026-11-28 实测 API 为 Nano Banana、Gemini TTS、Vertex AI 的 `gemini-3.1-flash-image` 以及 Gemini API 的 `gemini-embedding-2` 返回的用量。

## 按输出模态的用量

| 端点 | 上游用量（实测） | `thoughts_tokens` | `response_tokens` |
| --- | --- | --- | --- |
| `gemini-nano-banana-2.1`，`google-official`，开启思考摘要 | `total_output_tokens` 193，`image` 1,120，`total_thought_tokens` 898 | 1,091 | 1,120 |
| `gemini-nano-banana-2.1`，`google-official` | `total_output_tokens` 1,253，`image` 1,120，`total_thought_tokens` 0 | 133 | 1,120 |
| `gemini-omni-1.2-flash`，`google-official` | `total_output_tokens` 5,793，`video` 5,793，`total_thought_tokens` 408 | 408 | 5,793 |
| `gemini-3.8-flash-tts`，`google-official` | `total_output_tokens` 68，`audio` 68 | 0 | 68 |
| `gemini-3.1-flash-image`，`google-genai`（Vertex AI） | `candidatesTokenCount` 1,154，`TEXT` 34，`IMAGE` 1,120，`thoughtsTokenCount` 633 | 667 | 1,120 |
| `gemini-3.8-flash-tts`，`google-genai`（Vertex AI） | `candidatesTokenCount` 76，`AUDIO` 76 | 0 | 76 |
| `google/gemini-3.8-flash-tts`，`openai-speech`（OpenRouter） | 无；88,320 字节的 `audio/pcm;rate=24000;channels=1` | `None` | 46 |
