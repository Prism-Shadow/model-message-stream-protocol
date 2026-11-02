# session_id: the conversation's prompt cache key

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `types`, `utils`, `openai_official`, `openai_responses`, `openai_chat`, `moonshot_official`, `minimax_official`, `integration`, `docs`

[中文版](2026-11-02-session-id.zh.md)

## What changed

- `UniConfig.session_id` was added in both packages, as [MMSP-RFC-0014](../../design/rfcs/MMSP-RFC-0014-prompt-cache-sessions.md) specifies: an optional string naming the conversation a request belongs to. The docs recommend one stable id per conversation, because it raises the prompt cache hit rate.
- `openai-official`, `openai-responses`, `openai-chat` (and `openai-chat-vllm-adapter`, which inherits it), `moonshot-official` on every Kimi generation and `minimax-official` sent it as `prompt_cache_key`, a typed parameter of both OpenAI SDKs. An empty string sent nothing.
- `prompt_cache_key` in `utils.py` and `promptCacheKey` in `utils.ts` gave the key: the session id itself up to 64 characters, counted in code points, and the lowercase hex SHA-256 digest of its UTF-8 bytes beyond, since OpenAI's Responses API and OpenAI's models behind OpenRouter refuse a longer key.
- `anthropic-official`, `ant-messages`, `google-official`, `google-genai`, `openai-embedding`, `deepseek-official` and `zai-official` ignored it; the `mmsp` client forwarded it in the configuration as given.
- `moonshot-official` stopped sending `trace_id` as `prompt_cache_key` on Kimi K2; a Kimi K2 caller sets `session_id` for the key.
- The playground page generated its per-conversation id with `crypto.randomUUID()`, or from `crypto.getRandomValues` outside a secure context, and both playground servers sent it as the request's `session_id`, unless the request's configuration carried one; a request that named no session sent none.
- The configuration page gained a `session_id` row, example value and section, and lost the Kimi K2 row of `trace_id`; the quickstart, `README.md`, `src_py/README.md` and the data-model references of both MMSP skills gained the key.

## Configuration behavior

| Client | `session_id` is sent as |
| --- | --- |
| `openai-official`, `openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `moonshot-official`, `minimax-official` | `prompt_cache_key`: the id up to 64 characters, its SHA-256 hex digest beyond |
| `anthropic-official`, `ant-messages`, `google-official`, `google-genai`, `openai-embedding`, `deepseek-official`, `zai-official` | ignored |
| `mmsp` | forwarded in the configuration |
