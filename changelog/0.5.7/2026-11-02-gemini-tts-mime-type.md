# Gemini TTS audio streamed through Interactions named as audio/l16 again

- **Date:** 2026-11-02
- **Type:** fix
- **Scope:** `google_official`, `tests`, `llmsdk_docs`
- **PR:** [#311](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/311)

[中文版](2026-11-02-gemini-tts-mime-type.zh.md)

## What changed

- `google-official`: an Interactions `audio` delta without a `mime_type` became an `inline_data` item of `audio/l16; rate=<sample_rate>; channels=<channels>`, the documented streaming default of headerless 16-bit PCM. From 2026-11-02 the API stopped sending `mime_type` on streamed audio deltas for `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` and `gemini-3.1-flash-tts-preview`, and the item had read `None; rate=24000; channels=1` in Python and `undefined; rate=24000; channels=1` in TypeScript. A delta that names its `mime_type` keeps it.
- Tests: an offline case in `test_unknown_events.py` and `unknown-events.test.ts` streamed audio deltas without a `mime_type` and checked each delta and the done item for `audio/l16; rate=24000; channels=1`.
- `llmsdk_docs/gemini_interactions`: `speech-generation.md` was re-snapshotted from the official page on 2026-11-02 (per-turn `speech_metadata`, audio output formats, the Gemini 3.8 TTS models), and the README recorded the audio delta without `mime_type`.
