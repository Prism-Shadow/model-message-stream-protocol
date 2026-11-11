# Gemini 4 Carbon, and the retired models leave the registry

- **Date:** 2026-11-10
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `registry`, `tests`, `site`, `docs`
- **PR:** [#324](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/324)

[中文版](2026-11-10-gemini-4-carbon.zh.md)

## What changed

- `gemini-4-carbon` was registered on the Gemini API through `google-official`, and `google/gemini-4-carbon` on OpenRouter through `openai-responses`, in both packages. Its model page, the What's new guide, and fresh copies of the latest-model, pricing and deprecation pages were snapshotted in `llmsdk_docs/gemini4/`.
- `google-official` and `google-genai` sent Gemini 4 Carbon the thinking levels Gemini 4 Argon takes: `none` went out as `low`, and `xhigh` and `max` as `high`.
- The registry dropped 12 entries whose models were retired, and went from 353 to 344 entries with the two Carbon rows and a Vertex AI `gemini-3.8-flash-tts` row in place of `gemini-3.1-flash-tts-preview`.
- The shared model catalog tested `gemini-3.8-flash` instead of `gemini-4-argon` on `google-official` and on `google-genai` with the Gemini API, and `gemini-3.8-flash-tts` instead of `gemini-3.1-flash-tts-preview` on Vertex AI.
- The Model Index got lighter: `/models/` went from 1,205,711 to 1,176,575 bytes (56,473 to 55,841 gzipped), `/zh/models/` from 1,218,410 to 1,188,972 (57,361 to 56,721), and `/models.json` from 117,324 to 114,407 (7,000 to 6,865).
- The README's DeepSeek examples used `deepseek-flash`, the Python TTS example defaulted to `gemini-3.8-flash-tts`, and `llmsdk_docs/deepseek_v4/docs/models-and-pricing.zh.md` was refreshed.

## Configuration behavior

| Key | Client and model | Sent |
| --- | --- | --- |
| `thinking_level: "none"` | `google-official`, `google-genai`: Gemini 4 Carbon | `low` |
| `thinking_level: "xhigh"`, `"max"` | `google-official`, `google-genai`: Gemini 4 Carbon | `high` |

`temperature` raised `UnsupportedParameterError` and `prompt_caching` took only `enable`, as on Gemini 4 Argon.

## Registry metadata

| Model | Base URL | Client | Input | Context | Pricing per 1M tokens |
| --- | --- | --- | --- | --- | --- |
| `gemini-4-carbon` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image, Video, Audio | 1,048,576 | $4 prompt, $0.20 cached, $20 output |
| `google/gemini-4-carbon` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image | 1,048,576 | $4 prompt, $0.20 cached, $20 output |
| `gemini-3.8-flash-tts` | `https://aiplatform.googleapis.com` | `google-genai` | Text | – | – |

Google's introductory price for Gemini 4 Carbon through 2026-11-30 is $2 prompt, $0.10 cached and $10 output; the list price is stored.

| Removed entry | Platform | Status |
| --- | --- | --- |
| `gemini-3.7-flash` | Gemini API | routed to `gemini-3.8-flash` |
| `gemini-3.5-flash` | Gemini API | routed to `gemini-3.6-flash` |
| `gemini-3.1-flash-tts-preview` | Gemini API, Vertex AI | shuts down on 2026-11-17 |
| `deepseek-v4-flash`, `deepseek-v4-flash-vision-exp` | DeepSeek | served by DeepSeek-V4.1-Flash-1017 |
| `deepseek-v4-flash` | TokenDance | no longer in the catalog |
| `inception/mercury-3`, `inception/mercury-2.5` | OpenRouter | no endpoints |
| `google/gemini-3.7-flash`, `google/gemini-3.5-flash` | OpenRouter | Google routes them to newer models |
| `gemini-3.5-flash` | Penguin Go | Google routes it to `gemini-3.6-flash` |
