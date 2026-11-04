# OpenAI Images API Documentation

OpenAI's Image API (`POST /v1/images/generations`) for the GPT Image models, `gpt-image-2.5-flare` among them, and TokenDance's OpenAI-format gateway for the same endpoint.

## Documentation

- [images-generate.md](./docs/images-generate.md) - `POST /v1/images/generations` reference: `model`, `prompt`, `size` (`auto` default; any `WIDTHxHEIGHT` on GPT Image 2 and 2.5), `quality`, `output_format` (`png` default), `background`, `n`, `stream`, `partial_images` (0 to 3, default 0); the `ImagesResponse` (`data[].b64_json`, `size`, `quality`, `output_format`, `usage`); `response_format` is legacy and unsupported on GPT Image models
- [image-generation-streaming-events.md](./docs/image-generation-streaming-events.md) - The two SSE events, `image_generation.partial_image` and `image_generation.completed` (the final `b64_json` plus `usage`)
- [gpt-image-2.5-flare.md](./docs/gpt-image-2.5-flare.md) - The model page: text and image in, image out, Image generation and Image edit endpoints only, $5 / $8 / $30 per M text-input / image-input / image-output tokens
- [image-generation-guide.md](./docs/image-generation-guide.md) - The Image API parts of the guide: generating, streaming partial images, size rules (multiples of 16, 1:3 to 3:1, 655,360 to 8,294,400 pixels, longest edge 3840), output format, `image_generation_user_error` and `moderation_blocked`, costs (100 extra output tokens per partial image)
- [error-codes.md](./docs/error-codes.md) - The API error table
- [tokendance-seedream-5.0-lite.zh.md](./docs/tokendance-seedream-5.0-lite.zh.md) - TokenDance's `seedream-5.0-lite` at `https://tokendance.space/gateway/v1/images/generations` (`openai:image-generations` and `ark:image-generations` protocols, ¥0.22 per image), with TokenDance's Seedream guide for `size`, `response_format`, streaming events and usage

## Notes

Captured 2026-11-04 with prompt and `size` only (`api_captures/openai_images/`, `api_captures/tokendance_images/`, git-ignored):

- OpenAI returns PNG as `b64_json` and adds an undocumented `data[].generation_id`. Omitting `quality` resolves it to `low`, and omitting `size` gave `1254x1254`. `stream: true` without `partial_images` sends a single `image_generation.completed` event with `sequence_number` 0 and no `[DONE]`. `usage` is `input_tokens` (text), `output_tokens` (image) and their `*_details`. `response_format` is rejected with `unknown_parameter`. A bad `size` is a 400 `image_generation_user_error` with `code: invalid_value` and the rule it broke.
- TokenDance answers in the same envelope, with `model` (the upstream `doubao-seedream-5-0-260128`) and `data[].size`. It returns a 24-hour `url` to a JPEG unless `response_format: "b64_json"` is sent. Its `usage` is `generated_images`, `output_tokens` and `total_tokens`. `seedream-5.0-lite` needs at least 3,686,400 pixels, so 2048x2048 is its default and smallest square, and `size` also takes `2k`, `3k` or `4k`. `stream: true` sends Ark's events: `image_generation.partial_succeeded` (the `url`, `image_index`, `size`), then `image_generation.completed` with only the usage, then `[DONE]`.
