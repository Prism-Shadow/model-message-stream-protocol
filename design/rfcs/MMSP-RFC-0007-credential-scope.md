# MMSP-RFC-0005 A credential goes only where it was given for

- Feature Name: `credential_scope`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0005-credential-scope.zh.md)

## Summary
[summary]: #summary

A key passed to a client is used, whatever the base URL. Without one, a client reads its `<P>_API_KEY` only when it is passed no base URL or its own default endpoint. Any other base URL passed without a key raises `ApiKeyRequiredError` when the client is built, before any request, except on a client of an open server, which calls such a URL keyless.

## Motivation
[motivation]: #motivation

A client that read `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from the environment used to send it to whatever base URL it was given, so a caller that pointed a client at a gateway sent the vendor's key there ([#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)). [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) made it one rule for every client type in both packages, declared in a table a host can read without building a client. [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276) gave the vLLM adapter a row of its own in place of OpenAI's, and extended the rule to the rest of OpenAI's environment, which the OpenAI SDK sent to whatever endpoint it was given.

## Rule
[rule]: #rule

- `CLIENT_CREDENTIALS` declares each client type's key variable, base URL variable and default endpoint, and whether its server is open, one that may take no key. A client resolves its key and endpoint through it and reads neither from the environment itself.
- A client of an open server calls any base URL passed without a key keyless, its default endpoint included; passed no base URL, it calls its `<P>_BASE_URL` or default endpoint keyless too when `<P>_API_KEY` is unset. Built on the OpenAI SDK, which sends a key with every request, it sends the placeholder `EMPTY`.
- The Anthropic and OpenAI SDKs fill what they are not handed from their own environment variables, so the clients built on them hand them what keeps this rule: an Anthropic client sends its own key and never `ANTHROPIC_AUTH_TOKEN`, and a client on the OpenAI SDK sends the rest of OpenAI's environment (`OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET`, the headers `OPENAI_CUSTOM_HEADERS` lists) only where `OPENAI_API_KEY` goes.

## Enforced by
[enforced-by]: #enforced-by

`CLIENT_CREDENTIALS` and `environment_credential` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, applied by `resolve_credentials` / `resolveCredentials` in `utils.py` / `utils.ts`, which every client calls when it is built, and by `openai_client_options` / `openaiClientOptions` there, which every client on the OpenAI SDK calls; `src_py/tests/test_env_credentials.py`, `src_ts/tests/env-credentials.test.ts`, which build every client type under a controlled environment and read the credential its SDK holds; `test_credentials.py` / `credentials.test.ts`.
