# Gemini Nano Banana 2.1

- **Date:** 2026-11-19
- **Type:** feature
- **Scope:** `google-official`, `google-genai`, `registry`

[中文版](2026-11-19-gemini-nano-banana-2-1.zh.md)

## What changed

- `google-official` and `google-genai` mapped `ThinkingLevel` for `"gemini-nano-banana"` models onto their supported levels `("minimal", "medium", "high")`, sending `"minimal"` on `none`, `"medium"` on `low` and `medium` (ties round up), and `"high"` on `high`, `xhigh` and `max`, since `gemini-nano-banana-2.1` refuses `low`, `xhigh` and `max`.
- The registry listed `gemini-nano-banana-2.1` on the Gemini API through `google-official` (Text, Image and Video in, Image out, 131,072-token context, $1.50 prompt, $7.50 thoughts and $30.00 response per 1M tokens) and `google/gemini-nano-banana-2.1` on OpenRouter through `openai-image` (Text in, Image out, $1.50 prompt and $30.00 response per 1M tokens). The registry holds 370 entries.
- The shared test catalog tested `gemini-nano-banana-2.1` on `google-official` in place of `gemini-3.1-flash-image`, and the playground's model quick-picks listed `gemini-nano-banana-2.1` in place of `gemini-3.1-flash-image`.
- `llmsdk_docs/gemini_interactions/` added the Gemini Nano Banana 2.1 model page and updated the image generation guide, and `llmsdk_docs/openrouter_media/` added the OpenRouter endpoint record for `google/gemini-nano-banana-2.1`.
