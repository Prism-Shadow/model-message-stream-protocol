# MMSP-RFC-0003 and MMSP-RFC-0005 took in video settings, image resolution, DeepSeek's speech and transcription, and Gemini 4 Hydrogen

- **Date:** 2026-11-16
- **Type:** process
- **Scope:** `design`
- **PR:** [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)

[中文版](2026-11-16-video-config-deepseek-audio-rfcs.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §3.2 added `deepseek-speech`, which asks for raw PCM and yields each chunk as it arrives, and `deepseek-transcription`, which uploads the file alone, with their usage: DeepSeek's billable characters, a Han character counting 2, and the audio's `duration_ms` in whole seconds. §6.2 sent `video_config` to Gemini Omni only. §6.3 ran `xhigh` as it is and `max` at `xhigh` on Gemini 4 Hydrogen, and listed the two DeepSeek clients among the models that do not think. §6.4 renamed `image_config`'s `image_size` to `resolution`, Gemini's `image_size` on both Google clients, sent `tts_config` as `voice_id` on `deepseek-speech`, and mapped `video_config` onto a `video` entry of Gemini Omni's `response_format`, its `duration` as `"<n>s"` and `4K` as `4k`.
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md) Client Routing, edited in place in both languages, with the case added to its Introduction. §3 had `deepseek-official` serve `deepseek-tts` through `deepseek-speech` and `deepseek-asr` through `deepseek-transcription`.
