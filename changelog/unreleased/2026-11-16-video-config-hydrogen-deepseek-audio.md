# Video settings, image resolution, DeepSeek speech and transcription, and Gemini 4 Hydrogen

- **Date:** 2026-11-16
- **Type:** feature
- **Scope:** `types`, `google_official`, `deepseek_speech`, `deepseek_transcription`, `registry`
- **PR:** [#PR](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/PR)
- **Breaking:** yes — `image_config`'s `image_size` was renamed `resolution`, and the `ImageSize` type `ImageResolution`

[中文版](2026-11-16-video-config-hydrogen-deepseek-audio.zh.md)

## What changed

- `UniConfig` gained `video_config` (`VideoConfig`: `aspect_ratio`, `resolution` of `360p`, `720p`, `1080p` or `4K`, and `duration` in whole seconds), as [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) §6.2 and §6.4 specify. `google-official` sent it to Gemini Omni as one `video` entry of `response_format`, `4K` as Google's `4k` and the duration as `"<n>s"`, only the fields given; it raised `UnsupportedParameterError` for `video_config` on every other model, and every other client ignored it.
- `ImageConfig`'s `image_size` became `resolution` in both packages, and the `ImageSize` type `ImageResolution`. `google-official` and `google-genai` sent it as Gemini's `image_size`, and `openai-image` read its size table by it.
- `google-official` served `gemini-4-hydrogen`: `low`, `medium`, `high` and `xhigh` thinking, with `none` run at `low` and `max` at `xhigh`; Gemini 4 Carbon, Argon and the 3.x models kept running `xhigh` and `max` at `high`.
- `deepseek-speech` streamed DeepSeek's text-to-speech (`POST /v1/tools/tts`) in both packages: one request per message with the message's text, `format: "pcm"`, and `voice_id` from a one-entry `tts_config`; each chunk went out as it arrived, as `inline_data` of one item, `audio/l16; rate=24000; channels=1`. `prompt_tokens` counted DeepSeek's billable characters, a Han character as 2 and any other as 1.
- `deepseek-transcription` sent DeepSeek's recognition (`POST /v1/tools/asr`) a multipart form holding only the `file`, the message's one audio item, PCM wrapped as WAV; the text went out as one `text` item, and `prompt_tokens` was `duration_ms` in whole seconds, rounded up.
- `deepseek-official` served `deepseek-tts` through `deepseek-speech` and `deepseek-asr` through `deepseek-transcription`, as [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md) §3 specifies; both client types read `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL`.
- The registry listed `gemini-4-hydrogen`, `deepseek-tts` and `deepseek-asr` (353 to 356 entries).
- `.github/ci/models.json` tested `gemini-4-hydrogen` in place of `gemini-3.8-flash` under `google-official`, and gained `deepseek-tts` under `deepseek-speech` and `deepseek-asr` under `deepseek-transcription`. The shared video test sent `video_config` (9:16, 360p, 3 seconds), the image test sent `resolution`, and the transcription test sent whisper.cpp's `jfk.wav` as `audio/wav` in place of Whisper's `jfk.flac`, in both e2e suites; the Model Index's transcription programs sent the same file.
- `llmsdk_docs/gemini4/` snapshotted Gemini 4 Hydrogen's pages and refreshed the latest-model, pricing, deprecations and thinking pages; `llmsdk_docs/gemini_omni/` recorded the video settings the live API takes; `llmsdk_docs/deepseek_audio/` snapshotted DeepSeek's speech and recognition guides.

## Configuration behavior

| Key | Gemini Omni on `google-official` | `deepseek-speech` | `deepseek-transcription` |
| --- | --- | --- | --- |
| `video_config` | `response_format: [{"type": "video", ...}]` | ignored | ignored |
| `tts_config` | ignored | one entry's `voice` as `voice_id`; none sends no `voice_id`; two or more raise | ignored |
| `fast_mode` | raises | raises | raises |
| `thinking_level` | `low` or `high` | ignored | ignored |

## Registry metadata

| Model | Base URL | Client | Input | Output | Context | Pricing per 1M |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-4-hydrogen` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image, Video, Audio | Text | 1,048,576 | $1.50 prompt, $7.50 response, $0.075 cached |
| `deepseek-tts` | `https://api.deepseek.com` | `deepseek-official` | Text | Audio | — | ¥300 per million billable characters (¥3 per 10,000) |
| `deepseek-asr` | `https://api.deepseek.com` | `deepseek-official` | Audio | Text | — | ¥216.666667 per million seconds (¥0.78 per hour) |

## Compatibility

- Rename `image_size` to `resolution` in every `image_config`, with the same values (`1K`, `2K`), and `ImageSize` to `ImageResolution` in TypeScript imports. An `image_config` that still carries `image_size` has no resolution: Gemini and `openai-image` make the default size.
