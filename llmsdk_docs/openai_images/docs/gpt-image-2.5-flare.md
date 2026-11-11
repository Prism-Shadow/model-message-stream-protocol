> Source: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare.md (fetched 2026-11-04)

# GPT-Image-2.5 Flare

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Fast, high-quality everyday image generation

Model ID: `gpt-image-2.5-flare`

GPT Image 2.5 Flare is our fastest model for high-quality, everyday image generation. It accepts text and image inputs and produces image outputs. It supports `low`, `medium`, `high`, `xhigh`, `max`, and `auto` quality settings. Select it directly in the Image API or as the model of the Responses API image generation tool. Learn more in the [image generation guide](/api/docs/guides/image-generation).

## Model details

- Default snapshot: `gpt-image-2.5-flare-2026-09-08`
- Input modalities: text, image
- Output modalities: image

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $5 | 1M tokens |
| Cached input | $1.25 | 1M tokens |

### Image tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $8 | 1M tokens |
| Cached input | $2 | 1M tokens |
| Output | $30 | 1M tokens |

- Image output costs $30 per million tokens with Standard processing or $15 with Batch processing. Text output is not billed because this model outputs images, not text.
- Token rates match GPT Image 2. The GPT Image 2 calculator does not estimate GPT Image 2.5 token consumption.

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Not supported |
| Responses | `v1/responses` | Not supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- inpainting

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-Image-2.5 Flare.

- `gpt-image-2.5-flare`
- `gpt-image-2.5-flare-2026-09-08`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### default

| Tier | TPM | IPM |
| --- | ---: | ---: |
| Build | 250,000 | 20 |
| Launch | 3,000,000 | 150 |
| Grow | 8,000,000 | 250 |
