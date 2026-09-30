# Gemini 3.8 SDK Documentation

This directory documents the Gemini 3.8 protocol generation, which starts with
`gemini-3.8-flash`. Content is snapshotted from the official documentation
(https://ai.google.dev/gemini-api/docs/latest-model).

The request/response wire format and the parameter contract are identical to the
Gemini 3.7 generation (see [../gemini3_7/](../gemini3_7/README.md)): sampling
parameters stay deprecated, model turn prefill stays disallowed, thinking is
configured with the `thinking_level` enum, and `minimal` thinking stays unsupported.
Nothing model-visible changed — `gemini-3.8-flash` is a newer build carrying the
same limits (1,048,576 in / 65,536 out), the same capability set, and the same
price table, launch discount included. Its model page is dated September 2026,
one month on from the 3.7 page.

## Documentation

- [latest-model.md](./docs/latest-model.md) - The generation overview and pricing
- [gemini-3.8-flash.md](./docs/gemini-3.8-flash.md) - Gemini 3.8 Flash model spec
- [thinking.md](./docs/thinking.md) - Thinking levels across Gemini 3.x models
- [models.md](./docs/models.md) - All Gemini API models (retrieved 2026-09-30)
- [gemini-3.8-flash-tts.md](./docs/gemini-3.8-flash-tts.md) - Gemini 3.8 Flash TTS: turns carry `speech_metadata` (speaker, style), WAV by default on unary requests
- [gemini-3.8-flash-lite-tts.md](./docs/gemini-3.8-flash-lite-tts.md) - Gemini 3.8 Flash-Lite TTS, same schema
- [speech-generation.md](./docs/speech-generation.md) - Text-to-speech guide
- [gemini-3.1-flash-lite-image.md](./docs/gemini-3.1-flash-lite-image.md) - Nano Banana 2 Lite image model

For the SDK usage guides (function calling, streaming, thought signatures, TTS, image
generation, embeddings), refer to [../gemini3/docs/](../gemini3/README.md); they apply
unchanged to this generation.

On Vertex AI this generation is served through generateContent only; see
[Vertex AI](../gemini_interactions/README.md#vertex-ai-verified-2026-09-17) in the Interactions notes.

## Gemini 3.8 TTS (added 2026-09-30)

Probed live on 2026-09-30 through the Interactions API and generateContent with an API key:

- Streamed audio is raw PCM, `audio/l16` at 24 kHz mono, as on 3.1; the WAV default applies to unary requests.
- A single-speaker request takes plain text.
- A two-speaker request with `Name: line` labels in the text returns 400 (`Multi-speaker interactions must specify a speaker for each text turn.`; generateContent: `must specify speech_metadata.speaker for each text part`). Each turn has to be its own text block (Interactions: an annotation `{"type": "speech_metadata", "speaker": ...}`) or part (generateContent: `speech_metadata.speaker`).
- `gemini-3.1-flash-tts-preview` rejects the same metadata: `Speech annotations are not supported for model 'gemini-3.1-flash-tts-preview'.`
- Vertex AI does not serve the 3.8 TTS models (404 for the project used in testing).
