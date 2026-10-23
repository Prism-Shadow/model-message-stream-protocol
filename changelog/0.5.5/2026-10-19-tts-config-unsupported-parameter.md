# tts_config rejections raise UnsupportedParameterError

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `google_genai`, `google_official`, `tests`
- **PR:** [#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)

[中文版](2026-10-19-tts-config-unsupported-parameter.zh.md)

## What changed

- `tts_config`: on a Gemini TTS model, `google-official` and `google-genai` refused a speaker list of other than one or two entries, or two entries without a `speaker` on each, with a bare `ValueError` in Python and `Error` in TypeScript. They raise `UnsupportedParameterError` instead, with `parameter` set to `tts_config` and `client` to the client class, before the request is sent. In Python it is still a `ValueError`.
- The messages changed from `tts_config must contain 1 or 2 entries.` to `Gemini TTS does not support <n> speakers; tts_config takes 1 or 2 entries.`, and from `speaker is required when tts_config has 2 entries.` to `Gemini TTS does not support a two-speaker tts_config without a speaker on each entry.`, the same in both languages.
- Added an offline test that sends both shapes, three entries and two entries with one `speaker` missing, through `google-official` and `google-genai` in Python and TypeScript, and checks for `UnsupportedParameterError` with `parameter` `tts_config`.
