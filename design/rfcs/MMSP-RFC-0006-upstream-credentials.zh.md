# MMSP-RFC-0006 服务上游密钥

- Feature Name: `upstream_credentials`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)
- Kind: spec

[English](MMSP-RFC-0006-upstream-credentials.md)

## Abstract

上游密钥是客户端发给它所调用端点的密钥。传给客户端的密钥无论 base URL 是什么都会被使用，而从环境变量读到的密钥只发往它本来对应的端点：没有拿到密钥的客户端，只在未传入 base URL、或传入的正是它自己的某个默认端点时，读取它的 `<P>_API_KEY`；传入其他 base URL 时，除非它的服务端是开放的，否则以 `ApiKeyRequiredError` 拒绝。本文规定凭据表、解析规则、开放服务端，以及客户端交给其 SDK 的值。

## 1. Introduction

从环境变量读取 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端，过去会把它发往传入的任何 base URL，于是把客户端指向某个网关的调用方，就把厂商的密钥发给了那个网关（[#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)）。[#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258) 把它定为两个包中每种客户端类型共用的一条规则，并声明在一张表里，宿主程序无需构造客户端就能读取。[#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276) 让 vLLM 适配器不再沿用 OpenAI 的那一行，而有了自己的一行，并把这条规则扩展到 OpenAI 环境中的其余变量：OpenAI SDK 过去会把它们发往交给它的任何端点。[#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288) 与 [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290) 让基于 OpenAI SDK 的其他厂商客户端在拿不到密钥时也抛出这个错误，此前它们抛出的是裸的内置异常。本规范最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0005，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0007。

2026-11-02，项目负责人要求加入网页搜索与网页抓取，做法与 embedding 相同，原话是：「在mmsp里面增加search和fetch的能力,实现方式和embedding类似」。Jina 在 `https://r.jina.ai` 上提供 Reader，在 `https://s.jina.ai` 上提供 Search，两者共用一个密钥；因此一行可以声明厂商提供其部分模型的其他主机，环境变量中的密钥像发往默认端点一样发往其中每一个。网页工具客户端都基于 OpenAI SDK，兼容客户端与官方客户端都是，所以客户端拿不到密钥时的那条规则，覆盖该 SDK 上密钥不是 OpenAI 密钥的每一个客户端。[#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308) 在原文上修改了本规范：在 §2、§3 与 §4 中加入其他默认端点，并把 §4 的最后一条规则写成适用于每一个这样的客户端。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *行*：一种客户端类型在 `CLIENT_CREDENTIALS` 中的条目。
- *密钥*、*base URL*：构造客户端时传入的 `api_key` 与 `base_url`。*默认端点*：该行的 `default_base_url`。*其他默认端点*：该行的 `other_base_urls`，即厂商提供该客户端部分模型的其他主机。客户端*自己的默认端点*，是它的默认端点与其他默认端点。
- `<P>_API_KEY`、`<P>_BASE_URL`：该行的 `api_key_env` 与 `base_url_env` 所指的环境变量，例如 `ZAI_API_KEY` 与 `ZAI_BASE_URL`。
- *开放服务端*：不收密钥也能调用的服务端，在其行中标为 `open_server`，`mmsp` 与 `openai-chat-vllm-adapter` 的行就是这样。

## 3. 凭据表

`CLIENT_CREDENTIALS` 声明每种客户端类型的密钥变量、base URL 变量、默认端点、其他默认端点，以及它的服务端是否开放。每个客户端都必须通过 `resolve_credentials` / `resolveCredentials` 经由这张表解析密钥与端点，不得自己从环境变量中读取这两者。`credentials` 模块必须只依赖标准库，也不读取任何环境变量，因此宿主程序无需构造客户端就能读取这张表。

## 4. 解析规则

- 传入的密钥无论 base URL 是什么都必须被使用。
- 没有密钥时，未传入 base URL 的客户端必须读取 `<P>_API_KEY`，并调用 `<P>_BASE_URL`，这个变量未设置时，调用自己的默认端点中提供其模型的那一个。传入的正是自己某个默认端点的客户端，必须为这个端点读取 `<P>_API_KEY`。比较端点时去掉首尾空白，scheme 与主机名不区分大小写，路径去掉末尾的斜杠，路径之后的部分按原样比较。
- 未带密钥而传入其他 base URL 时，客户端必须在构造时、发出任何请求之前抛出 `ApiKeyRequiredError`，开放服务端的客户端除外（§5）。
- 基于 OpenAI SDK、密钥变量不是 `OPENAI_API_KEY` 的客户端，无论是官方客户端还是兼容客户端，在既未传入密钥、`<P>_API_KEY` 也未设置时，必须抛出 `ApiKeyRequiredError`，因为该 SDK 会用 `OPENAI_API_KEY` 补上缺少的密钥；开放服务端的客户端改为发送占位密钥（§5）。

## 5. 开放服务端

开放服务端的客户端必须不带密钥调用未带密钥传入的任何 base URL，包括它的默认端点，无论 `<P>_API_KEY` 中有什么。未传入 base URL 时，它像其他客户端一样读取 `<P>_API_KEY`，这个变量未设置时不带密钥调用 `<P>_BASE_URL` 或默认端点。vLLM 适配器基于 OpenAI SDK，而该 SDK 的每个请求都带密钥，所以它在没有密钥时发送占位密钥 `EMPTY`。

## 6. 交给 SDK 的值

Anthropic 与 OpenAI 的 SDK 会用自己的环境变量补上没有交给它们的值，因此基于它们的客户端必须把维持 §4 所需的值明确交给 SDK：
- Anthropic 客户端只发送自己的密钥，绝不发送 `ANTHROPIC_AUTH_TOKEN`；
- 基于 OpenAI SDK 的客户端经由 `openai_client_options` / `openaiClientOptions`，只在 `OPENAI_API_KEY` 会去的地方发送 OpenAI 环境中的其余变量（`OPENAI_ORG_ID`、`OPENAI_PROJECT_ID`、`OPENAI_ADMIN_KEY`、`OPENAI_WEBHOOK_SECRET`，以及 `OPENAI_CUSTOM_HEADERS` 列出的请求头）。

## 7. Conformance

- `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的 `CLIENT_CREDENTIALS` 与 `environment_credential`；`utils.py` / `utils.ts` 中的 `resolve_credentials` / `resolveCredentials`，每个客户端构造时都会调用它，以及 `openai_client_options` / `openaiClientOptions`，每个基于 OpenAI SDK 的客户端都会调用它。
- `src_py/tests/test_env_credentials.py`、`src_ts/tests/env-credentials.test.ts`，它们在受控的环境变量下构造每一种客户端类型，并读取其 SDK 实际持有的凭据。
- `test_credentials.py` / `credentials.test.ts`。
