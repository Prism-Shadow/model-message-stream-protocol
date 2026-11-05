> Source: https://openrouter.ai/docs/guides/overview/multimodal/stt.md (fetched 2026-11-04)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Speech-to-Text

> How to transcribe audio into text with OpenRouter models

OpenRouter supports speech-to-text (STT) via a dedicated `/api/v1/audio/transcriptions` endpoint. Send base64-encoded audio and receive a JSON response with the transcribed text and usage statistics.

## Model Discovery

You can find STT models in several ways:

### Via the API

Use the `output_modalities` query parameter on the [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md) to discover STT models:

```bash lines theme={null}
# List only STT models
curl "https://openrouter.ai/api/v1/models?output_modalities=transcription"
```

### On the Models Page

Visit the [Models page](https://openrouter.ai/docs/guides/overview/models.md) and filter by output modalities to find models capable of audio transcription. You can also browse the [Speech-to-Text collection](https://openrouter.ai/collections/speech-to-text-models) for a curated list.

## API Usage

Send a `POST` request to `/api/v1/audio/transcriptions` with a JSON body containing base64-encoded audio. The response is JSON with the transcribed text and optional usage statistics.

### Basic Example

### Request Parameters

| Parameter | Type | Required | Description |
| - | - | - | - |
| `model` | string | Yes | The STT model to use (e.g., `openai/whisper-1`) |
| `input_audio` | object | Yes | Audio data to transcribe |
| `input_audio.data` | string | Yes | Base64-encoded audio data (raw bytes, not a data URI) |
| `input_audio.format` | string | Yes | Audio format (e.g., `wav`, `mp3`, `flac`, `m4a`, `ogg`, `webm`, `aac`) |
| `language` | string | No | ISO-639-1 language code (e.g., `"en"`, `"ja"`). Auto-detected if omitted |
| `temperature` | number | No | Sampling temperature between 0 and 1. Lower values produce more deterministic results |
| `response_format` | string | No | `json` (default) or `verbose_json`. See [Verbose Transcripts](#verbose-transcripts-timestamps-and-speakers) |
| `timestamp_granularities` | string\[] | No | `["segment"]` and/or `["word"]`. Only used with `verbose_json` |
| `provider` | object | No | Data policy routing preferences (`zdr`, `data_collection`) and provider-specific options under `provider.options`. With `zdr: true`, the request only routes to [Zero Data Retention](https://openrouter.ai/docs/guides/features/zdr.md) endpoints. Other routing preferences (`order`, `only`, `ignore`) are not applied to transcription requests. See [Provider-Specific Options](#provider-specific-options) |

### OpenAI-Compatible Multipart Requests

The endpoint also accepts OpenAI-style `multipart/form-data` requests, so clients built for OpenAI's `/v1/audio/transcriptions` (including the official OpenAI SDKs) work by pointing their base URL at `https://openrouter.ai/api/v1`:

```python title="OpenAI SDK (Python)" lines theme={null}
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<OPENROUTER_API_KEY>",
)

with open("audio.wav", "rb") as f:
    result = client.audio.transcriptions.create(
        model="openai/whisper-large-v3",
        file=f,
    )

print(result.text)
```

```bash title="cURL (multipart)" lines theme={null}
curl https://openrouter.ai/api/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -F file="@audio.wav" \
  -F model="openai/whisper-large-v3"
```

The `file`, `model`, `language`, `temperature`, `response_format`, and `timestamp_granularities` fields are supported. `prompt` is accepted but ignored. `response_format` may be `json` (the default) or `verbose_json` (see [Verbose Transcripts](#verbose-transcripts-timestamps-and-speakers)). `text`, `srt`, and `vtt` are rejected with a 400. With `verbose_json`, pass `timestamp_granularities[]=word` to also receive word-level timestamps in the `words` array.

Multipart uploads are limited to 25 MB, the same cap OpenAI enforces. For compressed formats this covers long recordings, roughly 26 minutes of 128 kbps MP3, 52 minutes at 64 kbps, or over 2 hours of 24 kbps Opus voice notes. Uncompressed WAV fills the cap much faster (about 13 minutes at 16 kHz mono); prefer `mp3` or `opus` for long recordings. Larger files should be sent as base64 JSON via `input_audio` on OpenAI and Groq models, which offload the large body through a Durable Object and accept files past the 25 MB multipart cap, or as `input_audio.url` for models that accept a URL — the provider downloads it directly, so the 25 MB inline cap does not apply. On other providers, base64 JSON past the multipart cap is rejected, so those models are limited to the 25 MB multipart upload. Recordings longer than about a minute of processing time should be split anyway, since upstream providers time out after 60 seconds per request.

### Provider-Specific Options

Pass provider-specific parameters through `provider.options`, keyed by the provider slug from the endpoints API. Only the options for the provider that serves the request are forwarded, and they are sent under the provider's own field names, so use the names and shapes from that provider's transcription API reference. Parameters that OpenRouter normalizes across providers (`language`, `temperature`, `response_format`, `timestamp_granularities`) stay at the top level of the request.

```json lines theme={null}
{
  "model": "openai/whisper-large-v3",
  "input_audio": {
    "data": "UklGRiQA...",
    "format": "wav"
  },
  "provider": {
    "options": {
      "groq": {
        "prompt": "Expected vocabulary: OpenRouter, API, transcription"
      }
    }
  }
}
```

To find the slug for each provider serving a model, call the [endpoints API](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model.md). The `tag` field of each endpoint record is the key to use under `provider.options`:

```bash lines theme={null}
curl https://openrouter.ai/api/v1/models/openai/whisper-large-v3/endpoints
```

Features a provider exposes only through its own options, such as speaker diarization, vocabulary or keyword hints, and output style controls, are passed this way. Provider integrations differ in which fields they forward and how they handle unsupported fields. Some forward only an allowlist and drop the rest without an error (for example Deepgram accepts `punctuate`, `diarize`, `smart_format`, and `detect_language`), while others such as Azure forward most fields as-is, so an invalid option usually surfaces as a provider error. Use the options shown in this guide, or test an option before relying on it.

### Verbose Transcripts (Timestamps and Speakers)

Set `response_format` to `verbose_json` to request structured fields such as `language`, `duration`, and a `segments` array with start and end times (OpenAI-compatible providers also return `task`). Which of these fields are present varies by provider. Add `"word"` to `timestamp_granularities` to also request a `words` array. Providers that do not return structured output reject `verbose_json` with a 400, as do some individual models (for example `openai/gpt-4o-transcribe` and `microsoft/mai-transcribe-1.5`).

Speaker diarization is enabled through the provider's own option under `provider.options` (see [Provider-Specific Options](#provider-specific-options)). When the provider returns speaker labels, each segment (and word, where the provider supports it) carries a `speaker` index. This example enables diarization on the `azure` endpoint of `microsoft/mai-transcribe-2`:

```bash title="cURL" lines theme={null}
AUDIO_BASE64=$(base64 < audio.mp3 | tr -d '\n')

curl https://openrouter.ai/api/v1/audio/transcriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
    "model": "microsoft/mai-transcribe-2",
    "input_audio": {
      "data": "'"$AUDIO_BASE64"'",
      "format": "mp3"
    },
    "response_format": "verbose_json",
    "timestamp_granularities": ["segment", "word"],
    "provider": {
      "options": {
        "azure": {
          "diarization": { "enabled": true }
        }
      }
    }
  }'
```

```json title="Response (abridged)" lines theme={null}
{
  "language": "en",
  "duration": 6.4,
  "text": "Hello there. Hi, how are you?",
  "segments": [
    { "id": 0, "start": 0.0, "end": 1.2, "text": "Hello there.", "speaker": 0 },
    { "id": 1, "start": 1.5, "end": 3.1, "text": "Hi, how are you?", "speaker": 1 }
  ],
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.4, "speaker": 0 },
    { "word": "there.", "start": 0.4, "end": 1.2, "speaker": 0 }
  ],
  "usage": { "seconds": 6.4, "cost": 0.000178 }
}
```

Whether speaker labels appear on segments, words, or both depends on the provider. Azure labels each phrase, and OpenRouter applies that label to the segment and to each word within it. Other providers' diarization options (for example Deepgram's `diarize`) are passed the same way under their provider slug.

## Response Format

The STT endpoint returns a JSON response with the transcribed text:

```json lines theme={null}
{
  "text": "Hello, this is a test of speech-to-text transcription.",
  "usage": {
    "seconds": 9.2,
    "total_tokens": 113,
    "input_tokens": 83,
    "output_tokens": 30,
    "cost": 0.000508
  }
}
```

### Response Fields

| Field | Type | Description |
| - | - | - |
| `text` | string | The transcribed text |
| `task` | string | `transcribe`. Only with `verbose_json`, when the provider reports it |
| `language` | string | Detected or requested language. Only with `verbose_json` |
| `duration` | number | Audio duration in seconds. Only with `verbose_json` |
| `confidence` | number | Provider confidence for the whole transcript, 0 to 1. Only with `verbose_json` and only when the provider scores the full transcript |
| `segments` | array | Timestamped segments with `start`, `end`, `text`, and optional `speaker`. Only with `verbose_json` |
| `words` | array | Timestamped words with `word`, `start`, `end`, optional `speaker`, and optional `confidence` (0 to 1, present when the provider scores words). Only with `verbose_json` and `"word"` in `timestamp_granularities` |
| `usage.seconds` | number | Duration of the input audio in seconds |
| `usage.total_tokens` | number | Total number of tokens used (input + output) |
| `usage.input_tokens` | number | Number of input tokens billed |
| `usage.output_tokens` | number | Number of output tokens generated |
| `usage.cost` | number | Total cost of the request in USD |

### Response Headers

| Header | Description |
| - | - |
| `X-Generation-Id` | Unique generation ID for the request, useful for tracking and debugging |

## Supported Audio Formats

Supported audio formats vary by provider. Common formats include:

| Format | MIME Type | Description |
| - | - | - |
| `wav` | `audio/wav` | Uncompressed audio, highest quality |
| `mp3` | `audio/mpeg` | Compressed audio, widely compatible |
| `flac` | `audio/flac` | Lossless compressed audio |
| `m4a` | `audio/mp4` | MPEG-4 audio |
| `ogg` | `audio/ogg` | Ogg Vorbis audio |
| `webm` | `audio/webm` | WebM audio, common in browser recordings |
| `aac` | `audio/aac` | Advanced Audio Coding |

## Pricing

STT models use different pricing strategies depending on the provider:

* **Duration-based** (e.g., OpenAI Whisper): Priced per second of audio input
* **Token-based** (e.g., newer OpenAI models): Priced per input/output token, similar to text models

You can check the cost for each model on the [Models page](https://openrouter.ai/docs/guides/overview/models.md) or via the [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md). The `usage.cost` field in the response shows the actual cost for each request.

## BYOK (Bring Your Own Key)

STT supports [BYOK](https://openrouter.ai/docs/guides/overview/auth/byok.md), allowing you to use your own provider API keys. When configured, requests are routed directly to the provider using your key, and OpenRouter charges only its platform fee rather than the per-usage model cost.

## Playground

You can test STT models directly in the browser using the [OpenRouter Playground](https://openrouter.ai/playground). Navigate to any STT model's page and use the playground tab to upload an audio file and see the transcription result.

## Differences from Audio Input

OpenRouter supports two ways to process audio:

1. **Speech-to-Text** (this page): A dedicated `/api/v1/audio/transcriptions` endpoint optimized for transcription. Returns structured JSON with the transcribed text and usage data. Best for converting audio to text.

2. **Audio input via the Responses API** ([Audio docs](https://openrouter.ai/docs/guides/overview/multimodal/audio.md)): Send audio as part of a [`/api/v1/responses`](https://openrouter.ai/docs/api_reference/responses/overview) request using the `input_audio` content type. The model processes the audio alongside text and responds conversationally. Best for audio analysis, question answering about audio content, or combining audio with other modalities.

## Best Practices

* **Choose the right format**: WAV provides the best quality for transcription. MP3 and other compressed formats work well but may slightly reduce accuracy for borderline audio
* **File size**: For very long audio files, consider splitting them into smaller segments. The upstream provider timeout is 60 seconds, so very large files may time out
* **Base64 encoding**: Audio must be sent as base64-encoded data (raw bytes, not a data URI). Most programming languages have built-in base64 encoding utilities

## Troubleshooting

**Empty or incorrect transcription?**

* Verify the audio format matches the `format` field in your request
* Ensure the audio quality is sufficient for transcription

**Request timing out?**

* Large audio files may exceed the 60-second timeout. Split long recordings into smaller segments
* Compressed formats (MP3, AAC) produce smaller payloads and transfer faster

**Model not found?**

* Use the [Models page](https://openrouter.ai/docs/guides/overview/models.md) or the [Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties.md) with `output_modalities=transcription` to find available STT models
* Verify the model slug is correct (e.g., `openai/whisper-1`, not `whisper-1`)

**Authentication error?**

* Ensure you're using a valid API key from [your OpenRouter dashboard](https://openrouter.ai/settings/keys)
* The STT endpoint uses the same authentication as the [Responses API](https://openrouter.ai/docs/api_reference/responses/overview.md)
