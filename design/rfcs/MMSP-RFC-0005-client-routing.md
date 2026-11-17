# MMSP-RFC-0005 Client Routing

- Feature Name: `client_routing`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)
- Kind: spec

[中文版](MMSP-RFC-0005-client-routing.zh.md)

## Abstract

Client routing selects the client for **`AutoLLMClient`** from a **`client_type`** and model id. A **`client_type`** maps via the client-type table; without one, the model id's family prefix selects the vendor's official client, or raises **`RoutingError`** if unknown. Model ids match by prefix or whole id, never by substring or version.

## 1. Introduction

- **Problem ([#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228))**: Substring routing matched gateway ids like `moonshotai/kimi-k3` by spelling accident and needed new code per generation.
- **Table Routing ([#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0004, [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0006)**: Client-type and family tables make routing explicit; unknown families require `client_type`.

| Date & PR | Changes |
|---|---|
| **2026-11-02 ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308))** | Web search/fetch (`在mmsp里面增加search和fetch的能力,实现方式和embedding类似`): `deepseek-official` routes `deepseek-search` and `deepseek-fetch` to `deepseek-webtool` (§3); Jina uses family `jina-`; non-listing endpoints (including Bedrock on `anthropic-official`) raise `UnsupportedOperationError` in `list_models` (§5). |
| **2026-11-04 ([#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316))** | OpenAI-format compatible clients `openai-image`, `openai-speech`, `openai-transcription`: `openai-official` routes `gpt-image-` to `openai-image` (§3); non-family gateway ids (`bytedance-seed/seedream-5-0-flash`, `fish-audio/drama-3`) require `client_type`. |
| **2026-11-16 ([#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330))** | DeepSeek TTS/ASR (`把deepseek的tts和asr包一下`) on `/v1/tools/tts` and `/v1/tools/asr`: `deepseek-official` routes `deepseek-tts` to `deepseek-speech` and `deepseek-asr` to `deepseek-transcription` (§3); neither lists models. |

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Client type**: Name in `OFFICIAL_CLIENT_TYPES` or `COMPATIBLE_CLIENT_TYPES`, passed as `client_type` or `CLIENT_TYPE`.
- **Official client**: Client speaking a vendor's native API for its models.
- **Compatible client**: Client speaking one wire protocol for any supporting endpoint.
- **Family**: Prefix in `MODEL_FAMILIES` (e.g. `claude-`, `kimi-`) mapping vendor model ids to an official client.
- **Named client**: Client chosen by a client type.
- **Deduced client**: Client chosen by the model id's family.

## 3. Client Types

- **All generations**: An official client serves all generations of its vendor's models until retired.
- **Precedence**: Code `client_type` MUST override `CLIENT_TYPE` (used only when code omits it).
- **Case & aliases**: Client types MUST match case-insensitively, including legacy aliases `openai` (`openai-chat`), `gemini-official` (`google-official`), and `gemini-generate-content` (`google-genai`).
- **Sub-client delegation** (MUST apply named or deduced, matched case-insensitively):

| Official Client | Model Id | Match | Target Client |
|---|---|---|---|
| `openai-official` | `text-embedding-` | Prefix | `openai-embedding` |
| `openai-official` | `gpt-image-` | Prefix | `openai-image` |
| `deepseek-official` | `deepseek-search`, `deepseek-fetch` | Whole id | `deepseek-webtool` |
| `deepseek-official` | `deepseek-tts` | Whole id | `deepseek-speech` |
| `deepseek-official` | `deepseek-asr` | Whole id | `deepseek-transcription` |

## 4. Routing by Model Id

- **Prefix match**: Without a client type, the model id's case-insensitive family prefix MUST select the client; routing MUST NOT match substrings or versions.
- **Errors**: Unknown families MUST raise `RoutingError` (asking for a client type); unknown client types MUST raise `RoutingError` for any model id.
- **Generations**: Internal generation matching follows [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#61-explicit-matching) §6.1.

## 5. Listing Models

- **Named client**: `list_models` MUST return all endpoint models in endpoint order.
- **Deduced client**: `list_models` MUST return only ids whose family maps to the same official client (filtering multi-vendor gateways), in endpoint order.
- **No model listing**: Endpoints without model listing MUST raise `UnsupportedOperationError` from `list_models` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1), named or deduced.

## 6. Changing the Tables

Adding a family or client type row is a normal change; changing table semantics MUST go through an RFC.

## 7. Conformance

- **Implementation**: `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` (`MODEL_FAMILIES`, `client_type_for_model` / `clientTypeForModel`, `routed_client_type` / `routedClientType`), used by `src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts`.
- **Client tests**: `src_py/tests/test_client.py` / `src_ts/tests/client.test.ts` (type/family routing, unknown family/type errors, environment routing, catalog coverage).
- **Credential tests**: `test_credentials.py` / `credentials.test.ts`.
- **List-models tests**: `test_list_models.py` / `list-models.test.ts`.
