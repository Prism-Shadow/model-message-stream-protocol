# MMSP-RFC-0005 凭据只发往它被指定的地方

- Feature Name: `credential_scope`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0005-credential-scope.md)

## Summary
[summary]: #summary

传给客户端的密钥总会被使用，无论 base URL 是什么。未传入密钥时，客户端只在未传入 base URL、或传入的正是它自己的默认端点时，读取它的 `<P>_API_KEY`。未带密钥而传入其他 base URL 时，客户端在构造时、发出任何请求之前抛出 `ApiKeyRequiredError`；开放服务端的客户端例外，它不带密钥调用这样的 URL。

## Motivation
[motivation]: #motivation

从环境变量读取 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端，过去会把它发往传入的任何 base URL，于是把客户端指向某个网关的调用方，就把厂商的密钥发给了那个网关（[#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)）。[#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) 把它定为两个包中每种客户端类型共用的一条规则，并声明在一张表里，宿主程序无需构造客户端就能读取。[#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276) 让 vLLM 适配器不再沿用 OpenAI 的那一行，而有了自己的一行，并把这条规则扩展到 OpenAI 环境中的其余变量：OpenAI SDK 过去会把它们发往交给它的任何端点。

## Rule
[rule]: #rule

- `CLIENT_CREDENTIALS` 声明每种客户端类型的密钥变量、base URL 变量与默认端点，以及它的服务端是否开放，即可以不收密钥。客户端通过它解析密钥与端点，自己不从环境变量中读取这两者。
- 开放服务端的客户端不带密钥调用未带密钥传入的任何 base URL，包括它的默认端点；未传入 base URL 且 `<P>_API_KEY` 未设置时，它同样不带密钥调用 `<P>_BASE_URL` 或默认端点。基于 OpenAI SDK 的这类客户端发送占位密钥 `EMPTY`，因为该 SDK 的每个请求都带密钥。
- Anthropic 与 OpenAI 的 SDK 会用自己的环境变量补上没有交给它们的值，因此基于它们的客户端把维持这条规则所需的值明确交给 SDK：Anthropic 客户端只发送自己的密钥，绝不发送 `ANTHROPIC_AUTH_TOKEN`；基于 OpenAI SDK 的客户端只在 `OPENAI_API_KEY` 会去的地方发送 OpenAI 环境中的其余变量（`OPENAI_ORG_ID`、`OPENAI_PROJECT_ID`、`OPENAI_ADMIN_KEY`、`OPENAI_WEBHOOK_SECRET`，以及 `OPENAI_CUSTOM_HEADERS` 列出的请求头）。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的 `CLIENT_CREDENTIALS` 与 `environment_credential`，由 `utils.py` / `utils.ts` 中的 `resolve_credentials` / `resolveCredentials` 应用，每个客户端构造时都会调用，也由同一处的 `openai_client_options` / `openaiClientOptions` 应用，每个基于 OpenAI SDK 的客户端都会调用；`src_py/tests/test_env_credentials.py`、`src_ts/tests/env-credentials.test.ts`，它们在受控的环境变量下构造每一种客户端类型，并读取其 SDK 实际持有的凭据；`test_credentials.py` / `credentials.test.ts`。
