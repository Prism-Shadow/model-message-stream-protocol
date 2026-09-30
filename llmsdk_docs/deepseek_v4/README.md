# DeepSeek SDK Documentation

This directory contains documentation for using the DeepSeek API with OpenAI-compatible SDK patterns.

## Quick Start

- [quickstart.md](./quickstart.md) - First API call with curl, Python, and Node.js

## Documentation

The `docs/` folder contains focused guides for DeepSeek API features:

- [chat_completion_api.md](./docs/chat_completion_api.md) - DeepSeek Chat Completion API reference
- [responses-api.md](./docs/responses-api.md) - Responses API support: streaming events, image input, parameter and input-item coverage
- [kv-cache.md](./docs/kv-cache.md) - Default context caching, hit rules, and usage counters
- [multi-round-chat.md](./docs/multi-round-chat.md) - Stateless multi-turn conversation history
- [vision.md](./docs/vision.md) - Image input on deepseek-v4-flash-vision-exp across the three API formats, with detail levels and limits
- [thinking-mode.md](./docs/thinking-mode.md) - Thinking mode, reasoning content, effort control, and tool-call context rules
- [tool-calls.md](./docs/tool-calls.md) - Tool calling, thinking-mode tool calls, and strict mode
- [models-and-pricing.zh.md](./docs/models-and-pricing.zh.md) - Models and prices (retrieved 2026-09-30): `deepseek-flash` is DeepSeek-V4.1-Flash with image input; `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` are served by it

## Notes

DeepSeek supports OpenAI-compatible and Anthropic-compatible API formats. The examples in this folder focus on the OpenAI-compatible path because it matches the existing SDK documentation style in this repository.
