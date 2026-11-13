> Source: https://openrouter.ai/docs/guides/overview/multimodal/tts.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Text-to-Speech

> How to generate speech audio from text with OpenRouter models

OpenRouter supports text-to-speech (TTS) via a dedicated `/api/v1/audio/speech` endpoint that is compatible with the [OpenAI Audio Speech API](https://platform.openai.com/docs/api-reference/audio/createSpeech). Send text and receive a raw audio byte stream in your chosen format.

## Model Discovery

You can find TTS models in several ways:

### Via the API

Use the `output_modalities` query parameter on the [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md) to discover TTS models:

```bash lines theme={null}
# List only TTS models
curl "https://openrouter.ai/api/v1/models?output_modalities=speech"
```

### On the Models Page

Visit the [Models page](https://openrouter.ai/docs/guides/overview/models.md) and filter by output modalities to find models capable of speech synthesis. Look for models that list `"speech"` in their output modalities.

## API Usage

Send a `POST` request to `/api/v1/audio/speech` with the text you want to synthesize. The response is a raw audio byte stream (not JSON), so you can pipe it directly to a file or audio player.

### Basic Example

### Request Parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `model` | string | Yes | The TTS model to use (e.g., `openai/gpt-4o-mini-tts-2025-12-15`, `mistralai/voxtral-mini-tts-2603`) |
| `input` | string or array | Yes | The text to synthesize into speech, or a list of turns for multi-speaker input. See [Multi-Speaker Input](#multi-speaker-input) below. Some models treat a string input as a prompt that can also describe non-speech audio; see [Non-Speech Prompts](#non-speech-prompts) below |
| `voice` | string | Provider-dependent | Voice identifier. Available voices vary by model, so check each model's page on the [Models page](https://openrouter.ai/docs/guides/overview/models.md) for supported voices. Omit this parameter only when the selected provider documents a default voice; otherwise an explicit voice is required. |
| `instructions` | string | No | Delivery instructions such as tone, pacing, or emotion, for example `Speak in a warm and friendly tone.` Supported by OpenAI `gpt-4o-mini-tts`, Gemini TTS, and Fish Audio models. Ignored by other providers |
| `response_format` | string | No | Audio output format: `mp3` or `pcm`. Defaults to `pcm`. HeyGen Voice and Gemini TTS only return `pcm`, and MiniMax only returns `mp3`; these return a 400 for the other format |
| `speed` | number | No | Playback speed multiplier. Honored by models that support it (e.g., OpenAI TTS). Other providers either ignore it or return a 400 for a non-default value when the model has no speed control. Defaults to `1.0` |
| `input_references` | array | No | Reference content for stateless voice cloning or voice design: one to three `input_audio` parts (each optionally paired with a `text` transcript), optionally plus one `image_url` scene image on providers that support it, or exactly one `image_url` part on its own. See [Voice Cloning](#voice-cloning) below |
| `provider` | object | No | Data policy routing preferences (`zdr`, `data_collection`) and provider-specific passthrough options under `provider.options`. With `zdr: true`, the request only routes to [Zero Data Retention](https://openrouter.ai/docs/guides/features/zdr.md) endpoints. Other routing preferences (`order`, `only`, `ignore`) are not applied to speech requests |

When `voice` is omitted, OpenRouter only forwards the request to providers whose adapter supports a provider-side default voice. For other providers, the request is rejected with a validation error.

### Multi-Speaker Input

Some models can voice a conversation between several speakers in one request. To use this, pass `input` as a list of turns instead of a string. Each turn has a `text` field and may set its own `voice` and `instructions`. A turn without a `voice` uses the top-level `voice`, and a turn without `instructions` uses the top-level `instructions`. The turns are synthesized in order into a single audio stream:

```json lines theme={null}
{
  "model": "google/gemini-3.8-flash-lite-tts",
  "input": [
    { "text": "How's it going today, Jane?", "voice": "Kore" },
    { "text": "Not too bad, how about you?", "voice": "Puck", "instructions": "tired, yawning" }
  ],
  "instructions": "cheerful",
  "response_format": "pcm"
}
```

Multi-speaker input is supported by Gemini TTS models and by Fish Audio models other than S1. Other providers return a 400 error for it.

### Voice Cloning

Some models support **stateless voice cloning**: you send a short sample of reference audio directly with the TTS request, and the generated speech mimics that voice. No separate voice-creation or upload step is required.

Pass the reference audio as a base64 `input_audio` part in `input_references` (a `data:audio/...;base64,` URI also works), and optionally include its transcript as a `text` part:

```json lines theme={null}
{
  "model": "fish-audio/s2.1-pro",
  "input": "Hello from my cloned voice!",
  "response_format": "mp3",
  "input_references": [
    { "type": "input_audio", "input_audio": { "data": "data:audio/wav;base64,UklGRuQXDAB..." } },
    { "type": "text", "text": "This is the transcript of the reference audio." }
  ]
}
```

Instead of inline base64, `input_audio` can carry a public `url`. OpenRouter downloads the file and forwards the bytes to the provider; the provider never receives your URL:

```json lines theme={null}
{
  "type": "input_audio",
  "input_audio": { "url": "https://example.com/samples/narrator.wav" }
}
```

Not every provider of a voice-cloning model supports voice cloning, and only some accept more than one clip or an image reference. Requests that carry references are only routed to endpoints whose capability flags allow them. Check these fields on the [endpoints API](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model.md):

| Field | Meaning |
| - | - |
| `supports_voice_cloning` | The endpoint accepts `input_audio` reference clips |
| `supports_multiple_audio_references` | The endpoint accepts more than one `input_audio` clip per request |
| `supports_image_reference` | The endpoint accepts an `image_url` reference, either on its own (voice design) or alongside an `input_audio` clip (scene image); which shape applies is per model |

#### Scene Image

[HeyGen Voice](https://openrouter.ai/heygen/heygen-voice-1) clones the reference recording on each request and can condition the voice on a picture of the speaker in their setting: a quiet room keeps the voice clean, a car or a stage adds matching acoustics and background sound. Send the picture as an `image_url` part next to the `input_audio` part. The image is optional; a recording on its own works the same way. Omit `voice` when you send a recording, since the recording is the voice. HeyGen detects the recording's language; to set it yourself, use `provider.options.heygen.language`:

```json lines theme={null}
{
  "model": "heygen/heygen-voice-1",
  "input": "Welcome aboard, please fasten your seat belts.",
  "response_format": "pcm",
  "input_references": [
    { "type": "input_audio", "input_audio": { "data": "data:audio/mpeg;base64,SUQzBAAAAAAA..." } },
    { "type": "image_url", "image_url": { "url": "https://example.com/pilot-in-cockpit.jpg" } }
  ],
  "provider": { "options": { "heygen": { "language": "en" } } }
}
```

The recording must be a WAV or MP3 file of clear speech (only its first 3 minutes are used), and the image a JPEG, PNG, or WebP. HeyGen Voice does not accept an image without a recording, and Seed Audio does not accept a recording together with an image; each returns a 400 describing the shape it expects.

#### Multiple Reference Clips

Models such as [Seed Audio 1.0](https://openrouter.ai/bytedance-seed/seed-audio-1-0) accept up to three `input_audio` clips in one request, so a single generation can switch between voices. Clips are numbered in the order you send them, and you address them from `input` with the placeholders `@Audio1`, `@Audio2`, and `@Audio3`. If you also send transcripts with more than one clip, place each clip's `text` part immediately after the clip it describes:

```json lines theme={null}
{
  "model": "bytedance-seed/seed-audio-1-0",
  "input": "@Audio1 Welcome back to the show. @Audio2 Thanks for having me, it is great to be here.",
  "response_format": "mp3",
  "input_references": [
    { "type": "input_audio", "input_audio": { "data": "data:audio/wav;base64,UklGRuQXDAB..." } },
    { "type": "input_audio", "input_audio": { "url": "https://example.com/samples/guest.mp3" } }
  ]
}
```

Placeholder rules, as enforced by Seed Audio 1.0 (currently the only model that accepts more than one clip; a model that accepts a single clip takes `input` verbatim and does not validate placeholders):

* With a single clip, the placeholder is optional: the whole input is spoken in that voice. If you include one, it must be `@Audio1`.
* With more than one clip, every clip must be referenced at least once. A request that supplies two clips but never mentions `@Audio2` is rejected with a 400.
* A placeholder that points at a clip you did not send (for example `@Audio3` with two clips) is rejected with a 400, as is a placeholder in a request with no audio references.
* Transcripts are optional and provider-dependent: Fish Audio sends each clip's transcript to the model, while Seed Audio 1.0 ignores them. With a single clip the `text` part may appear before or after it; with multiple clips a `text` part must immediately follow its clip, and a transcript with no preceding clip is rejected.

#### Image References

Some models can design a voice from a picture instead of an audio sample. Send exactly one `image_url` part, either as a base64 data URI or as a public `http(s)` URL that OpenRouter downloads and forwards as bytes. JPEG, PNG, and WebP are accepted:

```json lines theme={null}
{
  "model": "bytedance-seed/seed-audio-1-0",
  "input": "Hi there, I will be your guide through the museum today.",
  "response_format": "mp3",
  "input_references": [
    { "type": "image_url", "image_url": { "url": "https://example.com/portraits/guide.png" } }
  ]
}
```

Seed Audio's voice-design mode accepts only an image, with no `input_audio` clips alongside it; providers with `supports_image_reference` and `supports_voice_cloning` take one image together with the clips (see [Scene Image](#scene-image)). `@AudioN` placeholders are rejected when no audio clip is present.

#### Limits and Requirements

* Supported audio formats for reference clips are provider-specific.
* `input_references` accepts one to three `input_audio` parts (each optionally paired with a `text` transcript), at most one `image_url` part, or both together on providers that support it; two images are rejected. An empty array is treated as no reference.
* Each inline reference is limited to 20 MiB of base64 (15 MiB of decoded media); a larger `data` value is rejected with a 400. Remote downloads are capped at the same 15 MiB and a larger file is rejected with a 413.
* Remote `url` values must be public `http(s)` URLs of at most 2048 characters. OpenRouter fetches them server-side and forwards only the bytes, never the URL.
* A `text` transcript is limited to 10,000 characters.
* Seed Audio 1.0 treats both `voice` (a Seed speaker ID) and `input_references` as the reference voice, so a request that sends both is rejected with a 400. Use one or the other.

When Seed Audio 1.0 rejects a reference or prompt for reasons of its own, such as a clip it cannot decode, OpenRouter returns a 400 whose message begins with `Provider rejected the request:` followed by the provider's explanation, with any base64 payload redacted. Other provider failures are reported with OpenRouter's own messages.

### Non-Speech Prompts

For most TTS models, `input` is read aloud verbatim. Seed Audio 1.0 instead treats `input` as a prompt that is forwarded unchanged to the model, so it can describe the delivery of the speech, or describe sound that is not speech at all: sound effects, ambience, or a scene. Omit `voice` and `input_references` when you want the model to infer everything from the prompt:

```json lines theme={null}
{
  "model": "bytedance-seed/seed-audio-1-0",
  "input": "Heavy rain falling on a tin roof with distant rolling thunder, no voices.",
  "response_format": "mp3"
}
```

Seed Audio 1.0 caps generated audio at 120 seconds per request; see [Seed Audio 1.0](#seed-audio-10) below for its other limits.

### Provider-Specific Options

You can pass provider-specific options using the `provider` parameter. Options are keyed by provider slug, and only the options for the matched provider are forwarded:

```json lines theme={null}
{
  "model": "openai/gpt-4o-mini-tts-2025-12-15",
  "input": "Hello world",
  "voice": "alloy",
  "provider": {
    "options": {
      "openai": {
        "stream_format": "audio"
      }
    }
  }
}
```

#### Seed Audio 1.0

Seed Audio 1.0 takes no provider options; every field it reads is derived from the standard parameters. It enforces these limits with a 400:

* `input` is limited to 3000 characters.
* `speed` must be between 0.5 and 2.0.
* Generated audio is capped at 120 seconds per request. A prompt that would produce more than that is rejected before any audio is returned.

#### Azure (MAI-Voice)

Azure serves `microsoft/mai-voice-2`, `microsoft/mai-voice-2.1`, and `microsoft/mai-voice-2.1-flash`. Azure TTS uses SSML internally, but this is fully abstracted, so you only need the standard parameters. The `voice` parameter takes a full Azure voice ID with the model suffix (`:MAI-Voice-2`, `:MAI-Voice-2.1`, or `:MAI-Voice-2.1-Flash`, e.g., `en-US-Harper:MAI-Voice-2.1`), and the voice's locale sets the synthesis language. Set `response_format` to `mp3` or `pcm` (24 kHz mono). The full list of voices for each model is in the `supported_voices` field of the [models API](https://openrouter.ai/api/v1/models?output_modalities=speech).

```json lines theme={null}
{
  "model": "microsoft/mai-voice-2.1",
  "input": "Welcome to the event!",
  "voice": "en-US-Harper:MAI-Voice-2.1",
  "response_format": "mp3"
}
```

#### Fish Audio

Fish Audio models take delivery directions in square brackets inside the text, for example `[whispering] Nobody answered.` OpenRouter adds `instructions` to the text the same way, at the start of the input or of each turn. For [multi-speaker input](#multi-speaker-input), OpenRouter sends Fish one `reference_id` for each distinct turn voice and starts each turn with a `<|speaker:N|>` tag. Fish bills these added characters along with the input. Fish Audio S1 returns a 400 error for multi-speaker input, and reference audio cannot be combined with it.

#### Google (Gemini TTS)

Gemini 3.8 TTS models read `input` verbatim, so delivery directions written into the text may be spoken aloud. Use the top-level `instructions` parameter instead, or the per-turn `instructions` for [multi-speaker input](#multi-speaker-input). OpenRouter sends it as `speech_metadata.style` on the input text part of the upstream request. Any other `speech_metadata` fields can be passed in provider options and are merged onto the same text part. All remaining provider options are forwarded as generation config:

```json lines theme={null}
{
  "model": "google/gemini-3.8-flash-lite-tts",
  "input": "Have a wonderful day!",
  "voice": "Kore",
  "instructions": "warm and friendly",
  "response_format": "pcm",
  "provider": {
    "options": {
      "google-ai-studio": {
        "temperature": 0.7
      }
    }
  }
}
```

For multi-speaker input, OpenRouter builds Gemini's `multiSpeakerVoiceConfig` from the turn voices, so no provider options are needed. If you pass your own `speechConfig` in provider options, it is forwarded as-is and replaces the one OpenRouter would build. Each turn is still labeled with its resolved voice name, so a custom `multiSpeakerVoiceConfig` must use those voice names as its `speaker` values.

## Response Format

The TTS endpoint returns a **raw audio byte stream**, not JSON. The response includes the following headers:

| Header | Description |
| - | - |
| `Content-Type` | The MIME type of the audio. `audio/mpeg` for `mp3` format, `audio/pcm` for `pcm` format |
| `X-Generation-Id` | The unique generation ID for the request, useful for tracking and debugging |

### Output Formats

| Format | Content-Type | Description |
| - | - | - |
| `mp3` | `audio/mpeg` | Compressed audio, smaller file size. Good for storage and playback |
| `pcm` | `audio/pcm` | Uncompressed raw audio. Lower latency, suitable for real-time streaming pipelines |

## Pricing

Most TTS models are priced **per character** of input text. Some audio generation models, such as Seed Audio 1.0, are priced **per second** of generated audio instead. Pricing varies by model and provider. You can check the per-character or per-second cost for each model on the [Models page](https://openrouter.ai/docs/guides/overview/models.md) or via the [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md), where per-second models report their rate under `pricing.completion`.

## OpenAI SDK Compatibility

The TTS endpoint is fully compatible with the OpenAI SDK. You can use the OpenAI client libraries by pointing them at OpenRouter's base URL:

## Best Practices

* **Choose the right format**: Use `mp3` for storage and general playback. Use `pcm` for real-time streaming pipelines where latency matters
* **Voice selection**: Different providers offer different voices. Check the model's documentation or experiment with available voices to find the best fit for your use case
* **Input length**: For very long texts, consider splitting the input into smaller segments and concatenating the audio output. This can improve reliability and reduce latency for the first audio chunk
* **Speed parameter**: The `speed` parameter is only supported by certain providers (e.g., OpenAI). Providers that don't support it either ignore it or reject a non-default value with a 400 when the model has no speed control, so omit it unless the model documents speed

## Troubleshooting

**Empty or corrupted audio file?**

* Verify the `response_format` matches how you're saving the file (e.g., don't save `pcm` output with a `.mp3` extension)
* Check the response status code, since non-200 responses return JSON error bodies, not audio

**Model not found?**

* Use the [Models page](https://openrouter.ai/docs/guides/overview/models.md) to find available TTS models
* Verify the model slug is correct (e.g., `openai/gpt-4o-mini-tts-2025-12-15`, not `gpt-4o-mini-tts`)

**Voice not available?**

* Available voices vary by provider. Check the provider's documentation for supported voice identifiers
* Each model has its own set of voices, so check the model's page on the [Models page](https://openrouter.ai/docs/guides/overview/models.md) for the full list
