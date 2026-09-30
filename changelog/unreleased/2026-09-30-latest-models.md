# Support Claude Opus 5.5, Sonnet 5.5 and Fable 5.1, GPT-6.1 Sol, DeepSeek Flash and Gemini 3.8 TTS

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `anthropic_official`, `gemini_official`, `gemini_generate_content`, `registry`, `skills`, `docs`

[中文版](2026-09-30-latest-models.zh.md)

## What changed

- `anthropic-official` serves `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-fable-5-1`, matched by id on every platform, Bedrock's `anthropic.` prefix included:
  - `thinking_level="none"` sends adaptive thinking at `low` effort on Opus 5.5 and Fable 5.1, which reject both `disabled` and `between_tools`, and `thinking: {"type": "between_tools"}` on Sonnet 5.5, which drops up-front thinking that way. `thinking_summary` is not sent with `between_tools`, which rejects `display`.
  - `tool_choice="required"` and a list of tool names raise `UnsupportedParameterError` on all three, which answer forced tool choice (`any`, `tool`) with a 400.
  - `fast_mode` raises `UnsupportedParameterError` on Sonnet 5.5 and Fable 5.1, which reject `speed`; Opus 5.5 sends it.
  - The other levels map one to one: all three take `low`, `medium`, `high`, `xhigh` and `max`.
- `openai-official` serves `gpt-6.1-sol`. As on `gpt-6-astra`, `thinking_level="none"` sends `low`, since the model rejects `none`.
- `deepseek-flash`, DeepSeek-V4.1-Flash with image input, routes to `deepseek-official`; DeepSeek also serves `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` with it. The client keeps refusing images for `deepseek-v4-flash` and `deepseek-v4-pro`.
- `gemini-official` and `gemini-generate-content` serve `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts`. With two speakers in `tts_config`, the text is read as a script, one `Name: line` per turn, and each turn goes to 3.8 as its own text block or part with the speaker in `speech_metadata`, since 3.8 rejects speaker labels in the text. `gemini-3.1-flash-tts-preview` keeps receiving the text as written, since it rejects that metadata. Streamed audio stays raw PCM (`audio/l16`, 24 kHz).
- `@google/genai` is required at 2.24 or later, the first release whose generateContent parts carry `speechMetadata`.
- `list_supported_models` lists the new models, with official prices: `claude-fable-5-1` $10 / $50 per million tokens with cache reads at $0.25, `claude-opus-5-5` $4 / $20 with cache reads at $0.20, `claude-sonnet-5-5` $2 / $10 with cache reads at $0.20, `gpt-6.1-sol` $2 input, $2.50 cache writes, $10 output and $0.10 cached input, `deepseek-flash` ¥1 / ¥4 off-peak with cache hits at ¥0.02 (replacing the announced `deepseek-v4.1-flash` entry), plus `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-lite-image`, and OpenRouter's `anthropic/claude-opus-5.5`, `anthropic/claude-sonnet-5.5`, `anthropic/claude-fable-5.1`, `openai/gpt-6.1-sol` and `deepseek/deepseek-v4.1-flash`.
- The end-to-end tests run `claude-sonnet-5-5`, `gpt-6.1-sol`, `deepseek-flash` and `gemini-3.8-flash-tts` in place of `claude-sonnet-5`, `gpt-5.6-luna`, the V4 Flash ids and `gemini-3.1-flash-tts-preview`; Vertex AI keeps `gemini-3.1-flash-tts-preview`, as it does not serve 3.8 TTS.
- `llmsdk_docs/claude5_1/` and `llmsdk_docs/claude5_5/` hold the new Claude documentation; `gpt6/`, `deepseek_v4/` and `gemini3_8/` gained the GPT-6.1 Sol, DeepSeek model and price, and Gemini 3.8 TTS pages. The README, the site and the skills list the new models.
