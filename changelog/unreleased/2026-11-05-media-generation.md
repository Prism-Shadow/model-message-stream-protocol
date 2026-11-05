# Image generation, speech and transcription

- **Date:** 2026-11-05
- **Type:** feature
- **Scope:** `openai_image`, `openai_speech`, `openai_transcription`, `registry`, `integration`
- **PR:** [#IMPLPR](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/IMPLPR)

[中文版](2026-11-05-media-generation.zh.md)

## What changed

- Implemented the media parts of [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md), [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md), [MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.md) and [MMSP-RFC-0007](../../design/rfcs/MMSP-RFC-0007-error-types.md), as amended in [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316).
- Three compatible clients, in Python and TypeScript, on the OpenAI SDK with the `OPENAI_API_KEY` / `OPENAI_BASE_URL` row: `openai-image` (`OpenaiImageClient`, `POST /images/generations`), `openai-speech` (`OpenaiSpeechClient`, `POST /audio/speech`) and `openai-transcription` (`OpenaiTranscriptionClient`, `POST /audio/transcriptions`). Each message was one request; `list_models` listed the endpoint's `/models`.
- `openai-image` read each answer's JSON, never asking for a stream or sending `response_format`. Each image went out as one `inline_data` item: its `b64_json` decoded, or its `url` downloaded through a client of its own with no key, no default headers and nothing of OpenAI's environment. A download answered with an HTTP error raised `ProviderStreamError` with the status as its `code`. The MIME type came from `media_type`, else `image/<output_format>`, else the bytes (PNG, WebP, GIF, otherwise JPEG).
- `openai-speech` streamed the response's bytes as `inline_data` chunks of one item per message, headerless `audio/pcm;rate=44100;channels=1` named `audio/l16; rate=44100; channels=1`, any other format under its `content-type`. It sent no `response_format`.
- `openai-transcription` uploaded each message's one audio `inline_data.done` in OpenAI's multipart form (`file`, `model`, no `prompt`), the file named `audio.<extension>` by its MIME type; headerless PCM (`audio/l16`, `audio/pcm`) went as WAV built from its `rate` and `channels`. A message with text, an image or a second audio item, or PCM without a `rate`, raised before the request.
- Routing: `openai-official` served `gpt-image-*` through `openai-image`, named or deduced.
- The playground's attach button took audio files too, sent as `inline_data.done` with base64 `data`, which both servers' `/api/chat` decoded into bytes; the user's bubble played the clip. The playground and server pages labelled the three client types. The tracer wrapped PCM as WAV of the rate and channels its MIME type named, 24 kHz mono without them.
- `.github/ci/models.json` gained the `openai-image` group (`gpt-image-2.5-flare`, and `bytedance-seed/seedream-5-0-flash` on OpenRouter and `seedream-5.0-lite` on TokenDance as slow cases), `openai-speech` (`fish-audio/drama-3`) and `openai-transcription` (`fish-audio/transcribe-1`). The shared e2e tests gained `support_transcription` and a transcription case reading Whisper's `jfk.flac`, skipped transcription models in Python's concat case, asked the image case for `image_size: "2K"` and sent the single-speaker speech case no `tts_config`.
- The registry grew from 353 to 358 entries, below. The Model Index's kits asked image rows for 2K, told a speech row to play its PCM at the rate and channels of the MIME type the program prints, and gave a transcription row a program that downloads `jfk.flac` and prints its text, and a Server tab that writes the base64 request to `request.json`. `VENDORS` gained Fish Audio and filed `seedream-` under ByteDance Seed. `/models/` went from 1,204,979 to 1,221,118 bytes (56,258 to 56,974 gzipped), `/zh/models/` from 1,217,675 to 1,233,948 (57,140 to 57,871), and the catalog script from 16,543 to 17,629 (6,814 to 7,158).
- Docs: the configuration, models, streaming and errors pages, the README, both package READMEs, `skills/`, and the dev skill named the three clients.

## Configuration behavior

| `UniConfig` | `openai-image` | `openai-speech` | `openai-transcription` |
| --- | --- | --- | --- |
| `image_config` | `size` from the table below; 1K without `image_size`, 1:1 without `aspect_ratio`, no `size` without either | ignored | ignored |
| `tts_config` | ignored | one entry's `voice`; none without it; two or more raise | ignored |
| `fast_mode: true` | raises | raises | raises |
| `thinking_level` and every other key | ignored | ignored | ignored |

| `aspect_ratio` | `1K` | `2K` |
| --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` |
| `2:3` | `848x1264` | `1696x2528` |
| `3:2` | `1264x848` | `2528x1696` |
| `3:4` | `896x1200` | `1792x2400` |
| `4:3` | `1200x896` | `2400x1792` |
| `9:16` | `768x1376` | `1536x2752` |
| `16:9` | `1376x768` | `2752x1536` |
| `21:9` | `1584x672` | `3168x1344` |

## Usage

| Client | `prompt_tokens` | `response_tokens` |
| --- | --- | --- |
| `openai-image` | `input_tokens` (OpenAI) or `prompt_tokens` (OpenRouter); `None` where neither is reported (TokenDance) | `output_tokens` (OpenAI, TokenDance) or `completion_tokens` (OpenRouter) |
| `openai-speech` | the input's UTF-8 bytes | 0 |
| `openai-transcription` | `usage.seconds`, rounded up | 0 |

Each count is summed over the requests; `finish_reason` is `stop`.

## Registry metadata

| Model | Base URL | Client | Input → output | Price per 1M prompt / response |
| --- | --- | --- | --- | --- |
| `gpt-image-2.5-flare` | `https://api.openai.com/v1` | `openai-official`, served through `openai-image` | Text → Image | $5 / $30, cached $1.25 |
| `bytedance-seed/seedream-5-0-flash` | `https://openrouter.ai/api/v1` | `openai-image` | Text → Image | $0 / $4.311377 |
| `fish-audio/drama-3` | `https://openrouter.ai/api/v1` | `openai-speech` | Text → Audio | $10 / $0 |
| `fish-audio/transcribe-1` | `https://openrouter.ai/api/v1` | `openai-transcription` | Audio → Text | $100 / $0 |
| `seedream-5.0-lite` | `https://tokendance.space/gateway/v1` | `openai-image` | Text → Image | ¥0 / ¥13.427734 |

- **gpt-image-2.5-flare**: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare (read 2026-11-04): $5 per million text input tokens, $1.25 cached, $30 per million image output tokens.
- **seedream-5-0-flash**: $0.018 per image whatever its size (OpenRouter's model page and `/api/v1/images/models`, read 2026-11-04); the stored rate is the `image_output` price the models API quotes, about $0.018 for a 1K image (4,096 tokens) and four times that for a 2K one (16,384).
- **drama-3**: prompt tokens are the input's UTF-8 bytes, $10 per million, the undiscounted price; the endpoint ran an 80% launch discount ($2) on 2026-11-04.
- **transcribe-1**: prompt tokens are the audio's seconds, $0.0001 a second (read 2026-11-04).
- **seedream-5.0-lite**: ¥0.22 per image (TokenDance's `items` rate, read 2026-11-04), stored over the 16,384 output tokens of a 2048x2048 image, its default and smallest square.
