# OpenRouter Media APIs Documentation

OpenRouter's image generation, text-to-speech and speech-to-text APIs under `https://openrouter.ai/api/v1`, with the records of `bytedance-seed/seedream-5-0-flash`, `fish-audio/drama-3` and `fish-audio/transcribe-1`.

## Documentation

- [image-generation.md](./docs/image-generation.md) - The Image API guide: `POST /api/v1/images` with `model` and `prompt`, `resolution` / `aspect_ratio` / `size` (a tier or explicit pixels), `quality`, `output_format`, `n`, `input_references`, `provider`; the response (`data[].b64_json`, `media_type`, `usage` with `cost`); the SSE events for models with `supports_streaming`; all-or-nothing billing; the image models discovery API
- [images-api-reference.md](./docs/images-api-reference.md) - OpenAPI for `POST /images`: `ImageGenerationRequest`, `ImageGenerationResponse`, `ImageGenerationUsage`, the streaming events and the error responses
- [chat-completions-image-output.md](./docs/chat-completions-image-output.md) - The Chat Completions fields for media: `modalities`, `image_config`, `message.images` (`ChatAssistantImages`), `ChatStreamDelta`, `ChatAudioOutput`, `input_audio` content parts, `ChatUsage`
- [tts.md](./docs/tts.md) - The TTS guide: `POST /api/v1/audio/speech` (OpenAI Audio Speech format) with `input` (a string or a list of turns), `voice`, `instructions`, `response_format` (`mp3` or `pcm`, default `pcm`), `speed`, `input_references`; a raw audio byte stream with `X-Generation-Id`; Fish Audio and Gemini specifics
- [tts-api-reference.md](./docs/tts-api-reference.md) - OpenAPI for `POST /audio/speech`: `SpeechRequest` and the error responses
- [stt.md](./docs/stt.md) - The STT guide: `POST /api/v1/audio/transcriptions` with JSON `input_audio` (`data` as raw base64, `format`) or OpenAI multipart `file`; `language`, `temperature`, `response_format` (`json` or `verbose_json`); the response `text` and `usage` (`seconds`, tokens, `cost`); formats and limits
- [stt-api-reference.md](./docs/stt-api-reference.md) - OpenAPI for `POST /audio/transcriptions`
- [errors-and-debugging.md](./docs/errors-and-debugging.md) - Error codes, provider errors, pre-stream and mid-stream error formats, typed error codes
- [model-records.md](./docs/model-records.md) - The three models from the public models APIs: request paths, prices ($0.018 per image; $2 per M UTF-8 bytes; $0.0001 per second), Seedream's `resolution` (`1K`, `2K`) and `aspect_ratio` enums, `n` fixed at 1, no streaming
- [fish-audio-drama-3.md](./docs/fish-audio-drama-3.md) - Fish Audio's page for Drama 3: bracketed directions, multi-speaker tags, and three public voice ids (Adrian, Delia, Sheila) to pass as `voice`
- [fish-audio-speech-to-text.md](./docs/fish-audio-speech-to-text.md) - Fish Audio's STT page: `transcribe-1` takes WAV, MP3, AAC/M4A, FLAC and Ogg up to 50 MiB

## Notes

Captured 2026-11-04 (`api_captures/openrouter_images/`, `openrouter_tts/`, `openrouter_stt/`, git-ignored):

- `POST /api/v1/images/generations` answers like `POST /api/v1/images`, so an OpenAI Images request with `prompt` and `size` (`1024x1024`, `2048x1152`) works. Seedream returns a JPEG as `b64_json` with `media_type: "image/jpeg"`. `usage` is `prompt_tokens`, `completion_tokens` (the pixels / 256, here 4096 or 9216), `total_tokens`, `cost` (0.018 whatever the size) and details. `stream: true` on this non-streaming model is ignored, and the reply is the same JSON. A `size` that conflicts with `aspect_ratio` is a 400.
- Chat Completions with `modalities: ["image"]` and `image_config` also generates. The first chunk carries `delta.images[]` as `{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}` beside `content: ""`, then a `finish_reason: "stop"` chunk, then the usage chunk, then `[DONE]`. Without a size, it rendered 2048x2048.
- TTS works without `voice` (Fish's default voice). `pcm` arrives as `Content-Type: audio/pcm;rate=44100;channels=1` (16-bit little-endian mono) and `mp3` as `audio/mpeg`. The bytes stream as they are made, with the first after about 0.7 s. The response carries no usage. `GET /api/v1/generation?id=<X-Generation-Id>` reports `total_cost` (69 bytes cost $0.000138). An unknown voice is a bare `400 Provider returned 400`, and a `response_format` other than `mp3` or `pcm` is a 400 validation error.
- STT answers `{"text", "usage": {"seconds", "cost"}}` (8 s, $0.0008 for 7.6 s of audio) to JSON `input_audio` (MP3 or WAV) and to multipart alike. `stream: true` is ignored.
