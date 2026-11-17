# MMSP-RFC-0006 服务上游密钥

- Feature Name: `upstream_credentials`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)
- Kind: spec

[English](MMSP-RFC-0006-upstream-credentials.md)

## Abstract

上游密钥是客户端发给调用端点的密钥。传入的密钥对任意 base URL 生效；环境变量密钥（**`<P>_API_KEY`**）仅在未传 base URL 或传入客户端自己的默认端点时读取，传入其他无密钥 base URL 则抛出 **`ApiKeyRequiredError`**（开放服务端除外）。本文规定凭据表、解析规则、开放服务端、传给 SDK 的值及无凭据的答案链接下载。

## 1. Introduction

- **历史问题（[#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224)）**：从环境读取 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端过去会把厂商密钥发给自定义网关。
- **统一凭据表（[#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) MMSP-RFC-0005、[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) MMSP-RFC-0007）**：
  - [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258)：将各客户端类型的规则声明为一张静态表，宿主无需构造客户端即可读取。
  - [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276)：为 vLLM 适配器独立建行，并管控 OpenAI 其余环境变量。
  - [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)、[#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)：基于 OpenAI SDK 的其他厂商客户端在缺密钥时统一抛出 `ApiKeyRequiredError` 而非内置裸异常。

| 日期与 PR | 变更内容 |
|---|---|
| **2026-11-02（[#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)）** | 网页搜索与抓取（「在mmsp里面增加search和fetch的能力,实现方式和embedding类似」）：在 §2–§4 加入 `other_base_urls`（Jina Reader `https://r.jina.ai` 与 Search `https://s.jina.ai` 共用一钥），并将 §4 缺密钥规则推广至该 SDK 上所有非 OpenAI 密钥的官方与兼容客户端。 |
| **2026-11-04（[#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)）** | OpenAI 格式图像生成（§7）：答案中的图像 `url`（如 TokenDance 的火山引擎 24 小时签名链接，区别于 OpenAI/OpenRouter 返回字节）下载时不带任何凭据。 |

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **行**：客户端类型在 `CLIENT_CREDENTIALS` 中的条目。
- **密钥**：构造客户端时传入的 `api_key`。
- **base URL**：构造客户端时传入的 `base_url`。
- **默认端点**：该行的 `default_base_url`。
- **其他默认端点**：该行的 `other_base_urls`，即厂商服务部分模型的其他主机。
- **自己的默认端点**：客户端的默认端点与其他默认端点。
- **`<P>_API_KEY`**：`api_key_env` 指定的环境变量（如 `ZAI_API_KEY`）。
- **`<P>_BASE_URL`**：`base_url_env` 指定的环境变量（如 `ZAI_BASE_URL`）。
- **开放服务端**：不收密钥也可调用的服务端，标为 `open_server`（`mmsp`、`openai-chat-vllm-adapter`）。

## 3. 凭据表

- **表字段**：`CLIENT_CREDENTIALS` 声明各客户端类型的密钥变量、base URL 变量、默认端点、其他默认端点及 `open_server`。
- **统一解析**：客户端必须经 `resolve_credentials` / `resolveCredentials` 查表解析密钥与端点，不得自行读环境变量。
- **纯标准库**：`credentials` 模块必须只依赖标准库且不读环境变量，便于宿主直接读表。

## 4. 解析规则

| 场景 | 使用的密钥 | 调用的端点 |
|---|---|---|
| **传入密钥**（任意 `base_url`） | 必须使用传入的 `api_key` | 传入的 `base_url`、`<P>_BASE_URL` 或自己的默认端点 |
| **无密钥 + 未传 `base_url`** | 必须读取 `<P>_API_KEY` | `<P>_BASE_URL`（未设则取服务该模型的默认端点） |
| **无密钥 + 传入自己的默认端点** | 必须读取 `<P>_API_KEY` | 传入的默认端点 |
| **无密钥 + 其他 `base_url`**（非开放） | 必须在构造时、请求前抛出 `ApiKeyRequiredError` | 不调用 |
| **无密钥 + 其他 `base_url`**（开放，§5） | 不带密钥（vLLM 发 `EMPTY`） | 传入的 `base_url` |

- **端点比较**：去首尾空白，scheme 与主机名不区分大小写，路径去末尾斜杠，路径后原样比较。
- **OpenAI SDK 上的非 OpenAI 客户端**：无论官方或兼容，只要密钥变量不是 `OPENAI_API_KEY`，在既未传密钥、`<P>_API_KEY` 也未设置时必须抛出 `ApiKeyRequiredError`（防 SDK 用 `OPENAI_API_KEY` 补齐）；开放服务端改为发送占位密钥（§5）。

## 5. 开放服务端

- **无密钥传入 `base_url`**：必须不带密钥调用传入的任意 `base_url`（含默认端点），无论 `<P>_API_KEY` 为何。
- **未传 `base_url`**：读取 `<P>_API_KEY`；未设置则不带密钥调用 `<P>_BASE_URL` 或默认端点。
- **vLLM 占位密钥**：OpenAI SDK 要求每次请求带密钥，vLLM 适配器在无密钥时发送 `EMPTY`。

## 6. 交给 SDK 的值

为防止 Anthropic 与 OpenAI SDK 从环境变量自动补齐而违反 §4，客户端必须显式传值：
- **Anthropic**：只发自己的密钥，绝不发 `ANTHROPIC_AUTH_TOKEN`。
- **OpenAI SDK**：经 `openai_client_options` / `openaiClientOptions`，仅在 `OPENAI_API_KEY` 允许发往的端点发送 `OPENAI_ORG_ID`、`OPENAI_PROJECT_ID`、`OPENAI_ADMIN_KEY`、`OPENAI_WEBHOOK_SECRET` 及 `OPENAI_CUSTOM_HEADERS` 请求头。

## 7. 答案中的链接

- **自有 HTTP 客户端**：答案中的链接（如生成图像的 `url`）不是端点，必须用客户端自己的 HTTP 客户端（而非 SDK）下载。
- **零凭据**：下载不得发送任何凭据（密钥、默认请求头或环境变量）。

## 8. Conformance

- **核心实现**：`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 的 `CLIENT_CREDENTIALS`、`environment_credential`；`utils.py` / `utils.ts` 的 `resolve_credentials` / `resolveCredentials` 与 `openai_client_options` / `openaiClientOptions`。
- **环境与 SDK 测试**：`src_py/tests/test_env_credentials.py` / `src_ts/tests/env-credentials.test.ts`。
- **单元测试**：`test_credentials.py` / `credentials.test.ts`。
