# MMSP-RFC-0006 Upstream Credentials

- Feature Name: `upstream_credentials`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)
- Kind: spec

[中文版](MMSP-RFC-0006-upstream-credentials.zh.md)

## Abstract

An upstream credential is the key a client sends to its endpoint. A passed key applies to any base URL; an environment key (**`<P>_API_KEY`**) applies only when given no base URL or one of the client's own default endpoints, while any other keyless base URL raises **`ApiKeyRequiredError`** unless the server is open. This spec defines the credential table, resolution rules, open servers, SDK options, and keyless answer-link downloads.

## 1. Introduction

- **Problem ([#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224))**: Environment `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` values were previously sent to arbitrary custom gateways.
- **Credential Table ([#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) MMSP-RFC-0005, [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) MMSP-RFC-0007)**:
  - [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258): Unified all client types into one static table readable without building a client.
  - [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276): Split the vLLM adapter row from OpenAI's and gated extra OpenAI environment variables.
  - [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288), [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290): Keyless non-OpenAI clients on the OpenAI SDK raise `ApiKeyRequiredError` instead of bare built-in errors.

| Date & PR | Changes |
|---|---|
| **2026-11-02 ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308))** | Web search/fetch (`在mmsp里面增加search和fetch的能力,实现方式和embedding类似`): added `other_base_urls` (Jina Reader `https://r.jina.ai` and Search `https://s.jina.ai` share one key) to §2–§4; extended §4's missing-key rule to all official/compatible non-OpenAI clients on the OpenAI SDK. |
| **2026-11-04 ([#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316))** | OpenAI-format image generation (§7): image `url` links (e.g. TokenDance 24h signed Volcano Engine links, vs OpenAI/OpenRouter bytes) are downloaded keyless. |

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Row**: Client type's entry in `CLIENT_CREDENTIALS`.
- **Key**: Passed `api_key`.
- **Base URL**: Passed `base_url`.
- **Default endpoint**: Row's `default_base_url`.
- **Other default endpoints**: Row's `other_base_urls` serving some of the vendor's models.
- **Own default endpoints**: Default endpoint plus other default endpoints.
- **`<P>_API_KEY`**: Variable in `api_key_env` (e.g. `ZAI_API_KEY`).
- **`<P>_BASE_URL`**: Variable in `base_url_env` (e.g. `ZAI_BASE_URL`).
- **Open server**: Keyless-capable server marked `open_server` (`mmsp`, `openai-chat-vllm-adapter`).

## 3. The Credential Table

- **Fields**: `CLIENT_CREDENTIALS` declares key env, base URL env, default endpoint, other default endpoints, and `open_server`.
- **Resolution**: Clients MUST resolve credentials via `resolve_credentials` / `resolveCredentials` and MUST NOT read the environment directly.
- **Purity**: `credentials` MUST use only the standard library and read no environment variables.

## 4. Resolution

| Scenario | Key Used | Endpoint Called |
|---|---|---|
| **Key passed** (any `base_url`) | Passed `api_key` (MUST use) | Passed `base_url`, `<P>_BASE_URL`, or own default endpoint |
| **No key + no `base_url`** | `<P>_API_KEY` (MUST read) | `<P>_BASE_URL`, else model's own default endpoint |
| **No key + own default endpoint** | `<P>_API_KEY` (MUST read) | Passed own default endpoint |
| **No key + other `base_url`** (closed) | MUST raise `ApiKeyRequiredError` on build (pre-request) | None |
| **No key + other `base_url`** (open, §5) | Keyless (`EMPTY` on vLLM) | Passed `base_url` |

- **URL matching**: Trim whitespace, compare scheme/host case-insensitively, strip trailing path slashes, and match the remainder verbatim.
- **Non-OpenAI clients on OpenAI SDK**: Official/compatible clients whose key variable is not `OPENAI_API_KEY` MUST raise `ApiKeyRequiredError` when neither passed a key nor set in `<P>_API_KEY` (preventing `OPENAI_API_KEY` fallback); open servers send a placeholder (§5).

## 5. Open Servers

- **Passed `base_url` without key**: MUST call any passed `base_url` (including its default endpoint) keyless, regardless of `<P>_API_KEY`.
- **No `base_url` passed**: Reads `<P>_API_KEY`; if unset, calls `<P>_BASE_URL` or default endpoint keyless.
- **vLLM placeholder**: Since the OpenAI SDK requires a key, the vLLM adapter sends `EMPTY` when keyless.

## 6. What the SDKs Are Handed

To prevent Anthropic and OpenAI SDKs from reading environment variables against §4, clients MUST pass explicit values:
- **Anthropic**: Sends its own key, never `ANTHROPIC_AUTH_TOKEN`.
- **OpenAI SDK**: Sends `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET`, and `OPENAI_CUSTOM_HEADERS` via `openai_client_options` / `openaiClientOptions` only where `OPENAI_API_KEY` goes.

## 7. Links in an Answer

- **Own HTTP client**: Answer links (e.g. generated image `url`) MUST be downloaded with the client's own HTTP client, not its SDK's.
- **No credentials**: Downloads MUST send no key, default headers, or environment variables.

## 8. Conformance

- **Implementation**: `CLIENT_CREDENTIALS` and `environment_credential` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`; `resolve_credentials` / `resolveCredentials` and `openai_client_options` / `openaiClientOptions` in `utils.py` / `utils.ts`.
- **SDK env tests**: `src_py/tests/test_env_credentials.py` / `src_ts/tests/env-credentials.test.ts`.
- **Unit tests**: `test_credentials.py` / `credentials.test.ts`.
