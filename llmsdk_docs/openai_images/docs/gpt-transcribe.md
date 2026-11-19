> Source: https://developers.openai.com/api/docs/models/gpt-transcribe.md (fetched 2026-11-19)

# GPT-Transcribe

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> High-accuracy speech-to-text model for file and Realtime input transcription

Model ID: `gpt-transcribe`

GPT-Transcribe is a speech-to-text model for completed audio files, streamed file transcripts, and committed turns in Realtime sessions over WebSocket. It supports unstructured context, keyword hints, and multiple language hints to improve transcription of domain terms, multilingual audio, and code-switching.

## Model details

- Default snapshot: `gpt-transcribe`
- Input modalities: audio, text
- Output modalities: text

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Transcription audio duration

| Metric | Price | Unit |
| --- | ---: | --- |
| Price | $0.0045 | minute |

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Not supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-Transcribe.

- `gpt-transcribe`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Build | 5,000 | 2,000,000 |
| Launch | 10,000 | 10,000,000 |
| Grow | 30,000 | 150,000,000 |
