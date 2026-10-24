# Kimi K3.1 Pro SDK Documentation

Snapshot of Moonshot's documentation for Kimi K3.1 Pro (`kimi-k3.1-pro`) and its high-speed
variant (`kimi-k3.1-pro-highspeed`), retrieved 2026-10-23 as raw Markdown (`<page>.md`) from
the official platform documentation (https://platform.kimi.com/docs/).

## Quick Start

- See [quickstart.md](./quickstart.md) (OpenAI-compatible API, Python and cURL examples, limits, FAQ)

## Documentation

The `docs/` folder contains detailed guides on Kimi K3.1 Pro features:

- [models.md](./docs/models.md) - Model list: `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed`, `kimi-k3`, K2.x, retired models
- [models-overview.md](./docs/models-overview.md) - Parameter constraints per model; both K3.1 Pro ids share `kimi-k3`'s
- [pricing.md](./docs/pricing.md) - Pricing and billing rules (the price tables render client-side; see [Pricing](#pricing))
- [limits.md](./docs/limits.md) - Recharge tiers and rate limits (table renders client-side; see [Rate limits](#rate-limits))
- [thinking-effort.md](./docs/thinking-effort.md) - The `reasoning_effort` parameter (`low`/`high`/`max`, default `max`)
- [thinking-models.md](./docs/thinking-models.md) - `reasoning_content`, Preserved Thinking, per-model reasoning fields
- [streaming.md](./docs/streaming.md) - Streaming output (`reasoning_content`, `content`, `tool_calls` deltas, final usage chunk)
- [vision.md](./docs/vision.md) - Image and video input (base64 or `ms://<file-id>`; public URLs are not supported)
- [response-format.md](./docs/response-format.md) - JSON Mode and Structured Output (`response_format`)
- [partial-mode.md](./docs/partial-mode.md) - Partial Mode (`partial: true` on the last assistant message)
- [tool-choice.md](./docs/tool-choice.md) - `tool_choice` values (`auto`/`none`/`required`/specific function)
- [dynamic-tool-loading.md](./docs/dynamic-tool-loading.md) - `{"role": "system", "tools": [...]}` messages without `content`
- [tool-calling-best-practice.md](./docs/tool-calling-best-practice.md) - K3 tool calling best practices
- [tool-calls.md](./docs/tool-calls.md) - Complete tool calling walkthrough
- [official-tools.md](./docs/official-tools.md) - Official tools through the Formula API
- [context-caching.md](./docs/context-caching.md) - Context caching: `5m`/`1h` TTL, cache-write billing, usage fields per API
- [chat-api.md](./docs/chat-api.md) - Chat Completions API reference (OpenAPI schema)
- [errors.md](./docs/errors.md) - Error response shape and error types by HTTP status
- [api-overview.md](./docs/api-overview.md) - Base URLs of the three compatible APIs and authentication
- [responses-api.md](./docs/responses-api.md) - Responses API reference (`/v1/responses`)
- [messages-api.md](./docs/messages-api.md) - Anthropic Messages-compatible API reference (`https://api.moonshot.cn/anthropic`)

## Key protocol differences vs Kimi K3

None on the wire. The Chat Completions OpenAPI schema maps `kimi-k3.1-pro` and
`kimi-k3.1-pro-highspeed` to `KimiK31ProChatRequest`, which is `KimiK3ChatRequestBase` (the
base of `kimi-k3`'s request) plus the model enum, and the parameter reference states that both
ids have exactly `kimi-k3`'s parameter constraints. The quickstart repeats K3's contract
line for line. What differs:

- **Model ids**: `kimi-k3.1-pro` and `kimi-k3.1-pro-highspeed`. The high-speed variant has the
  same intelligence and roughly 2-3x the output speed.
- **Prices**: see [Pricing](#pricing). The high-speed variant costs twice the input, output and
  cache-write prices of `kimi-k3.1-pro`, with the same cache-hit price.
- **Vision**: the vision guide names `kimi-k3.1-pro` (not the high-speed id) for image and video
  input; the model list files both ids under multimodal models.

Shared with `kimi-k3`, per these docs:

- Reasoning is always on and cannot be disabled; top-level `reasoning_effort` takes `low`,
  `high` or `max` (default `max`). The K2.x `thinking` parameter is not used. Preserved Thinking
  is always on: multi-turn and tool-calling requests replay the complete assistant message,
  `reasoning_content` and `tool_calls` included. Switching effort mid-session breaks prefix
  cache hits.
- `temperature` 1.0, `top_p` 0.95, `n` 1, `presence_penalty` 0 and `frequency_penalty` 0 are
  fixed; other values return an error.
- 1,048,576-token context window; `max_completion_tokens` defaults to 131072 and accepts up to
  1048576 (`max_tokens` is deprecated).
- `tool_choice` takes `auto` (default), `none` or `required`; forcing a specific function returns
  400 (`tool_choice 'specified' is incompatible with thinking enabled`).
- Dynamic tool loading is supported only on `kimi-k3.1-pro` and `kimi-k3`.
- Image and video input as base64 data URLs or `ms://<file-id>`; `content` must be an object
  array.

## Changes since the kimi_k3 snapshot (whole K3 series)

These apply to `kimi-k3` as much as to K3.1 Pro; the [kimi_k3](../kimi_k3/README.md) files were
refreshed in place with the same pages.

- **Cache writes are billed separately, with a TTL.** The new request field
  `prompt_cache_options` takes `mode` (only `"implicit"`) and `ttl` (`"5m"`, the default, or
  `"1h"`); omitting it writes with the `5m` TTL. Applies to `kimi-k3.1-pro`,
  `kimi-k3.1-pro-highspeed` and `kimi-k3`, not to K2.x. A cache entry's TTL is fixed at the first
  write, the two TTLs are separate caches, caches are scoped to the organization, a hit renews the
  entry at its own TTL, and a partial block is billed as a miss. The Chat Completions response does
  not echo the applied mode or TTL. `prompt_cache_breakpoint` in `content` is rejected with HTTP 400.
- **Usage**: `usage.prompt_tokens` is the total input;
  `usage.prompt_tokens_details.cached_tokens` (cache read) and
  `usage.prompt_tokens_details.cache_write_tokens` (cache write) are disjoint from the uncached
  part, which is `prompt_tokens - cached_tokens - cache_write_tokens`. The examples also carry
  `completion_tokens_details.reasoning_tokens`, and the schema still lists a top-level
  `usage.cached_tokens`. The example responses show `prompt_tokens_details` with
  `cache_write_tokens` only, although the schema marks both fields required. The response headers
  `Msh-Usage-Cache-Write-Tokens-5m` and `Msh-Usage-Cache-Write-Tokens-1h` give the per-TTL write
  counts.
- **Streaming usage**: with `stream_options.include_usage=true`, a final chunk with
  `choices: []` and a top-level `usage` arrives before `data: [DONE]`, and only that chunk carries
  the full cache read/write detail. The streaming guide's sample still also puts a
  `choices[0].usage` on the `finish_reason` chunk. The earlier snapshot documented usage only
  inside `choices[0]` of the last chunk.
- `max_completion_tokens`: when `prompt_tokens + max_completion_tokens` exceeds the context
  window, the API lowers the generation limit and proceeds instead of returning
  `invalid_request_error`; the input itself must be shorter than the window.
- Tool function names follow `^[a-zA-Z_][a-zA-Z0-9-_]{0,127}$` (previously `{2,63}`).
- The K3 request schema now lists `logprobs`, `top_logprobs` (0-20) and `prediction`.
- Optional `X-Msh-Request-Nonce` request header: the response then carries
  `Msh-Request-Timestamp` and `Msh-Request-Signature`.
- Moonshot now documents a Responses API (`https://api.moonshot.cn/v1/responses`, same
  `prompt_cache_options`, usage in `input_tokens_details`) and an Anthropic Messages API
  (`https://api.moonshot.cn/anthropic`, top-level `cache_control: {"type": "ephemeral", "ttl": ...}`).
- `kimi-k2.5` and the `moonshot-v1` series were retired on 2026-08-31 (calls return 404). The K2
  series closes to new users on 2026-10-31 and is planned to go offline at the end of December.

## Pricing

The Markdown export of [pricing.md](./docs/pricing.md) leaves its price tables empty (they are
client-rendered components). These values were read from the compiled content of the rendered
page https://platform.kimi.com/docs/pricing/chat on 2026-10-23. CNY per 1M tokens; every K3
series model has a 1,048,576-token context window.

| Model | Input (cache miss) | Output | Cache hit | Cache write (5min) | Cache write (1h) |
| - | - | - | - | - | - |
| `kimi-k3.1-pro` | ¥13.00 | ¥68.00 | ¥1.30 | ¥13.00 | ¥26.00 |
| `kimi-k3.1-pro-highspeed` | ¥26.00 | ¥136.00 | ¥1.30 | ¥26.00 | ¥52.00 |
| `kimi-k3` | ¥20.00 | ¥100.00 | ¥2.00 | ¥20.00 | ¥40.00 |

Calling K3.1 Pro requires a recharge (minimum ¥10); the ¥15 voucher given to new users cannot
be spent on it.

## Rate limits

[limits.md](./docs/limits.md) has the same empty table; values from the rendered page
https://platform.kimi.com/docs/pricing/limits on 2026-10-23 (vouchers do not count toward the
cumulative recharge):

| Tier | Cumulative recharge | Concurrency | RPM | TPM | TPD |
| - | - | - | - | - | - |
| Tier0 | ¥0 | 1 | 3 | 500,000 | 1,500,000 |
| Tier1 | ¥50 | 15 | 100 | 2,000,000 | Unlimited |
| Tier2 | ¥100 | 40 | 100 | 3,000,000 | Unlimited |
| Tier3 | ¥500 | 50 | 200 | 3,000,000 | Unlimited |
| Tier4 | ¥5,000 | 60 | 200 | 4,000,000 | Unlimited |
| Tier5 | ¥20,000 | 100 | 300 | 5,000,000 | Unlimited |
