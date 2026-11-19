# OpenAI Images and Audio Transcription API Documentation

OpenAI's Image API (`POST /v1/images/generations`) for the GPT Image 2.6 and 2.5 models (`gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, `gpt-image-2.5-sunburst`, `gpt-image-2.5-flare`), Audio Transcriptions API (`POST /v1/audio/transcriptions`) for `gpt-transcribe`, and TokenDance's OpenAI-format gateway for image generation.

## Documentation

- [images-generate.md](./docs/images-generate.md) - `POST /v1/images/generations` reference: `model`, `prompt`, `size` (`auto` default; any `WIDTHxHEIGHT` on GPT Image 2, 2.5 and 2.6), `quality`, `output_format` (`png` default), `background`, `n`, `stream`, `partial_images` (0 to 3, default 0); the `ImagesResponse` (`data[].b64_json`, `size`, `quality`, `output_format`, `usage`); `response_format` is legacy and unsupported on GPT Image models
- [image-generation-streaming-events.md](./docs/image-generation-streaming-events.md) - The two SSE events, `image_generation.partial_image` and `image_generation.completed` (the final `b64_json` plus `usage`)
- [gpt-image-2.6-sunburst.md](./docs/gpt-image-2.6-sunburst.md) - GPT-Image-2.6 Sunburst: text and image in, image out, $5 / $8 / $30 per M text-input / image-input / image-output tokens ($1.25 / $2 cached)
- [gpt-image-2.6-flare.md](./docs/gpt-image-2.6-flare.md) - GPT-Image-2.6 Flare: text and image in, image out, $5 / $8 / $30 per M text-input / image-input / image-output tokens ($1.25 / $2 cached)
- [gpt-image-2.5-sunburst.md](./docs/gpt-image-2.5-sunburst.md) - GPT-Image-2.5 Sunburst: text and image in, image out, $5 / $8 / $30 per M text-input / image-input / image-output tokens ($1.25 / $2 cached)
- [gpt-image-2.5-flare.md](./docs/gpt-image-2.5-flare.md) - GPT-Image-2.5 Flare: text and image in, image out, Image generation and Image edit endpoints only, $5 / $8 / $30 per M text-input / image-input / image-output tokens
- [gpt-transcribe.md](./docs/gpt-transcribe.md) - GPT-Transcribe (`gpt-transcribe`): speech-to-text on `POST /v1/audio/transcriptions`, $0.0045 per minute ($0.000075 per second)
- [image-generation-guide.md](./docs/image-generation-guide.md) - The Image API parts of the guide: generating, streaming partial images, size rules (multiples of 16, 1:3 to 3:1, 655,360 to 8,294,400 pixels, longest edge 3840), output format, `image_generation_user_error` and `moderation_blocked`, costs (100 extra output tokens per partial image)
- [error-codes.md](./docs/error-codes.md) - The API error table
- [tokendance-seedream-5.0-lite.zh.md](./docs/tokendance-seedream-5.0-lite.zh.md) - TokenDance's `seedream-5.0-lite` at `https://tokendance.space/gateway/v1/images/generations` (`openai:image-generations` and `ark:image-generations` protocols, ¥0.22 per image), with TokenDance's Seedream guide for `size`, `response_format`, streaming events and usage

## Notes

Captured 2026-11-04 and 2026-11-19 (`api_captures/openai_images/`, `api_captures/openai_stt/`, `api_captures/tokendance_images/`, git-ignored):

- OpenAI returns PNG as `b64_json` and adds an undocumented `data[].generation_id`. Omitting `quality` resolves it to `low`, and omitting `size` gave `1254x1254` on 2.5 and `1216x1216` on 2.6. `stream: true` without `partial_images` sends a single `image_generation.completed` event with `sequence_number` 0 and no `[DONE]`. `usage` is `input_tokens` (text), `output_tokens` (image) and their `*_details`. `response_format` is rejected with `unknown_parameter`. A bad `size` is a 400 `image_generation_user_error` with `code: invalid_value` and the rule it broke.
- `gpt-transcribe` on `POST /v1/audio/transcriptions` accepts multipart `file` and `model` and answers `{"text": "...", "usage": {"type": "duration", "seconds": 1}}`.
- TokenDance answers in the same envelope, with `model` (the upstream `doubao-seedream-5-0-260128`) and `data[].size`. It returns a 24-hour `url` to a JPEG unless `response_format: "b64_json"` is sent. Its `usage` is `generated_images`, `output_tokens` and `total_tokens`. `seedream-5.0-lite` needs at least 3,686,400 pixels, so 2048x2048 is its default and smallest square, and `size` also takes `2k`, `3k` or `4k`. `stream: true` sends Ark's events: `image_generation.partial_succeeded` (the `url`, `image_index`, `size`), then `image_generation.completed` with only the usage, then `[DONE]`.
