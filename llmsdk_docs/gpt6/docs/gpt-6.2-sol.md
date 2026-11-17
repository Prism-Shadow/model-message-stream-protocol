# GPT-6.2 Sol

> For the complete documentation index, see [llms.txt](/llms.txt). Markdown versions of documentation pages are available by appending `.md` to the page URL.

> Our go-to model for everyday work, from coding to powering agents at scale.

Model ID: `gpt-6.2-sol`

GPT-6.2 Sol accepts text and image inputs and produces text. Use it with the
Responses API to call tools such as web search and computer use, or to delegate
work to subagents with the [Multi-agent beta](/api/docs/guides/responses-multi-agent).

The API rejects requests that set reasoning effort to `none`.

The Responses API supports [discounted background completion windows](/api/docs/guides/background#use-discounted-completion-windows) in public beta.

## Model details

- Input modalities: text, image
- Output modalities: text
- Unsupported modalities: audio, video
- 1,050,000 context window
- Maximum input tokens: 922,000
- 128,000 max output tokens
- Jun 01, 2026 knowledge cutoff
- Reasoning token support

## Pricing

Prices are per 1M tokens. See the [pricing page](/api/docs/pricing) for processing tiers and billing details.

### Text tokens

| Metric | Price | Unit |
| --- | ---: | --- |
| Input | $2 | 1M tokens |
| Cached input | $0.1 | 1M tokens |
| Cache writes | $2.5 | 1M tokens |
| Output | $10 | 1M tokens |

- The cache write price is for 30 minutes of retention. A 12-hour cache write costs $5 per million tokens for short-context requests at Standard pricing.
- For requests with more than 272K input tokens, input and cache rates double and output costs 1.5 times the short-context rate for the full request.
- Batch costs 50% of Standard rates. Fast mode costs twice the Standard rate for the same context length.
- Ultrafast costs 3 times the Standard rate through February 28, 2027, and 6 times the Standard rate starting March 1, 2027 (Pacific time).

## Endpoints

| Endpoint | Route | Support |
| --- | --- | --- |
| Chat Completions | `v1/chat/completions` | Supported |
| Responses | `v1/responses` | Supported |
| Realtime | `v1/realtime` | Not supported |
| Assistants | `v1/assistants` | Not supported |
| Batch | `v1/batch` | Supported |
| Fine-tuning | `v1/fine-tuning` | Not supported |
| Image generation | `v1/images/generations` | Not supported |
| Videos | `v1/videos` | Not supported |
| Image edit | `v1/images/edits` | Not supported |
| Speech generation | `v1/audio/speech` | Not supported |
| Transcription | `v1/audio/transcriptions` | Not supported |
| Translation | `v1/audio/translations` | Not supported |

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

## Model IDs

- `gpt-6.2-sol`

## Rate limits

Rate limits ensure fair and reliable access to the API by placing specific caps on requests, tokens, audio duration, or other usage within a given time period. Your usage tier determines how high these limits are set and automatically increases as you send more requests and spend more on the API.

### Standard

| Tier | RPM | TPM |
| --- | ---: | ---: |
| Build | 5,000 | 1,000,000 |
| Launch | 10,000 | 4,000,000 |
| Grow | 15,000 | 40,000,000 |
