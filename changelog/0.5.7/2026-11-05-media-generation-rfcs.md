# Image generation, speech and transcription in the specifications

- **Date:** 2026-11-05
- **Type:** process
- **Scope:** `design`
- **PR:** [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)

[中文版](2026-11-05-media-generation-rfcs.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests: §3.2 specified the image, speech and transcription endpoints of `openai-image`, `openai-speech` and `openai-transcription`. An image is read from one JSON, with no stream and no `response_format`, from `b64_json` or else a `url` downloaded with no credential, its MIME type from `media_type`, `output_format` or its bytes; speech streams its bytes as `inline_data` chunks of one item, headerless PCM named `audio/l16; rate=<rate>; channels=<channels>` from the response's `content-type`; a transcription uploads the message's one audio item in OpenAI's multipart form, PCM wrapped as WAV, with no `prompt`. Each client sends one request per message. The `stop` carries `finish_reason` `stop` and the usage summed over the requests: the endpoint's input and output tokens for an image, the input's UTF-8 bytes as `prompt_tokens` for speech, and the audio's seconds, rounded up, as `prompt_tokens` for a transcription. §5 named the failed download of an image's `url` among the causes of `ProviderStreamError`, §6.3 the three clients' models among those that do not think, and §6.4 mapped `tts_config` to `voice` and `image_config` to `size` by Gemini's table of 1K and 2K sizes.
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md) Client Routing: `openai-official` serves a `gpt-image-` model through `openai-image`, named or deduced.
- [MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.md) Upstream Credentials: the new §7 specified that a link an endpoint answers with is downloaded by the client's own HTTP client with no credential, neither its key nor its default headers nor the environment's variables.
- [MMSP-RFC-0007](../../design/rfcs/MMSP-RFC-0007-error-types.md) Error Types: §3.2 named an HTTP error status on the download of a generated image's `url` as a `ProviderStreamError`, the status as its code.

## Image sizes

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
