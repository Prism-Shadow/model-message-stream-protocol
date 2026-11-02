# MMSP-RFC-0018 提示缓存会话

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`

[English](2026-11-02-rfc-prompt-cache-sessions.md)

## 变更内容

- 新增 `change` 类 RFC [MMSP-RFC-0018](../../design/rfcs/MMSP-RFC-0018-prompt-cache-sessions.zh.md) 提示缓存会话：`UniConfig` 新增 `session_id`，即请求所属的对话，`openai-official`、`openai-responses`、`openai-chat` 及其 vLLM 适配器、`moonshot-official` 与 `minimax-official` 把它作为 `prompt_cache_key` 发送，64 个字符以内原样发送，超过时发送它的 SHA-256 十六进制摘要，其他客户端忽略它；Kimi K2 不再把 `trace_id` 作为这个键发送，Playground 把它每个对话的 id 作为 `session_id` 发送。
- `design/README.md` 与 `design/README.zh.md` 收录了它。
