# An empty tts_config on the TypeScript Google clients

- **Date:** 2026-11-20
- **Type:** fix
- **Scope:** `google-official`, `google-genai`, `tests`

[中文版](2026-11-20-empty-tts-config-parity.zh.md)

## What changed

- `google-official` and `google-genai` in TypeScript treated `tts_config: []` as unset and spoke in `Kore`, as the Python clients, `openai-speech` and `deepseek-speech` did; they had raised `UnsupportedParameterError` ("Gemini TTS does not support 0 speakers").
- Parameterized offline tests checked that an absent, null and empty `tts_config` speak in `Kore` on both Google clients (`test_request_body.py` / `request-body.test.ts`), and that `openai-speech` and `deepseek-speech` send no voice for them (`test_media_clients.py` / `media-clients.test.ts`).
