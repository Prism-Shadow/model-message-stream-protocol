# The vLLM adapter sends chat_template_kwargs through the Python SDK

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `openai_chat_vllm_adapter`, `tests`
- **PR:** [#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)

[中文版](2026-10-19-vllm-chat-template-kwargs.zh.md)

## What changed

- `openai-chat-vllm-adapter` in Python passed `chat_template_kwargs` beside the SDK's keyword arguments, and `AsyncCompletions.create` of the OpenAI Python SDK, which takes no such keyword, raised `TypeError: AsyncCompletions.create() got an unexpected keyword argument 'chat_template_kwargs'` before sending anything. Every request with a `thinking_level` failed, except `none` on the DeepSeek V4 models, which sends no kwargs. The kwargs now ride in `extra_body`, which the SDK merges into the request body at top level, so the body carries `chat_template_kwargs` exactly as the TypeScript adapter sends it.
- The vLLM rows of the thinking-level tests read the kwargs from `extra_body` and check that every key of the config is a keyword `AsyncCompletions.create` takes; the two tests that expect no kwargs check that no `extra_body` is added.
