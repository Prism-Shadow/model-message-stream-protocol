# Unreleased

[中文版](README.zh.md)

- [2026-11-16] MMSP-RFC-0002 Message Protocol, MMSP-RFC-0003 Message Requests and MMSP-RFC-0005 Client Routing, edited in place, took in whole PCM frames in every audio fragment, a video's settings, the image's resolution, DeepSeek's speech and transcription, and Gemini 4 Hydrogen: `video_config` (aspect ratio, resolution, duration) as a `video` entry of Gemini Omni's `response_format`, `image_config`'s `image_size` renamed `resolution`, `deepseek-speech` streaming raw PCM with `tts_config` as `voice_id` and `deepseek-transcription` uploading the file alone, with their usage, `deepseek-official` serving `deepseek-tts` and `deepseek-asr` through them, and Hydrogen's `xhigh`. ([details](2026-11-16-video-config-deepseek-audio-rfcs.md), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330))
