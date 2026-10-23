# 值为 0 的 token 计数保留为 0，未给出的计数保留为 null

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `anthropic_official`, `google_official`, `google_genai`, `openai_chat`, `openai_responses`
- **PR:** [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279)

[English](2026-10-23-usage-zero-counts.md)

## 变更内容

- TypeScript 的 `AnthropicOfficialClient`、`OpenaiChatClient`、`ZAIOfficialClient` 与 `MoonshotOfficialClient` 把值为 0 的 `cache_read_input_tokens`、`prompt_tokens_details.cached_tokens` 或 `completion_tokens_details.reasoning_tokens` 报告为 0，与 Python 一致；此前报告为 `null`。
- 两个包中的 `GoogleOfficialClient` 与 `GoogleGenaiClient` 把值为 0 的缓存、思考或输出计数报告为 0；此前报告为 `null` / `None`。用量中没有 `total_input_tokens` 时，`GoogleOfficialClient` 把 `prompt_tokens` 报告为 `null` / `None`；此前报告为 0。
- 用量中没有 `input_tokens_details` 或 `output_tokens_details` 时，`OpenaiResponsesClient`、`DeepSeekOfficialClient` 与 `MiniMaxOfficialClient` 把 `cached_tokens` 与 `thoughts_tokens` 报告为 `null` / `None`；此前两个包都报告为 0。此时 `prompt_tokens` 与 `response_tokens` 即输入与输出计数。
- `test_unknown_events.py` 与 `unknown-events.test.ts` 让每个流式客户端分别处理一份每项计数都为 0 的用量，以及一份省略了服务商可能省略的各项计数的用量，并检查 `stop` 事件的 `usage_metadata`。
