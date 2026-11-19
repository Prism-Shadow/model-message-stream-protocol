> Source: https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst.md (fetched 2026-11-19)

# GPT-Image-2.6 Sunburst

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Image generation and editing for detailed visual work

Model ID: `gpt-image-2.6-sunburst`

GPT-Image-2.6 Sunburst generates and edits images from text and image inputs. Use it for detailed compositions and image editing workflows. Learn about the complexity setting, markup-guided edits, SVG output, and animated GIF output in the [image generation guide](/api/docs/guides/image-generation#gpt-image-26).

## Model details

- Default snapshot: `gpt-image-2.6-sunburst`
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
| Batch | `v1/batch` | Not supported |
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

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-Image-2.6 Sunburst.

- `gpt-image-2.6-sunburst`

## Rate limits

Rate limits vary by usage tier and account.

See your [organization’s limits](https://platform.openai.com/settings/organization/limits) for the rate limits that apply to your account.
