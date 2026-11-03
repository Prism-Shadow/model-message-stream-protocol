# GPT-6.1 Sol

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Near-Astra performance for complex work at a lower cost.

Model ID: `gpt-6.1-sol`

Use GPT-6.1 Sol for complex coding, computer use, and professional work.

`reasoning.effort` supports `low`, `medium` (default), `high`, `xhigh`, and
`max`.

Tool calling requires the Responses API.

See the [GPT-6 guide](/api/docs/guides/latest-model?model=gpt-6-astra#gpt-61-sol)
for prompting and migration guidance.

## Model details

- Default snapshot: `gpt-6.1-sol`
- Input modalities: text, image
- Output modalities: text
- Unsupported modalities: audio, video
- 1,050,000 context window
- Maximum input tokens: 922,000
- 128,000 max output tokens
- Apr 30, 2026 knowledge cutoff
- Reasoning token support

## Pricing

Pricing is based on the number of tokens used, or other metrics based on the model type. For tool-specific models, like search and computer use, there’s a fee per tool call. See details in the [pricing page](/api/docs/pricing).

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $2 | 1M tokens |
| Cached input | $0.1 | 1M tokens |
| Cache writes | $2.5 | 1M tokens |
| Output | $10 | 1M tokens |

- Cached input tokens are priced at 5% of the uncached input token rate.
- Cache writes are billed at 1.25x the uncached input token rate.
- API prompts with more than 272K input tokens are priced at 2x input and cache rates and 1.5x output for the full request.
- Fast mode prices are 2x Standard. Batch and Flex prices are 50% lower than Standard.
- Ultrafast mode prices are 6x Standard.
- Regional processing adds a 10% premium where available.
- GPT-6.1 Sol uses a default context window of 500K tokens in Codex and ChatGPT Work. Usage drawn from your subscription has no long-context surcharge. See [Codex pricing](/codex/pricing).

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Live | `v1/live/sessions` | Not supported |
| Chat Completions | `v1/chat/completions` | Supported |
| Responses | `v1/responses` | Supported |
| Realtime | `v1/realtime` | Not supported |
| Realtime translation | `v1/realtime/translations` | Not supported |
| Realtime transcription | `v1/realtime/transcription_sessions` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Embeddings | `v1/embeddings` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |
| Moderation | `v1/moderations` | Not supported |
| Completions (legacy) | `v1/completions` | Not supported |

## Supported features

- streaming
- structured_outputs
- function_calling
- file_search
- image_input
- web_search
- prompt_caching

## Unsupported features

- fine_tuning
- predicted_outputs

## Supported tools

Tools supported by this model when using the Responses API.

- web_search
- file_search
- image_generation
- code_interpreter
- hosted_shell
- apply_patch
- skills
- computer_use
- mcp
- tool_search

## Snapshots

Snapshots let you lock in a specific version of the model so that performance and behavior remain consistent. Below is a list of all available snapshots and aliases for GPT-6.1 Sol.

- `gpt-6.1-sol`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### Standard

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Build | 5,000 | 1,000,000 |
| Launch | 10,000 | 4,000,000 |
| Grow | 15,000 | 40,000,000 |
