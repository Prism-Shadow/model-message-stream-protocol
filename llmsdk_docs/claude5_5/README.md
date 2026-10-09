# Claude 5.5 SDK Documentation

Snapshot of Anthropic's documentation for Claude Opus 5.5 (`claude-opus-5-5`), Claude Sonnet 5.5 (`claude-sonnet-5-5`) and Claude Haiku 5.5 (`claude-haiku-5-5`), retrieved 2026-10-09 from platform.claude.com.

## Documentation

- [models-overview.md](./docs/models-overview.md) - The current lineup: ids per platform, pricing, thinking modes, default effort
- [pricing.md](./docs/pricing.md) - Model pricing, including Haiku 5.5's long context pricing (prompts over 100,000 tokens pay higher prices)
- [overview-opus-5-5.md](./docs/overview-opus-5-5.md) - Claude Opus 5.5 model page
- [migration-guide-opus-5-5.md](./docs/migration-guide-opus-5-5.md) - Migrating to Opus 5.5: thinking always on, `medium` default effort, forced `tool_choice` returns 400, no sampling parameters, thinking text omitted by default
- [overview-sonnet-5-5.md](./docs/overview-sonnet-5-5.md) - Claude Sonnet 5.5 model page
- [migration-guide-sonnet-5-5.md](./docs/migration-guide-sonnet-5-5.md) - Migrating to Sonnet 5.5: `thinking: {type: "between_tools"}` replaces `disabled` and is accepted only at `high` effort or below, forced `tool_choice` returns 400, cache reads at $0.10 / MTok
- [overview-haiku-5-5.md](./docs/overview-haiku-5-5.md) - Claude Haiku 5.5 model page
- [whats-new-haiku-5-5.md](./docs/whats-new-haiku-5-5.md) - What changed from Haiku 4.5: adaptive thinking on by default, `disabled` accepted at `high` effort or below, 1M context, 128K output
- [migration-guide-haiku-5-5.md](./docs/migration-guide-haiku-5-5.md) - Migrating to Haiku 5.5: `budget_tokens` returns 400, sampling parameters restricted, no prefill, forced `tool_choice` accepted without thinking
