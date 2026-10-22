# MMSP-RFC-0005 A credential goes only where it was given for

- Feature Name: `credential_scope`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0005-credential-scope.zh.md)

## Summary
[summary]: #summary

A key passed to a client is used, whatever the base URL. Without one, a client reads its `<P>_API_KEY` only when it is passed no base URL or its own default endpoint. Any other base URL passed without a key raises `ApiKeyRequiredError` when the client is built, before any request; the `mmsp` client alone calls such a URL keyless, as an open server.

## Motivation
[motivation]: #motivation

A client that read `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from the environment used to send it to whatever base URL it was given, so a caller that pointed a client at a gateway sent the vendor's key there ([#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)). [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) made it one rule for every client type in both packages, declared in a table a host can read without building a client.

## Rule
[rule]: #rule

- `CLIENT_CREDENTIALS` declares each client type's key variable, base URL variable and default endpoint. A client resolves its key and endpoint through it and reads neither from the environment itself.

## Enforced by
[enforced-by]: #enforced-by

`CLIENT_CREDENTIALS` and `environment_credential` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, applied by `resolve_credentials` / `resolveCredentials` in `utils.py` / `utils.ts`, which every client calls when it is built; `src_py/tests/test_env_credentials.py`, `src_ts/tests/env-credentials.test.ts`, which build every client type under a controlled environment and read the credential its SDK holds; `test_credentials.py` / `credentials.test.ts`.
