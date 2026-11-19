# Gemini 4 Neon, OpenAI image & transcription models, OpenRouter Gemini TTS, and TokenDance DeepSeek ASR

- **Date:** 2026-11-19
- **Type:** feature
- **Scope:** `google-official`, `openai-official`, `openai-speech`, `registry`, `credentials`
- **PR:** [#352](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/352)

[中文版](2026-11-19-gemini-4-neon-openai-media.zh.md)

## What changed

- `google-official` and `google-genai` added `gemini-4-neon` to the `("low", "medium", "high", "xhigh")` thinking tier on `google-official` (mapping `none` to `"low"` and `max` to `"xhigh"`, while `google-genai` maps it onto `("low", "medium", "high")` due to the `google-genai` SDK's `ThinkingLevel` enum ceiling).
- `openai-official` routed `gpt-transcribe` to `openai-transcription` via `routed_client_type` / `routedClientType` alongside `text-embedding-*` (`openai-embedding`) and `gpt-image-*` (`openai-image`).
- `openai-speech` added `GeminiPlugin` (`models = r"gemini-.*tts"`), setting `request["voice"] = "Kore"` when `tts_config` is omitted so OpenRouter's `google/gemini-3.8-flash-tts` and `google/gemini-3.8-flash-lite-tts` speak without requiring an explicit `tts_config`.
- Official clients flipped their default `thinking_level` branch to the minimum safe subset, what every model of the vendor's newest generation accepts, and matched the older generations explicitly, on the lowercased model id ([MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md#61-explicit-matching) §6.1):
  - `google-official` and `google-genai` defaulted to `("low", "medium", "high")` instead of `("minimal", "low", "medium", "high")`, matching `("gemini-3-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-robotics")` for `("minimal", "low", "medium", "high")`. `"gemini-2.5"` takes `("low", "high")` on `google-official` and no `thinking_level` on `google-genai`, and `google-genai` added `"gemini-omni"` (`("low", "high")`).
  - `openai-official` and the `gpt` plugin on `openai-responses` sent `"none"` for `ThinkingLevel.NONE` only on `("gpt-5.", "gpt-6-luna", "gpt-6.1-terra")`, and `"low"` on every other model, GPT-5 itself included.
  - `anthropic-official` defaulted `ThinkingLevel.NONE` to adaptive thinking at effort `"low"`, matching `"sonnet-5-5"` for `"between_tools"`, and `("4-5", "4-6", "4-7", "4-8")` and `"opus-5"` / `"sonnet-5"` without `"-5-5"` for `"disabled"`.
  - `zai-official` defaulted to GLM-5.3's forced thinking with `("low", "high", "max")`, matching `("glm-4", "glm-5.1", "glm-5.2")` and a `"glm-5"` no `"glm-5."` follows (GLM-5, GLM-5-Turbo, GLM-5V-Turbo, a gateway's `z-ai/glm-5:exacto`) for `"disabled"` and the pass-through effort.
  - `minimax-official` defaulted to MiniMax-M3.1-Flash's `ThinkingLevel.NONE` → `"low"` and `LOW`..`MAX` as given, which MiniMax-M2.x take too, matching `MiniMax-M3` (`"minimax-m3"` without `"minimax-m3."`) for `"none"` and `xhigh`/`max` → `"high"`.
- The registry added 14 entries, expanding to 384 entries:
  - `gemini-4-neon` on the Gemini API (`google-official`, Text/Image/Video/Audio in, Text out, 1,048,576 context, $3.00 prompt / $15.00 output / $0.15 cached per 1M tokens) and `google/gemini-4-neon` on OpenRouter (`openai-responses`, Text/Image in, Text out, 1,048,576 context, $3.00 / $15.00 / $0.15).
  - `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, and `gpt-image-2.5-sunburst` on OpenAI (`openai-official`, Text in, Image out, $5.00 prompt / $30.00 output / $1.25 cached per 1M tokens) and `openai/gpt-image-2.6-sunburst`, `openai/gpt-image-2.6-flare`, `openai/gpt-image-2.5-sunburst`, and `openai/gpt-image-2.5-flare` on OpenRouter (`openai-image`, Text in, Image out, $5.00 / $30.00).
  - `gpt-transcribe` on OpenAI (`openai-official`, Audio in, Text out, $75.00 per 1M seconds = $0.0045/min) and `openai/gpt-transcribe` on OpenRouter (`openai-transcription`, Audio in, Text out, $75.00 per 1M seconds).
  - `google/gemini-3.8-flash-tts` and `google/gemini-3.8-flash-lite-tts` on OpenRouter (`openai-speech`, Text in, Audio out).
  - `deepseek-asr` on TokenDance (`deepseek-transcription` at `https://tokendance.space/gateway/deepseek`, Audio in, Text out, ¥110.00 per 1M seconds = ¥0.00011/s).
- The shared test catalog (`models.json`) replaced `gpt-image-2.5-flare` with `gpt-image-2.6-flare`, added `gpt-transcribe` under `openai-transcription`, and added OpenRouter's `google/gemini-3.8-flash-tts` under `openai-speech`.
- Documentation (`site/src/docs/usage.{en,zh}.md`, `models.{en,zh}.md`, `configuration.{en,zh}.md`) and the MMSP skills (`skills/mmsp-python/`, `skills/mmsp-typescript/`) documented the new models, flipped thinking-level tables, and multimodal/non-token `usage_metadata` billing alignment with `list_supported_models()`.
