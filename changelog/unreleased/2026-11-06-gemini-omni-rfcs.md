# MMSP-RFC-0002 and MMSP-RFC-0003 took in Gemini Omni's video

- **Date:** 2026-11-06
- **Type:** process
- **Scope:** `design`
- **PR:** [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)

[中文版](2026-11-06-gemini-omni-rfcs.zh.md)

## What changed

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) Message Protocol, edited in place in both languages, with the case added to its Introduction. §3.4 named the media an `inline_data` item carries (an image, audio or a video), an image or a video as one fragment to an item and audio as the fragments of one item, and a video delivered by URI as a `text` item holding the URI.
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §6.1 listed the `gemini-omni` marker; §6.2 stated that `max_tokens` is not sent to Gemini Omni, whose video tokens count against `max_output_tokens`; §6.3 ran `medium` at `high` on Gemini Omni, which takes only `low` and `high`.
