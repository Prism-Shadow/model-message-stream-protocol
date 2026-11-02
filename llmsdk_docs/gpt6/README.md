# GPT-6 SDK Documentation

This directory contains the official-documentation snapshot for OpenAI's GPT-6 generation
(`gpt-6-astra`, `gpt-6.1-sol`, `gpt-6.1-terra` and `gpt-6-luna`, each its only snapshot and its
own alias), snapshotted as raw markdown from https://developers.openai.com/ on 2026-09-09 and
refreshed on 2026-11-02, when GPT-6.1 Terra was added.

## Documentation

- [gpt-6-astra.md](./docs/gpt-6-astra.md) - The model page: context window, token limits,
  knowledge cutoff, modalities, endpoints, feature list, per-million-token pricing and the
  272K-input surcharge
- [gpt-6.1-sol.md](./docs/gpt-6.1-sol.md) - GPT-6.1 Sol model page: effort `low` to `max` (no `none`), pricing, endpoints
- [gpt-6.1-terra.md](./docs/gpt-6.1-terra.md) - GPT-6.1 Terra model page: effort `none` to `max`,
  pricing with 30-minute and 12-hour cache writes, endpoints
- [gpt-6-luna.md](./docs/gpt-6-luna.md) - GPT-6 Luna model page: effort `none` to `max`, pricing, endpoints
- [latest-model.md](./docs/latest-model.md) - Using GPT-6: the four models and which reasoning
  efforts each takes, what is new (async tool calling, mid-turn steering, `configuration_update`
  items, misalignment monitoring), prompting guidance, and the migration checklist from GPT-5.6
- [reasoning.md](./docs/reasoning.md) - The reasoning guide: the `reasoning.effort` scale,
  `reasoning.mode`, persisted reasoning with `encrypted_content` under `store: false`, and the
  `phase` parameter
- [prompt-caching.md](./docs/prompt-caching.md) - Prompt caching on GPT-5.6 and later:
  `prompt_cache_options` with a `30m` or `12h` lifetime, explicit breakpoints, cache writes billed
  at 1.25x (30m) or 2.5x (12h) the uncached input rate, and reads at 0.05x on GPT-6.1 Sol and
  GPT-6.1 Terra
- [pricing.md](./docs/pricing.md) - The pricing page: Standard, Batch, Flex, Fast and Ultrafast
  rates per model, short and long context
- [images-vision.md](./docs/images-vision.md) - Image input: the `detail` levels, the per-model
  sizing table, and the 30,000-patch limit that rejects an image instead of resizing it

## Key protocol notes vs GPT-5.6

- The wire protocol is identical to GPT-5.6 (verified with live captures under
  `api_captures/openai_responses/gpt-6-astra/`): reasoning summaries stream via
  `response.reasoning_summary_text.delta`, reasoning items carry `id` + `encrypted_content`,
  assistant messages carry `phase` (`commentary`, then `final_answer`), and a replayed reasoning
  item must include the `summary` key — the API answers 400
  `Missing required parameter: 'input[N].summary'` without it, exactly as GPT-5.6 does. No stream
  event outside the set the shared client already handles appeared in any capture. GPT-6 Astra
  therefore shares its client with GPT-5.4, GPT-5.5 and GPT-5.6.
- `reasoning.effort` accepts `low`, `medium`, `high`, `xhigh` and `max`. `none` and `minimal` are
  both rejected with HTTP 400 `Unsupported value: '<value>' is not supported with the
  'gpt-6-astra' model.`, so `ThinkingLevel.NONE` degrades to `low` on this generation.
- A reasoning item's `encrypted_content` is present on `response.output_item.added` as well as on
  `response.output_item.done`, but the two are different ciphertexts and the added one may be
  truncated; only the `done` value is safe to replay. See
  [../openai_responses/docs/openai-responses-streaming-events.md](../openai_responses/docs/openai-responses-streaming-events.md).
- `usage.input_tokens_details` gained `cache_write_tokens` beside `cached_tokens`; cache writes
  bill at 1.25x the uncached input rate.
- `service_tier: "priority"` is accepted and echoed back as `service_tier: "fast"`, where GPT-5.6
  echoed `"priority"`.
- The GPT-5.6 documentation snapshot remains in [`../gpt5_6/`](../gpt5_6/README.md); the Chat
  Completions to Responses migration guide there applies unchanged.

## Official sources

- https://developers.openai.com/api/docs/models (the catalog; read 2026-11-02)
- https://developers.openai.com/api/docs/models/gpt-6-astra
- https://developers.openai.com/api/docs/models/gpt-6.1-sol
- https://developers.openai.com/api/docs/models/gpt-6.1-terra
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/guides/reasoning
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/fast-mode
  (snapshotted in [`../gpt5_6/docs/fast-mode.md`](../gpt5_6/docs/fast-mode.md) and
  [`../openai_responses/docs/openai-fast-mode.md`](../openai_responses/docs/openai-fast-mode.md))
- https://developers.openai.com/api/reference/resources/responses/methods/create
  (snapshotted in [`../openai_responses/docs/openai-responses-create.md`](../openai_responses/docs/openai-responses-create.md))
- https://developers.openai.com/api/reference/resources/responses/streaming-events
  (excerpted in [`../openai_responses/docs/openai-responses-streaming-events.md`](../openai_responses/docs/openai-responses-streaming-events.md))

## GPT-6.1 Sol (added 2026-09-30)

`gpt-6.1-sol` speaks the same Responses contract. Probed live on 2026-09-30: a tool call streams as a `function_call` item, `reasoning.effort` `none` returns 400 `Unsupported value: 'none' is not supported with the 'gpt-6.1-sol' model`, `low` to `max` and `service_tier: "priority"` are accepted, and image input works.

## GPT-6 Luna (added 2026-10-14)

[`gpt-6-luna`](docs/gpt-6-luna.md) uses the same Responses wire format, with text and image input,
a 1,050,000-token context and up to 128,000 output tokens. It accepts `none`, `low`, `medium`,
`high`, `xhigh` and `max`; unlike Astra and GPT-6.1 Sol, `ThinkingLevel.NONE` stays `none`.
A live streaming tool call, tool-result replay without provider item ids, and a `none` request
completed on 2026-10-14. Standard prices per million tokens are $0.10 input, $0.01 cache read,
$0.125 cache write and $0.50 output. Above 272K input, input/cache rates double and output is 1.5x.

Source: https://developers.openai.com/api/docs/models/gpt-6-luna

## GPT-6.1 Terra (added 2026-11-02)

[`gpt-6.1-terra`](docs/gpt-6.1-terra.md) is the fast, efficient model of the generation, for visual
reasoning, precise computer use and writing. It takes text and image input and returns text, with a
1,050,000-token context, at most 922,000 input tokens, up to 128,000 output tokens and a June 1,
2026 knowledge cutoff. `reasoning.effort` takes `none`, `low`, `medium` (the default), `high`,
`xhigh` and `max`; tool calling needs the Responses API, and Chat Completions serves it without
tools. Standard prices per million tokens are $1 input, $0.05 cached input, $1.25 cache write
(30-minute lifetime; $2.50 for 12 hours) and $5 output; above 272K input tokens, input and cache
rates double and output is 1.5x. Fast mode costs 2x Standard and works with EU data residency;
Batch and Flex cost half. Ultrafast mode does not cover Terra.

Probed live on 2026-11-02 (captures under `api_captures/gpt6_1_terra/`):

- The stream is the GPT-6.1 Sol stream: reasoning summaries on
  `response.reasoning_summary_text.delta`, a reasoning item with `content: []`, `summary` and
  `encrypted_content` (again a different ciphertext on `added` and `done`), `function_call` items,
  and assistant messages with `phase: "final_answer"`. The response echoes
  `reasoning.context: "all_turns"`. At `medium` a simple tool call spends no reasoning tokens
  and has no reasoning item.
- `none`, `low`, `medium`, `high`, `xhigh` and `max` are accepted; `minimal` returns 400
  `Unsupported value: 'minimal' is not supported with the 'gpt-6.1-terra' model. Supported values
  are: 'none', 'low', 'medium', 'high', 'xhigh', and 'max'.` `none` works with tools, with a forced
  `tool_choice` and with `reasoning.summary`.
- Replay: a reasoning item without its `summary` key returns 400
  `Missing required parameter: 'input[1].summary'`. One with `summary` and `encrypted_content`
  and no `id` is accepted with the reasoning intact (the same prompt tokens as replaying the item
  whole, and no new reasoning). Without `encrypted_content`, or with only an `id` under
  `store: false`, the API accepts the item but drops the reasoning, and the model reasons again.
  An assistant message is accepted with or without `phase`.
- `service_tier: "priority"` and `"fast"` are accepted and echoed as `"fast"`.
- `tool_choice` `"required"`, `{"type": "function", "name": ...}` and
  `{"type": "allowed_tools", "mode": "required", "tools": [...]}` force a call; an allowed-tools
  object without `type` returns 400 `Missing required parameter: 'tool_choice.type'`.
- An image needing more than 30,000 patches at its own size (6000 x 6000, 35,344 patches) is
  refused with 400 when `detail` is omitted, `auto` or `original`, and read at `high` or `low`.
  GPT-6 Astra, GPT-6.1 Sol and GPT-6 Luna refuse the same image without `detail`.
- `prompt_cache_options: {"ttl": "12h"}` is accepted on the Responses API by GPT-6.1 Terra, GPT-6
  Luna and GPT-5.6 Luna, although the API reference still lists `"30m"` as the only `ttl` (the
  prompt-caching guide documents `"12h"`). The usage then reports the write under
  `input_tokens_details.cache_write_tokens_details.ttl_12h_tokens`, and the same request again reads
  it as `cached_tokens`. GPT-5.5 refuses the field (400 `prompt_cache_options is not supported on
  this model`), OpenAI's Chat Completions refuses `"12h"` (400 `Supported values are: '30m'`),
  OpenRouter's Responses API refuses the field, and its Chat Completions drops the `ttl` and bills
  the 30-minute write rate.
