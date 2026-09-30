# GPT-5.6 SDK Documentation

This directory contains the official-documentation snapshot for OpenAI's GPT-5.6 generation
(`gpt-5.6-sol` / `gpt-5.6-terra` / `gpt-5.6-luna`; the `gpt-5.6` alias routes to `gpt-5.6-sol`),
snapshotted as raw markdown from https://developers.openai.com/.

## Documentation

- [latest-model.md](./docs/latest-model.md) - Using GPT-5.6: model variants, `reasoning.effort`
  levels (`none`/`low`/`medium`/`high`/`xhigh`/`max`), `reasoning.mode: "pro"`, persisted
  reasoning (`reasoning.context`), explicit prompt caching, and migration guidance
- [migrate-to-responses.md](./docs/migrate-to-responses.md) - Chat Completions to Responses API
  migration guide (GPT-5.6 edition)
- [fast-mode.md](./docs/fast-mode.md) - Fast mode via `service_tier: "priority"` (or `"fast"`),
  up to 2.5x faster processing at premium pricing

## Key protocol notes vs GPT-5.5

- The wire protocol is identical to GPT-5.5 (verified with live captures under
  `api_captures/openai_responses/openai*/`): reasoning summaries stream via
  `response.reasoning_summary_text.delta`, reasoning items carry `id` + `encrypted_content`
  (emitted by default with `store: false`, no `include` needed), assistant messages carry
  `phase`, and replayed reasoning items must include the `summary` key (the API returns 400
  without it). GPT-5.6 therefore shares the `gpt5_6` client with GPT-5.4 and GPT-5.5.
- `reasoning.effort` adds `max` above `xhigh`; MMSP's `ThinkingLevel.XHIGH` continues to
  map to `xhigh`.
- Fast mode: `service_tier: "priority"` is accepted and echoed back as
  `service_tier: "priority"` in the response.
- The GPT-5.5 documentation snapshot remains in [`../gpt5_5/`](../gpt5_5/).

## Official sources

- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/guides/migrate-to-responses
- https://developers.openai.com/api/docs/guides/fast-mode
- https://developers.openai.com/api/reference/resources/responses/methods/create
  (snapshotted in [`../openai_responses/docs/openai-responses-create.md`](../openai_responses/docs/openai-responses-create.md))
