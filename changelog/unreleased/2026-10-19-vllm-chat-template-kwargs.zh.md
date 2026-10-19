# vLLM 适配器通过 Python SDK 发送 chat_template_kwargs

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `openai_chat_vllm_adapter`, `tests`

[English](2026-10-19-vllm-chat-template-kwargs.md)

## 变更内容

- Python 版 `openai-chat-vllm-adapter` 把 `chat_template_kwargs` 与 SDK 的关键字参数并列传入，而 OpenAI Python SDK 的 `AsyncCompletions.create` 没有这个关键字参数，于是在发出请求之前就抛出 `TypeError: AsyncCompletions.create() got an unexpected keyword argument 'chat_template_kwargs'`。凡是带 `thinking_level` 的请求都会失败，只有 DeepSeek V4 模型的 `none` 档不发送这些参数，不受影响。现在这些参数放在 `extra_body` 中，由 SDK 合并到请求体顶层，请求体中的 `chat_template_kwargs` 与 TypeScript 适配器发送的完全一致。
- 思考等级测试中的 vLLM 用例改为从 `extra_body` 读取这些参数，并检查配置的每个键都是 `AsyncCompletions.create` 接受的关键字参数；两个预期不带参数的测试检查不会添加 `extra_body`。
