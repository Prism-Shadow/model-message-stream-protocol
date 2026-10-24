# Kimi K3 SDK Documentation

This directory contains documentation for Moonshot's Kimi K3 API, snapshotted from the
official platform documentation (https://platform.kimi.com/docs/) and refreshed in place on
2026-10-23. The pages are shared with Kimi K3.1 Pro (see [../kimi_k3_1/](../kimi_k3_1/README.md)),
so most examples now use `kimi-k3.1-pro`; what they say of the K3 series applies to `kimi-k3`.

## Quick Start

- See [quickstart.md](./quickstart.md) (OpenAI-compatible API, Python and cURL examples)

## Documentation

The `docs/` folder contains detailed guides on Kimi K3 features:

- [thinking-effort.md](./docs/thinking-effort.md) - The `reasoning_effort` parameter (`low`/`high`/`max`, default `max`; reasoning cannot be disabled)
- [tool-choice.md](./docs/tool-choice.md) - `tool_choice` values (`auto`/`none`/`required`/specific function)
- [tool-calling-best-practice.md](./docs/tool-calling-best-practice.md) - K3 tool calling best practices
- [tool-calls.md](./docs/tool-calls.md) - Complete tool calling walkthrough
- [vision.md](./docs/vision.md) - Image and video input (base64 or `ms://<file-id>`; public URLs are not supported)
- [context-caching.md](./docs/context-caching.md) - Context caching: automatic, `5m`/`1h` TTL through `prompt_cache_options`, cache-write billing
- [streaming.md](./docs/streaming.md) - Streaming output (`reasoning_content` and `content` deltas, final usage chunk)
- [chat-api.md](./docs/chat-api.md) - Chat Completion API reference
- [models-overview.md](./docs/models-overview.md) - Model overview
- [pricing.md](./docs/pricing.md) - Pricing and billing rules (the price tables render client-side; see Pricing below)

## Key protocol differences vs Kimi K2.x

- Reasoning is configured with the top-level `reasoning_effort` parameter (`low`/`high`/`max`,
  default `max`) instead of the K2.x `extra_body.thinking` object, and cannot be disabled.
- `tool_choice` additionally supports `required`; forcing a specific function is incompatible
  with reasoning (which is always on).
- Context caching is automatic and needs no cache id. Cache writes are billed separately: the
  optional `prompt_cache_options` (`mode: "implicit"`, `ttl: "5m"` by default or `"1h"`) picks
  the TTL, and usage reports `prompt_tokens_details.cached_tokens` and
  `prompt_tokens_details.cache_write_tokens`. K2.x has no cache writes.
- Multi-turn conversations must replay the complete assistant message exactly as received,
  including `reasoning_content` and `tool_calls`.
- Sampling parameters (temperature and friends) remain fixed, as in K2.x.

## Pricing

From the rendered page https://platform.kimi.com/docs/pricing/chat (2026-10-23), CNY per 1M
tokens, 1,048,576-token context window: `kimi-k3` input (cache miss) ¥20.00, output ¥100.00,
cache hit ¥2.00, cache write ¥20.00 (5min TTL) or ¥40.00 (1h TTL).
