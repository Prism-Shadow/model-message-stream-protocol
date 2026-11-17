# DeepSeek Audio Documentation

DeepSeek's text to speech and speech to text APIs, which the `deepseek-speech` and `deepseek-transcription` clients serve as `deepseek-tts` and `deepseek-asr`.

## Documentation

- [tts-guide.zh.md](./docs/tts-guide.zh.md) / [tts-guide.md](./docs/tts-guide.md) - Text to speech: `POST /v1/tools/tts` with the whole text, or a WebSocket on the same path for text in pieces; voices `stella` (default) and `tide`, languages detected from the text, fields `text` (up to 10,000 billed characters, a 64 KiB body), `voice_id`, `format` (`wav` default, or `pcm`), `filter_markdown` (default `true`), errors, ¥3 per 10,000 characters (a Han character counts two), 50 concurrent requests
- [tts-api.zh.md](./docs/tts-api.zh.md) / [tts-api.md](./docs/tts-api.md) - `POST /v1/tools/tts` reference: the `TtsRequest` schema; `pcm` is 24 kHz 16-bit signed mono under `Content-Type: audio/pcm`
- [asr-guide.zh.md](./docs/asr-guide.zh.md) / [asr-guide.md](./docs/asr-guide.md) - Speech to text: `POST /v1/tools/asr`, multipart `file` only, 16-bit PCM WAV or Ogg Opus read from the bytes, mono or stereo (left channel only), up to 8 MiB and 120 s; answers `request_id`, `text`, `duration_ms`; errors; ¥0.78 per hour of audio, billed by the second with a fraction rounded up
- [asr-api.zh.md](./docs/asr-api.zh.md) / [asr-api.md](./docs/asr-api.md) - `POST /v1/tools/asr` reference: the `AsrRequest` and `AsrResponse` schemas

## Notes

Live probe on 2026-11-16 (raw HTTP; captures in `api_captures/deepseek_audio/`, git-ignored):

- `format: "pcm"` answers `content-type: audio/pcm; rate=24000; encoding=signed-integer; bits=16; channels=1`, chunked, the first bytes after about 1 s and the rest in pieces of about 4 KB as they are made. The default, `wav`, answers `audio/wav` behind a RIFF header whose sizes are `0xFFFFFFFF`.
- A body field the API does not know, such as `model`, is ignored. `voice_id: "Kore"` and `format: "mp3"` are refused with a 400 naming the values it takes.
- Errors are OpenAI's JSON format (`{"error": {"message", "type", "param", "code"}}`), gzip-encoded, the message ending with the `request_id`; an empty `text` is a 400.
- Speech to text reads the format from the bytes and ignores the file part's content type and any other form field. WAV, including DeepSeek's own PCM wrapped as WAV, is transcribed; raw PCM and FLAC are a 400 "Unsupported audio format: expected 16-bit PCM WAV or Ogg Opus, mono or stereo"; a request without `file` is a 400.
- Neither API has a models endpoint.
