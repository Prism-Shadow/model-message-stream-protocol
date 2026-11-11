# Gemini Omni video generation on google-official

- **Date:** 2026-11-06
- **Type:** feature
- **Scope:** `google_official`, `stream_items`, `registry`, `integration`, `site`
- **PR:** [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)

[中文版](2026-11-06-gemini-omni.zh.md)

## What changed

- `google-official` streamed Gemini Omni's video (`gemini-omni-1.2-flash`, and `gemini-omni-1.1-flash` until Google routes it to 1.2 on 2026-12-03) in both packages: an Interactions `video` delta with `data` became one `inline_data` item, `video/mp4` unless the delta names another MIME type, and one with a `uri` became a `text` item holding the URI. Before, the client dropped the video delta and the stream ended in `EmptyResponseError`.
- The request kept Google's defaults (16:9, 720p, 10 seconds, the video inline), streamed and not stored, with no `response_format`; only the newest message went out, its text and images, as for TTS models.
- `StreamItems` began a new item at every `inline_data` delta with a `video/*` MIME type, as at an image.
- The registry listed `gemini-omni-1.2-flash` on the Gemini API (352 to 353 entries), and `_usd()` / `usd()` took an optional thoughts price, leaving every other row's prices unchanged. `/models.json` wrote a row's `thoughts_tokens` where it differs from `response_tokens`.
- The Model Index showed the Video output with Lucide's `video` icon, and a video row's programs write `video.mp4`. The playground and the tracer, in both servers, played a `video/*` `inline_data` item in a `<video controls>` element, and the tracer labeled it `Inline Video`.
- `.github/ci/models.json` gained `gemini-omni-1.2-flash` under `google-official`, marked slow, with a new `support_video_generation` capability and a shared video test in both e2e suites. `llmsdk_docs/gemini_omni/` snapshotted the Omni guide, the model page, its prices, the Interactions API reference, the Files API and the API errors.

## Configuration behavior

| Key | Gemini Omni on `google-official` |
| --- | --- |
| `max_tokens` | not sent |
| `thinking_level` | `none`, `low` → `low`; `medium`, `high`, `xhigh`, `max` → `high` |
| `thinking_summary` | `thinking_summaries`, as on other Gemini models |
| `system_prompt` | `system_instruction` |
| `tools`, `tool_choice`, `image_config`, `fast_mode` | raises `UnsupportedParameterError` |
| `temperature` | raises, as on every Gemini model |

The default video bills 57,920 video output tokens; the usage maps as on other Gemini models, the video tokens in `response_tokens`.

## Registry metadata

| Model | Base URL | Client | Input | Output | Context | Pricing per 1M tokens |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-omni-1.2-flash` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image | Video | 131,072 | $1.50 prompt, $9.00 thoughts, $12.00 response (video) |
