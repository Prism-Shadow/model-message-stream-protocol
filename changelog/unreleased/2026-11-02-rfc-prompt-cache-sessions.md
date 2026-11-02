# MMSP-RFC-0018 Prompt Cache Sessions

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`
- **PR:** [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)

[中文版](2026-11-02-rfc-prompt-cache-sessions.zh.md)

## What changed

- Added [MMSP-RFC-0018](../../design/rfcs/MMSP-RFC-0018-prompt-cache-sessions.md) Prompt Cache Sessions, a `change` RFC: `UniConfig` gains `session_id`, the conversation a request belongs to, which `openai-official`, `openai-responses`, `openai-chat` with its vLLM adapter, `moonshot-official` and `minimax-official` send as `prompt_cache_key`, unchanged up to 64 characters and as its SHA-256 hex digest beyond, while every other client ignores it; Kimi K2 stops sending `trace_id` as the key, and the playground sends its per-conversation id as `session_id`.
- `design/README.md` and `design/README.zh.md` indexed it.
