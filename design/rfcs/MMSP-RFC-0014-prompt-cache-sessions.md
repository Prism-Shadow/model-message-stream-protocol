# MMSP-RFC-0014 Prompt Cache Sessions

- Feature Name: `session_id`
- Start Date: 2026-11-02
- RFC PR: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Implementation PR: [#309](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/309)
- Kind: change

[中文版](MMSP-RFC-0014-prompt-cache-sessions.zh.md)

## Abstract

`UniConfig` adds **`session_id`**, an optional string naming the conversation a request belongs to. Clients whose providers accept a prompt cache routing key send it as **`prompt_cache_key`**—unchanged up to **64 characters** and as its **SHA-256 hex digest** beyond—while other clients ignore it.

## 1. Introduction

- **Provider cache routing**: Cached prompt prefixes live on the serving machine:
  - **OpenAI**: Prefix-hash routing overflows above ~15 req/min; `prompt_cache_key` groups shared-prefix requests (`llmsdk_docs/gpt6/docs/prompt-caching.md`).
  - **Kimi**: Recommends one `prompt_cache_key` per multi-turn agent session (`llmsdk_docs/kimi_k3_1/docs/chat-api.md`: `对于其他多轮对话 Agent，也建议使用此字段`).
  - **MiniMax**: Responses API takes `prompt_cache_key` as a "prompt cache routing identifier" (`llmsdk_docs/minimax_m3/docs/responses-create.md`).
- **History & owner request**: MMSP previously sent `trace_id` as the key on Kimi K2 ([#81](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/81)), dropped it on Kimi K3 ([#163](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/163)) when docs called caching automatic, and added `session_id` after K3 restored the key (`支持prompt cache key的端点,我们要在UniConfig里面加一个session id的可选字段,允许用户来通过指定Session id来设置prompt cache key`; `告诉用户推荐设置Session id,这样能增加命中率`).
- **2026-11-02 probes**: OpenAI, Moonshot, MiniMax, DeepSeek, Z.AI, OpenRouter, SiliconFlow, and TokenDance all answered `200` to `prompt_cache_key` across Responses, Chat Completions, and embeddings. OpenAI Responses (and OpenRouter's OpenAI Chat Completions models) reject keys over **64 code points** (`400`, `string_above_max_length`: 64 emoji pass, 65 CJK fail); OpenAI Chat Completions takes 2000, and Moonshot/MiniMax/Z.AI take 300.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Session id**: The value of `UniConfig.session_id`.
- **Prompt cache key**: The string sent upstream as `prompt_cache_key`.
- **Character**: A Unicode code point (Python `len`, JS `Array.from`).

## 3. The `session_id` Key

- **Definition**: `UniConfig` (Python and TypeScript) MUST define optional `session_id: str` naming the conversation or agent task across all clients ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#31-uniconfig) §3.1).
- **Empty string**: MUST be treated as unset.
- **Usage**: Callers SHOULD set one `session_id` (e.g., UUID) per conversation across turns and resumes, and SHOULD NOT share it across unrelated conversations.
- **Independent of `trace_id`**: `trace_id` only names where traces are saved ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md)) and sets no cache key.

## 4. The Prompt Cache Key

### 4.1 From a session id

- **Derivation**: MUST be `session_id` when `<= 64` characters, and the 64-char lowercase hex SHA-256 of its UTF-8 bytes otherwise.
- **Shared helper**: Every key-sending client MUST use `prompt_cache_key` (`utils.py`) / `promptCacheKey` (`utils.ts`) so both packages produce the same key ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#6-one-protocol-in-two-packages) §6).

### 4.2 Per client

| Client | Sends |
| --- | --- |
| `openai-official`, `openai-responses` | `prompt_cache_key` on the Responses request |
| `openai-chat`, `openai-chat-vllm-adapter` | `prompt_cache_key` on the Chat Completions request |
| `moonshot-official` | `prompt_cache_key`, on every generation |
| `minimax-official` | `prompt_cache_key` on the Responses request |
| `anthropic-official`, `ant-messages`, `google-official`, `google-genai`, `openai-embedding`, `deepseek-official`, `zai-official` | nothing: the key is ignored |
| `mmsp` | the configuration as given; the server's client applies this table |

- **Top-level SDK arg**: MUST pass `prompt_cache_key` as a typed argument to `responses.create` and `chat.completions.create`, not via `extra_body`.
- **Silent ignore**: Clients whose providers take no key MUST NOT raise on `session_id` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#62-values-with-no-setting) §6.2).
- **No gateway headers/fields**: Clients MUST NOT send gateway-specific session fields/headers (OpenRouter `session_id` / `x-session-id`, OpenCode Go `x-opencode-session`, Fireworks `x-session-affinity`); callers use `default_headers`.
- **Kimi K2**: `moonshot-official` MUST NOT send `trace_id` as `prompt_cache_key`; only `session_id` sets the key across all Kimi generations.

## 5. The Playground

- **Per-conversation UUID**: The playground page MUST generate `session_id` via `crypto.randomUUID()` (or `crypto.getRandomValues` outside secure contexts) and rotate it per conversation.
- **No server fallback**: The playground server MUST NOT send its internal fallback id when a request omits `session_id`.

## 6. Drawbacks

- **Opaque**: Responses do not indicate whether the endpoint used the key.
- **Hashed long ids**: Ids over 64 chars appear as SHA-256 digests in provider dashboards.
- **Kimi K2 breaking change**: Callers relying on `trace_id` for Kimi K2 cache keys must switch to `session_id`.

## 7. Rationale and Alternatives

- **Concept naming**: Named `session_id` after the conversation rather than one vendor's field (`prompt_cache_key`, `x-opencode-session`, `x-session-affinity`).
- **SHA-256 over 64 chars**: Raising `UnsupportedParameterError` would fail only on key-sending clients; passing raw strings >64 chars fails OpenAI's cap. Hashing maps any length to one valid 64-char key everywhere.
- **Why `deepseek-official` and `zai-official` omit it**: DeepSeek documents `prompt_cache_key` as unsupported/ignored and Z.AI omits it; per owner decision, neither sends it despite OpenRouter routing their models by `prompt_cache_key` when `session_id` is unset.
- **Why gateway headers stay out**: Keeps compatible clients vendor-neutral (`default_headers` covers custom headers).
- **Why unsupported clients ignore**: Lets callers set `session_id` on every request regardless of model, maximizing hit rates where supported.

## 8. Prior Art

- **OpenAI / Kimi / MiniMax**: `prompt_cache_key` (required on Kimi Code Plan).
- **OpenRouter**: `session_id` field and `x-session-id` header (<=256 chars, sticky routing).
- **OpenCode Go / Fireworks / vLLM**: `x-opencode-session` header, Fireworks `user` + `x-session-affinity`, and vLLM `session_id`.

## 9. Future Possibilities

- **OpenRouter routing for DeepSeek/Z.AI**: Sending `prompt_cache_key` or OpenRouter's `session_id` on `deepseek-official` and `zai-official` OpenRouter rows.
- **vLLM adapter**: Sending `session_id` on `openai-chat-vllm-adapter` once vLLM documents its behavior.
