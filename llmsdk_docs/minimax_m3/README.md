# MiniMax M-series (M3.1-Flash, M3) SDK Documentation

This directory contains the official-documentation snapshot used to implement MiniMax M3.1-Flash and M3 Responses API support and Subscription Key authentication.

## Quick Start

- **Python users**: See [quickstart.python.md](./quickstart.python.md)
- **TypeScript users**: See [quickstart.typescript.md](./quickstart.typescript.md)

## Documentation

The `docs/` directory contains the official MiniMax documentation used for this protocol:

- [text-generation.md](./docs/text-generation.md) - M3.1-Flash and M3 overview, base URLs, always-on thinking and the `effort` levels per protocol
- [api-overview.md](./docs/api-overview.md) - API-key and Subscription Key overview, model list, and supported SDK surfaces
- [models-intro.md](./docs/models-intro.md) - Current language and multimodal model catalog
- [list-models.md](./docs/list-models.md) - `GET /v1/models` schema and model IDs
- [responses-create.md](./docs/responses-create.md) - `POST /v1/responses` OpenAPI schema: reasoning per model, `service_tier`, `tool_choice`, sampling ranges, input modalities, streaming events, and usage
- [errorcode.md](./docs/errorcode.md) - Common authentication, rate-limit, quota, content, and server error codes
- [text-openai-api.md](./docs/text-openai-api.md) - OpenAI-compatible Chat Completions: `reasoning_effort`, `thinking`, `reasoning_split`, `service_tier`, per-model thinking behavior
- [text-anthropic-api.md](./docs/text-anthropic-api.md) - Anthropic-compatible model coverage, content modalities, tools, `output_config.effort`, and thinking behavior
- [tool-use-interleaved-thinking.md](./docs/tool-use-interleaved-thinking.md) - Tool use, turns without thinking, and the requirement to preserve complete reasoning-bearing assistant history
- [prompt-caching.md](./docs/prompt-caching.md) - Passive caching behavior, cache-hit usage, and pricing semantics
- [pricing-paygo.md](./docs/pricing-paygo.md) - Current and legacy pay-as-you-go model pricing
- [pricing-token-plan.md](./docs/pricing-token-plan.md) - M Plan overview (the former Token Plan pricing and overview URLs redirect here)
- [token-plan-overview.md](./docs/token-plan-overview.md) - Existing Token Plan subscriptions after the M Plan launch
- [index.md](./docs/index.md) - MiniMax's official documentation index and API-spec links

The official Responses page documents SSE support but not the exact event sequence. MMSP verifies event ordering with two-round live captures under the git-ignored `api_captures/minimax_m3/` and `api_captures/minimax_m3_1_flash/` directories and records the observed protocol details in the changelog.

## Official sources

- https://platform.minimax.io/docs/guides/text-generation
- https://platform.minimax.io/docs/api-reference/responses-create
- https://platform.minimax.io/docs/api-reference/models/openai/list-models
- https://platform.minimax.io/docs/api-reference/text-openai-api
- https://platform.minimax.io/docs/api-reference/text-anthropic-api
- https://platform.minimax.io/docs/guides/models-intro
- https://platform.minimax.io/docs/guides/pricing-paygo
- https://platform.minimax.io/docs/guides/text-m3-function-call
- https://platform.minimax.io/docs/guides/pricing-token-plan
- https://platform.minimax.io/docs/m-plan/token-plan-notice
- https://platform.minimax.io/docs/api-reference/api-overview
- https://platform.minimax.io/docs/api-reference/errorcode.md
- https://platform.minimax.io/docs/api-reference/text-prompt-caching.md
- https://platform.minimax.io/docs/llms.txt
