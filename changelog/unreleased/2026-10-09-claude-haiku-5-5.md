# Support Claude Haiku 5.5

- **Date:** 2026-10-09
- **Type:** feature
- **Scope:** `anthropic_official`, `registry`

[中文版](2026-10-09-claude-haiku-5-5.zh.md)

## What changed

- `anthropic-official` serves `claude-haiku-5-5`, matched by version on every platform, Bedrock's `anthropic.` prefix included:
  - `thinking_level="none"` sends adaptive thinking at `low` effort, as on Opus 5.5 and Fable 5.1, and the other levels send the effort of the same name.
  - `tool_choice="required"` and a list of tool names raise `UnsupportedParameterError`, as on Opus 5.5 and Sonnet 5.5.
  - `fast_mode` raises `UnsupportedParameterError`.
- `list_supported_models` lists `claude-haiku-5-5` at $0.10 / $0.50 per million tokens with cache reads at $0.01, the price for prompts up to 100K tokens (every rate is 5x above it), and OpenRouter's `anthropic/claude-haiku-5.5` at the same prices. Cache reads on `claude-sonnet-5-5` and `anthropic/claude-sonnet-5.5` drop to $0.10.
- The end-to-end tests also run `claude-haiku-5-5`.
- `llmsdk_docs/claude5_5/` adds the Haiku 5.5 pages and Anthropic's pricing page. The site and the skills list the new model.
