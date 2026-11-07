# The OpenAI Chat client sends a thinking level as reasoning_effort

- **Date:** 2026-11-07
- **Type:** fix
- **Scope:** `openai_chat`
- **Issue:** [#321](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/321)

[中文版](2026-11-07-openai-chat-reasoning-effort.zh.md)

## What changed

- `transformUniConfigToModelConfig` / `transform_uni_config_to_model_config` sent no reasoning parameter, so `UniConfig.thinking_level` never reached an `openai-chat` endpoint: a model that reasons only on request answered without thinking whatever level a caller set.
- The level now goes out as `reasoning_effort` — `low` as `low`, `medium` and `high` as `high`, `xhigh` as `xhigh`, `max` as `max`, and `none` as nothing, because the endpoints that reason by default offer no off switch and the ones that wait to be asked are off already. `medium` becomes `high` because the scale has no `medium` and rejects a value it does not know (`400 … supported values: ['none', 'low', 'high', 'xhigh', 'max']`).
- Whether a model takes the parameter is the endpoint's own answer: `_reasoningEffort` / `_reasoning_effort` reads `capabilities.reasoning` from the endpoint's model list, once per client, and returns the mapped value only for a model that says true. A model that says false, and every endpoint that publishes no capabilities — the vLLM adapter's included — is sent nothing, so its requests are unchanged.
- The lookup is asynchronous, so it happens in `_streamingResponseInternal` / `_streaming_response_internal` after the config is transformed rather than inside the transform, which stays synchronous for the adapter that overrides it.
- `tests/thinking-level-mapping` and `tests/test_thinking_level_mapping.py` cover the mapping, the gate and the request body.
