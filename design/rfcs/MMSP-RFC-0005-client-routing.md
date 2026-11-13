# MMSP-RFC-0005 Client Routing

- Feature Name: `client_routing`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)
- Kind: spec

[中文版](MMSP-RFC-0005-client-routing.zh.md)

## Abstract

Client routing chooses the client an `AutoLLMClient` is built on, from a client type and a model id. A client type names its client through one table of client types; without one, the family prefix a model id begins with names the vendor's official client, and an id of no known family raises `RoutingError`. Model ids are matched by prefix or as whole ids, never by substring or version.

## 1. Introduction

Before [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) some model ids routed by a substring, so a gateway's id such as `moonshotai/kimi-k3` reached a client by an accident of its spelling, and a new generation needed a new match rather than a row. With one table of client types and one table of families, a reader can tell from the tables which client a model id reaches, and an id of no known family asks for a `client_type` instead of guessing. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0004 and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0006.

On 2026-11-02 the owner asked for web search and page fetch, done the way embedding is: 在mmsp里面增加search和fetch的能力,实现方式和embedding类似. As `openai-official` serves OpenAI's embedding models through `openai-embedding`, `deepseek-official` serves DeepSeek's Search and Fetch, `deepseek-search` and `deepseek-fetch`, through `deepseek-webtool`, the compatible client of their JSON API, which also serves a gateway that offers the same paths. Jina's web tools have a family of their own, `jina-`. Neither endpoint lists its models, and neither does Bedrock, on which `anthropic-official` already raised `UnsupportedOperationError` from `list_models`. [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308) amended this specification in place, with the `deepseek-official` rule added to §3 and the endpoint that lists no models to §5.

On 2026-11-04 the owner asked for image generation, speech and transcription through OpenAI's formats, each by a compatible client: `openai-image`, `openai-speech` and `openai-transcription`. As `openai-official` serves OpenAI's embedding models through `openai-embedding`, it serves OpenAI's image models, `gpt-image-`, through `openai-image`. A model of another vendor behind a gateway, such as `bytedance-seed/seedream-5-0-flash` or `fish-audio/drama-3`, begins with no family and names its client with `client_type`. [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316) amended this specification in place, with the `gpt-image-` rule added to §3.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Client type*: a name in `OFFICIAL_CLIENT_TYPES` or `COMPATIBLE_CLIENT_TYPES`, given as `client_type` or as `CLIENT_TYPE` in the environment.
- *Official client*: a client that speaks its vendor's own API and serves the vendor's models.
- *Compatible client*: a client that speaks one wire protocol for whatever endpoint serves it.
- *Family*: a prefix in `MODEL_FAMILIES` that a vendor's model ids begin with, such as `claude-` or `kimi-`, and the official client it names.
- *Named client*: one chosen by a client type. *Deduced client*: one chosen by the family of the model id.

## 3. Client Types

- An official client serves every generation of its vendor's models: a new generation goes into it, and the older ones keep working until the owner retires one.
- A client type passed in code MUST win over `CLIENT_TYPE`, which names the client when the code does not.
- A client type MUST be accepted in any casing, and so MUST the earlier names `openai` (for `openai-chat`), `gemini-official` (for `google-official`) and `gemini-generate-content` (for `google-genai`).
- `openai-official` MUST serve a `text-embedding-` model through `openai-embedding` and a `gpt-image-` model through `openai-image`, named or deduced, the prefix matched in any casing.
- `deepseek-official` MUST serve the ids `deepseek-search` and `deepseek-fetch`, matched whole and in any casing, through `deepseek-webtool`, named or deduced.

## 4. Routing by Model Id

- Without a client type, the family a model id begins with, compared case-insensitively, MUST name the client. The match MUST be a prefix match; routing MUST NOT match a substring or a version.
- An id of no known family MUST raise `RoutingError` asking for a client type, and an unknown client type MUST raise `RoutingError` whatever the model id.
- How a client tells apart the generations it serves is [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#61-explicit-matching) §6.1.

## 5. Listing Models

`list_models` on a named client MUST return everything its endpoint serves. On a deduced client it MUST return only the ids whose family names the same official client as its own model id, so a gateway fronting many vendors is filtered down to that vendor's models. Both keep the endpoint's order. A client whose endpoint lists no models MUST raise `UnsupportedOperationError` from `list_models` ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1), named or deduced.

## 6. Changing the Tables

Adding a row, a family or a client type, is a normal change. A change to what the tables mean MUST go through an RFC.

## 7. Conformance

- The tables and routing functions of `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` (`MODEL_FAMILIES`, `client_type_for_model` / `clientTypeForModel`, `routed_client_type` / `routedClientType`), which `src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts` route through.
- The routing cases of `src_py/tests/test_client.py` / `src_ts/tests/client.test.ts`:
  - the client type or the family names the client;
  - an id of no known family asks for one;
  - an unknown client type is refused;
  - the environment names the client;
  - every catalog entry reaches its client group.
- The routing cases of `test_credentials.py` / `credentials.test.ts`.
- `test_list_models.py` / `list-models.test.ts`.
