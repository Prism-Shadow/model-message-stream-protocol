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
- Official clients flipped their default `thinking_level` fallback branch to the minimum safe subset accepted by each vendor's newest models while explicitly matching older generations:
  - `google-official` and `google-genai` defaulted to `("low", "medium", "high")` instead of `("minimal", "low", "medium", "high")`, explicitly matching `("gemini-3-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-robotics")` for `("minimal", "low", "medium", "high")` and adding `"gemini-omni"` (`("low", "high")`) to `google-genai`.
  - `openai-official` and `openai-responses`'s `gpt` plugin defaulted `ThinkingLevel.NONE` to `"low"`, explicitly matching `("gpt-5.", "gpt-6-luna", "gpt-6.1-terra")` for `"none"`.
  - `anthropic-official` defaulted `ThinkingLevel.NONE` to adaptive `"low"`, explicitly matching `"sonnet-5-5"` for `"between_tools"`, `"4-6"` for `xhigh` → `"high"`, and older models (`"4-6"`, `"4-7"`, `"4-8"`, and `"opus-5"` / `"sonnet-5"` excluding `"-5-5"`) for `"disabled"`.
  - `zai-official` defaulted to GLM-5.3's forced thinking with `("low", "high", "max")`, explicitly matching older GLM models (`glm-5`, `glm-4.*`, `glm-5.1`, `glm-5.2`, `glm-5-turbo`, `glm-5v`) for `"disabled"`, `"medium"`, and `"xhigh"`.
  - `minimax-official` defaulted to MiniMax-M3.1's `ThinkingLevel.NONE` → `"low"` and `LOW`..`MAX` pass-through, explicitly matching `MiniMax-M3` (`"minimax-m3"` without `"minimax-m3."`) for `"none"` and `xhigh`/`max` → `"high"`.
- The registry added 14 entries, expanding to 384 entries:
  - `gemini-4-neon` on the Gemini API (`google-official`, Text/Image/Video/Audio in, Text out, 1,048,576 context, $3.00 prompt / $15.00 output / $0.15 cached per 1M tokens) and `google/gemini-4-neon` on OpenRouter (`openai-responses`, Text/Image in, Text out, 1,048,576 context, $3.00 / $15.00 / $0.15).
  - `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, and `gpt-image-2.5-sunburst` on OpenAI (`openai-official`, Text in, Image out, $5.00 prompt / $30.00 output / $1.25 cached per 1M tokens) and `openai/gpt-image-2.6-sunburst`, `openai/gpt-image-2.6-flare`, `openai/gpt-image-2.5-sunburst`, and `openai/gpt-image-2.5-flare` on OpenRouter (`openai-image`, Text in, Image out, $5.00 / $30.00).
  - `gpt-transcribe` on OpenAI (`openai-official`, Audio in, Text out, $75.00 per 1M seconds = $0.0045/min) and `openai/gpt-transcribe` on OpenRouter (`openai-transcription`, Audio in, Text out, $75.00 per 1M seconds).
  - `google/gemini-3.8-flash-tts` and `google/gemini-3.8-flash-lite-tts` on OpenRouter (`openai-speech`, Text in, Audio out).
  - `deepseek-asr` on TokenDance (`deepseek-transcription` at `https://tokendance.space/gateway/deepseek`, Audio in, Text out, ¥110.00 per 1M seconds = ¥0.00011/s).
- The shared test catalog (`models.json`) replaced `gpt-image-2.5-flare` with `gpt-image-2.6-flare`, added `gpt-transcribe` under `openai-transcription`, and added OpenRouter's `google/gemini-3.8-flash-tts` under `openai-speech`.
- Documentation (`site/src/docs/usage.{en,zh}.md`, `models.{en,zh}.md`, `configuration.{en,zh}.md`) and the MMSP skills (`skills/mmsp-python/`, `skills/mmsp-typescript/`) documented the new models, flipped thinking-level tables, and multimodal/non-token `usage_metadata` billing alignment with `list_supported_models()`.
