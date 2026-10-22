# MMSP-RFC-0005 凭据只发往它被指定的地方

- Feature Name: `credential_scope`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0005-credential-scope.md)

## Summary
[summary]: #summary

传给客户端的密钥总会被使用，无论 base URL 是什么。未传入密钥时，客户端只在未传入 base URL、或传入的正是它自己的默认端点时，读取它的 `<P>_API_KEY`。未带密钥而传入其他 base URL 时，客户端在构造时、发出任何请求之前抛出 `ApiKeyRequiredError`；只有 `mmsp` 客户端会把这样的 URL 当作开放的服务端，不带密钥调用。

## Motivation
[motivation]: #motivation

从环境变量读取 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端，过去会把它发往传入的任何 base URL，于是把客户端指向某个网关的调用方，就把厂商的密钥发给了那个网关（[#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)）。[#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) 把它定为两个包中每种客户端类型共用的一条规则，并声明在一张表里，宿主程序无需构造客户端就能读取。

## Rule
[rule]: #rule

- `CLIENT_CREDENTIALS` 声明每种客户端类型的密钥变量、base URL 变量与默认端点。客户端通过它解析密钥与端点，自己不从环境变量中读取这两者。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的 `CLIENT_CREDENTIALS` 与 `environment_credential`，由 `utils.py` / `utils.ts` 中的 `resolve_credentials` / `resolveCredentials` 应用，每个客户端构造时都会调用；`src_py/tests/test_env_credentials.py`、`src_ts/tests/env-credentials.test.ts`，它们在受控的环境变量下构造每一种客户端类型，并读取其 SDK 实际持有的凭据；`test_credentials.py` / `credentials.test.ts`。
