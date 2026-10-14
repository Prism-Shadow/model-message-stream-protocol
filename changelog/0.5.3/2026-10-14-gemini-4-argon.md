# Gemini 4 Argon support

- **Date:** 2026-10-14
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `registry`, `tests`, `llmsdk_docs`

[中文版](2026-10-14-gemini-4-argon.zh.md)

## What changed

- `gemini-4-argon` was added to the Python and TypeScript registries with text,
  image, video, and audio input, text output, and a shared 1,048,576-token context window.
- `google-official` and `google-genai` mapped `NONE` to `low`, preserved `LOW`,
  `MEDIUM`, and `HIGH`, and mapped `XHIGH`/`MAX` to `high` for Argon. An omitted
  thinking level retained the API default of `medium`.
- `gemini-4-argon` replaced `gemini-3.8-flash` in the shared Gemini API test entries
  for both clients. The existing Vertex AI entries were retained.
- `llmsdk_docs/gemini4/` captured the official model, Interactions API, thinking,
  function-calling, streaming, pricing, and long-decode documentation.

## Registry metadata

Standard list prices per million tokens were recorded as $4 input, $20
output/thinking, and $0.20 cached input. Introductory prices through 2026-11-30
($2, $10, and $0.10) were excluded under the registry's list-price convention.

## Output limits

Synchronous streaming supports up to 65,536 output tokens, including thinking.
Longer outputs require Google's stored background execution, outside MMSP's
stateless streaming interface. Argon supports implicit caching only.
