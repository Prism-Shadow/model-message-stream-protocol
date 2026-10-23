# Token counts of 0 kept as 0, and counts not sent kept null

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `anthropic_official`, `google_official`, `google_genai`, `openai_chat`, `openai_responses`
- **PR:** [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279)

[中文版](2026-10-23-usage-zero-counts.zh.md)

## What changed

- `AnthropicOfficialClient`, `OpenaiChatClient`, `ZAIOfficialClient` and `MoonshotOfficialClient` in TypeScript reported a `cache_read_input_tokens`, `prompt_tokens_details.cached_tokens` or `completion_tokens_details.reasoning_tokens` of 0 as 0, where they had reported `null`, as Python did.
- `GoogleOfficialClient` and `GoogleGenaiClient` reported a cached, thought or output count of 0 as 0 in both packages, where they had reported `null` / `None`. `GoogleOfficialClient` reported `prompt_tokens` as `null` / `None` when the usage carried no `total_input_tokens`, where it had reported 0.
- `OpenaiResponsesClient`, `DeepSeekOfficialClient` and `MiniMaxOfficialClient` reported `cached_tokens` and `thoughts_tokens` as `null` / `None` when the usage carried no `input_tokens_details` or `output_tokens_details`, where both packages had reported 0; `prompt_tokens` and `response_tokens` were then the input and output counts.
- `test_unknown_events.py` and `unknown-events.test.ts` drove every streaming client over a usage sending each count as 0 and over one leaving out each count the provider may leave out, and checked the `usage_metadata` of the `stop` event.
