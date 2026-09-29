# Anthropic Messages Protocol Documentation

This directory contains the official-documentation snapshot used to implement MMSP's
generic `ant_messages` client - the Anthropic Messages-compatible protocol as served by
Anthropic, OpenRouter, DeepSeek, Z.AI, and MiniMax.

## Documentation

- [anthropic-messages-create.md](./docs/anthropic-messages-create.md) - Anthropic's
  `POST /v1/messages` reference (beta surface): request schema, `thinking`
  (`enabled`/`disabled`/`adaptive`), `output_config.effort`, `speed`, streaming events
- [anthropic-fast-mode.md](./docs/anthropic-fast-mode.md) - Fast mode research preview:
  `speed: "fast"` with the `fast-mode-2026-02-01` beta header, supported models, pricing,
  rate limits, and `usage.speed`
- [openrouter-create-a-message.md](./docs/openrouter-create-a-message.md) - OpenRouter's
  `POST /api/v1/messages` OpenAPI spec (Bearer auth, thinking with
  `enabled`/`disabled`/`adaptive`, `output_config.effort`)
- [deepseek-anthropic-api.md](./docs/deepseek-anthropic-api.md) - DeepSeek's Anthropic API
  compatibility tables (`base_url` `https://api.deepseek.com/anthropic`): `thinking`
  supported (`budget_tokens` ignored), `output_config` effort only, no image inputs
- [zai-coding-endpoints.md](./docs/zai-coding-endpoints.md) - Z.AI GLM Coding Plan base URLs
  for the three protocols (Anthropic Messages: `https://api.z.ai/api/anthropic`)
- MiniMax's `POST /anthropic/v1/messages` reference is snapshotted in
  [`../minimax_m3/docs/text-anthropic-api.md`](../minimax_m3/docs/text-anthropic-api.md)

## Cross-provider differences (verified with live captures)

| Behavior | Anthropic official | OpenRouter / DeepSeek / Z.AI / MiniMax |
|----|----|----|
| Auth headers | `x-api-key` (Bearer also tolerated) | OpenRouter/Z.AI read `Authorization: Bearer`; DeepSeek reads `x-api-key`; MiniMax reads both - sending the credential through both headers works everywhere |
| Usage location | real `input_tokens` in `message_start`, output in `message_delta` | `message_start` usage is zero/None; `message_delta` carries the full input/cache/output counts |
| Thinking replay | `signature` required on thinking blocks | signature emitted (DeepSeek/Z.AI/MiniMax) but replay without it is accepted |
| `thinking: {"type": "disabled"}` | accepted | accepted everywhere (needed for GLM, whose thinking defaults on) |
| `speed: "fast"` | gated research preview (429 with zero fast-mode quota until the org has access); requires the `fast-mode-2026-02-01` beta header | silently ignored |
| `thoughts` usage split | none | OpenRouter reports `output_tokens_details.thinking_tokens` |

The captures under `api_captures/ant_messages/` (git-ignored) are the authoritative wire
reference; replay-minimality probe results live next to each capture in `probes.json`.

## Official sources

- https://platform.claude.com/docs/en/api/typescript/beta/messages/create
- https://platform.claude.com/docs/en/build-with-claude/fast-mode
- https://openrouter.ai/docs/api/api-reference/anthropic-messages/create-a-message
- https://api-docs.deepseek.com/guides/anthropic_api
- https://platform.minimax.io/docs/api-reference/text-chat-anthropic
- https://docs.z.ai/devpack/tool/others
