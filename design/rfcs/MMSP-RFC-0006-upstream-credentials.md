# MMSP-RFC-0006 Upstream Credentials

- Feature Name: `upstream_credentials`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)
- Kind: spec

[中文版](MMSP-RFC-0006-upstream-credentials.zh.md)

## Abstract

An upstream credential is the key a client sends to the endpoint it calls. A key passed to a client is used whatever the base URL, while a key read from the environment goes only to the endpoint it was given for: a client handed no key reads its `<P>_API_KEY` only when it is passed no base URL or one of its own default endpoints, and refuses any other base URL with `ApiKeyRequiredError` unless its server is open. This document specifies the credential table, the resolution rule, open servers and what the clients hand their SDKs.

## 1. Introduction

A client that read `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from the environment used to send it to whatever base URL it was given, so a caller that pointed a client at a gateway sent the vendor's key there ([#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)). [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) made it one rule for every client type in both packages, declared in a table a host can read without building a client. [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276) gave the vLLM adapter a row of its own in place of OpenAI's, and extended the rule to the rest of OpenAI's environment, which the OpenAI SDK sent to whatever endpoint it was given. [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288) and [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290) made the clients of other vendors on the OpenAI SDK raise the same error when they are given no key, where they had raised a bare built-in error. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0005 and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0007.

On 2026-11-02 the owner asked for web search and page fetch, done the way embedding is: 在mmsp里面增加search和fetch的能力,实现方式和embedding类似. Jina serves its Reader on `https://r.jina.ai` and its Search on `https://s.jina.ai`, with one key for both, so a row declares the other hosts on which its vendor serves some of its models, and the environment's key goes to each of them as it goes to the default endpoint. The web tool clients are built on the OpenAI SDK, the compatible one as well as the official one, so the rule for a client given no key covers every client on that SDK whose key is not OpenAI's. [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308) amended this specification in place, with the other default endpoints added to §2, §3 and §4 and the last rule of §4 stated for every such client.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Row*: a client type's entry in `CLIENT_CREDENTIALS`.
- *Key*, *base URL*: the `api_key` and `base_url` a client is built with. *Default endpoint*: the row's `default_base_url`. *Other default endpoints*: the row's `other_base_urls`, other hosts on which the vendor serves some of the client's models. A client's *own default endpoints* are its default endpoint and its other default endpoints.
- `<P>_API_KEY`, `<P>_BASE_URL`: the variables the row's `api_key_env` and `base_url_env` name, such as `ZAI_API_KEY` and `ZAI_BASE_URL`.
- *Open server*: a server that may take no key, marked `open_server` in its row, as the rows of `mmsp` and `openai-chat-vllm-adapter` are.

## 3. The Credential Table

`CLIENT_CREDENTIALS` declares each client type's key variable, base URL variable, default endpoint, other default endpoints and whether its server is open. Every client MUST resolve its key and endpoint through it with `resolve_credentials` / `resolveCredentials`, and MUST NOT read either from the environment itself. The `credentials` module MUST import nothing outside the standard library and read no environment, so a host can read the table without building a client.

## 4. Resolution

- A key passed in MUST be used whatever the base URL.
- Without a key, a client passed no base URL MUST read `<P>_API_KEY` and call `<P>_BASE_URL`, else the one of its own default endpoints that serves its model. A client passed one of its own default endpoints MUST read `<P>_API_KEY` for it. Endpoints are compared with surrounding whitespace trimmed, the scheme and host in any case, the path without trailing slashes, and anything after the path as written.
- Any other base URL passed without a key MUST raise `ApiKeyRequiredError` when the client is built, before any request, except on a client of an open server (§5).
- A client built on the OpenAI SDK whose key variable is not `OPENAI_API_KEY`, official or compatible, MUST raise `ApiKeyRequiredError` when it is given no key, neither passed nor in `<P>_API_KEY`, because the SDK would fill the missing key from `OPENAI_API_KEY`; a client of an open server sends a placeholder instead (§5).

## 5. Open Servers

A client of an open server MUST call any base URL passed without a key keyless, its default endpoint included, whatever `<P>_API_KEY` holds. Passed no base URL, it reads `<P>_API_KEY` like any client, and calls `<P>_BASE_URL` or its default endpoint keyless when that variable is unset. The vLLM adapter is built on the OpenAI SDK, which sends a key with every request, so it sends the placeholder `EMPTY` in place of no key.

## 6. What the SDKs Are Handed

The Anthropic and OpenAI SDKs fill what they are not handed from their own environment variables, so the clients built on them MUST hand them what keeps §4:
- an Anthropic client sends its own key and never `ANTHROPIC_AUTH_TOKEN`;
- a client on the OpenAI SDK sends the rest of OpenAI's environment (`OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET`, the headers `OPENAI_CUSTOM_HEADERS` lists) only where `OPENAI_API_KEY` goes, through `openai_client_options` / `openaiClientOptions`.

## 7. Conformance

- `CLIENT_CREDENTIALS` and `environment_credential` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`; `resolve_credentials` / `resolveCredentials`, which every client calls when it is built, and `openai_client_options` / `openaiClientOptions`, which every client on the OpenAI SDK calls, in `utils.py` / `utils.ts`.
- `src_py/tests/test_env_credentials.py`, `src_ts/tests/env-credentials.test.ts`, which build every client type under a controlled environment and read the credential its SDK holds.
- `test_credentials.py` / `credentials.test.ts`.
