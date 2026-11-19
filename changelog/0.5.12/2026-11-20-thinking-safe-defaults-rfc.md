# MMSP-RFC-0003 made the minimum safe subset the official clients' thinking default, and MMSP-RFC-0005 routed `gpt-transcribe`

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`
- **PR:** [#356](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/356)

[中文版](2026-11-20-thinking-safe-defaults-rfc.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the cases added to its history table:
  - §6.1 had an official client's thinking branch that no marker matches send the minimum safe subset, what every thinking model of the vendor's newest generation accepts: `low`/`medium`/`high` on Gemini; `low` for `none` on GPT, Claude and MiniMax; forced thinking with `low`/`high`/`max` on GLM. Every generation still served that takes something else is matched explicitly, and thinking-level markers are matched on the lowercased id. `-pro` left the list of markers, and the `gemini` plugin on `openai-speech` joined the plugins, sending `voice: "Kore"` when `tts_config` is unset or empty.
  - §6.3 added Gemini 4 Neon's `xhigh`, Gemini 2.5's `low`/`high` on `google-official` and no level on `google-genai`, `disabled` on Claude 4.5 through Opus 5 and Sonnet 5, and `none` on GPT-5.1 to GPT-5.6.
  - §6.4's `tts_config` row covered the Google clients and read an empty `tts_config` as unset: the Google clients and the `gemini` plugin send `"Kore"`, and the other speech clients send no voice.
  - The history row of [#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349) named §6.1 alone, the one section that PR amended.
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md) Client Routing, edited in place in both languages: §3 routed the whole id `gpt-transcribe` on `openai-official` to `openai-transcription`.
