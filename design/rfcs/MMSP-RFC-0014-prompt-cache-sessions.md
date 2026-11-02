# MMSP-RFC-0014 Prompt Cache Sessions

- Feature Name: `session_id`
- Start Date: 2026-11-02
- RFC PR: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Kind: change

[中文版](MMSP-RFC-0014-prompt-cache-sessions.zh.md)

## Abstract

`UniConfig` gains `session_id`, an optional string naming the conversation a request belongs to. A client whose provider takes a prompt cache routing key sends it as `prompt_cache_key`, unchanged up to 64 characters and as its SHA-256 hex digest beyond; every other client ignores it.

## 1. Introduction

A provider keeps a prompt's cached prefix on the machine that served it, so a later request reuses the prefix only if it is routed there. OpenAI routes by a hash of the prefix and, above about 15 requests per minute on one prefix, overflows to machines that hold no entry; its `prompt_cache_key` groups the requests that share a prefix so they reach the same cache (`llmsdk_docs/gpt6/docs/prompt-caching.md`). Kimi asks multi-turn agents to send one `prompt_cache_key` per session (`llmsdk_docs/kimi_k3_1/docs/chat-api.md`: 对于其他多轮对话 Agent，也建议使用此字段), and MiniMax's Responses API takes it as a "prompt cache routing identifier" (`llmsdk_docs/minimax_m3/docs/responses-create.md`).

A caller had no way to say which conversation a request belongs to. MMSP sent a key only on Kimi K2, taken from `trace_id` ([#81](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/81)); [#163](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/163) dropped it on Kimi K3, whose documentation then described its cache as fully automatic, and the key has since returned to the K3 documentation. The owner's words: 支持prompt cache key的端点,我们要在UniConfig里面加一个session id的可选字段,允许用户来通过指定Session id来设置prompt cache key, and 告诉用户推荐设置Session id,这样能增加命中率.

Probes of 2026-11-02 sent `prompt_cache_key` to OpenAI, Moonshot, MiniMax, DeepSeek, Z.AI, OpenRouter, SiliconFlow and TokenDance, on Responses, Chat Completions and embeddings: every endpoint answered 200. OpenAI's Responses API refuses a key longer than 64 characters (400, `string_above_max_length`), counting code points: 64 emoji pass and 65 CJK characters fail. OpenRouter relays the same refusal from OpenAI models on Chat Completions too, while OpenAI's own Chat Completions takes 2000 characters and Moonshot, MiniMax and Z.AI take 300.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Session id*: the value of `UniConfig.session_id`.
- *Prompt cache key*: the string a client sends as `prompt_cache_key`.
- *Character*: a Unicode code point, as Python's `len` counts it and as `Array.from` splits a JavaScript string.

## 3. The `session_id` Key

- `UniConfig` and the TypeScript `UniConfig` interface MUST define `session_id`, an optional string. It names the conversation or agent task a request belongs to and means the same on every client ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#31-uniconfig) §3.1).
- An empty string MUST be treated as unset.
- A caller SHOULD set one session id per conversation, keep it across the conversation's turns and a resumed session, and SHOULD NOT share it with an unrelated conversation. A UUID fits every endpoint as it is.
- `session_id` and `trace_id` are independent: `trace_id` names where a turn is saved ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md)) and sets no prompt cache key.

## 4. The Prompt Cache Key

### 4.1 From a session id

The prompt cache key MUST be the session id when it has at most 64 characters, and otherwise the lowercase hexadecimal SHA-256 digest of its UTF-8 bytes, which has 64. `prompt_cache_key` in `utils.py` and `promptCacheKey` in `utils.ts` compute it, and every client that sends a key MUST use them, so one session id gives one key in both packages ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#6-one-protocol-in-two-packages) §6).

### 4.2 Per client

| Client | Sends |
| --- | --- |
| `openai-official`, `openai-responses` | `prompt_cache_key` on the Responses request |
| `openai-chat`, `openai-chat-vllm-adapter` | `prompt_cache_key` on the Chat Completions request |
| `moonshot-official` | `prompt_cache_key`, on every generation |
| `minimax-official` | `prompt_cache_key` on the Responses request |
| `anthropic-official`, `ant-messages`, `google-official`, `google-genai`, `openai-embedding`, `deepseek-official`, `zai-official` | nothing: the key is ignored |
| `mmsp` | the configuration as given; the server's client applies this table |

- `prompt_cache_key` is a typed parameter of `responses.create` and `chat.completions.create` in both OpenAI SDKs, so both packages MUST send it as one, not through `extra_body`.
- A client MUST NOT raise for `session_id`: a client whose provider takes no key ignores it ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#62-values-with-no-setting) §6.2).
- A client MUST NOT send a gateway's own session field or header for it, such as OpenRouter's `session_id` and `x-session-id`, OpenCode Go's `x-opencode-session` or Fireworks' `x-session-affinity`. A caller reaches those headers through `default_headers`.
- `moonshot-official` MUST NOT send `trace_id` as `prompt_cache_key` on Kimi K2 any more; only `session_id` sets the key, on every Kimi generation.

## 5. The Playground

The playground page MUST send its per-conversation id as `session_id` and generate it with `crypto.randomUUID()`, or from `crypto.getRandomValues` where the page runs outside a secure context and `randomUUID` is missing. A new conversation takes a new id. The playground server MUST NOT send the id it falls back to when a request names none.

## 6. Drawbacks

- An endpoint that ignores the key gains nothing from it, and a caller cannot tell from the response whether the key was used.
- A session id longer than 64 characters reaches the provider as a digest, so a provider's dashboard shows the digest rather than the caller's id.
- A Kimi K2 caller who relied on `trace_id` for the key gets none until it sets `session_id`.

## 7. Rationale and Alternatives

- The key is named for the caller's concept, the conversation, not for one provider's field: OpenAI calls it `prompt_cache_key`, OpenRouter `session_id`, OpenCode Go `x-opencode-session`, Fireworks `x-session-affinity`.
- Over 64 characters, refusing with `UnsupportedParameterError` would make a long id fail on the clients that send a key and pass on the rest; passing it through would fail at OpenAI and at OpenRouter's OpenAI models. The digest keeps one session on one key everywhere, and 64 characters is OpenAI's limit, the strictest probed.
- `deepseek-official` and `zai-official` send nothing although their endpoints accept the field: DeepSeek documents `prompt_cache_key` as not supported and silently ignored, and Z.AI documents no such field. The owner chose not to send it there, though OpenRouter, which serves models of both clients, routes by `prompt_cache_key` when no `session_id` is set.
- Gateway fields stay out because a compatible client carries no vendor's quirks, and `default_headers` already reaches them.
- `session_id` is ignored rather than refused where no key exists, so a caller can set it on every request whatever the model, which is what raises the hit rate where it counts.

## 8. Prior Art

OpenAI's `prompt_cache_key` on Responses and Chat Completions; Kimi's `prompt_cache_key`, required for Kimi Code Plan; MiniMax's `prompt_cache_key`; OpenRouter's `session_id` body field and `x-session-id` header, at most 256 characters, its sticky routing key; OpenCode Go's `x-opencode-session` header; Fireworks' `user` field and `x-session-affinity` header; vLLM's `session_id` request field.

## 9. Future Possibilities

- Sending the key on `deepseek-official` and `zai-official` for their OpenRouter rows, or OpenRouter's own `session_id`.
- vLLM's `session_id` on `openai-chat-vllm-adapter`, once vLLM documents what it does.
