# MMSP-RFC-0005 客户端路由

- Feature Name: `client_routing`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)
- Kind: spec

[English](MMSP-RFC-0005-client-routing.md)

## Abstract

客户端路由根据 **`client_type`** 与模型 id 选定 **`AutoLLMClient`** 的客户端。传入 **`client_type`** 时查客户端类型表；未传时按模型 id 的模型族前缀选定官方客户端，未知模型族抛出 **`RoutingError`**。模型 id 只按前缀或整个 id 匹配，绝不按子串或版本匹配。

## 1. Introduction

- **历史问题（[#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228)）**：旧版按子串路由，`moonshotai/kimi-k3` 等网关 id 会因拼写巧合误匹配，新代模型也需改代码。
- **表驱动路由（[#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) MMSP-RFC-0004、[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) MMSP-RFC-0006）**：用客户端类型表与模型族表声明路由，未知模型族要求传入 `client_type`。

| 日期与 PR | 变更内容 |
|---|---|
| **2026-11-02（[#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)）** | 网页搜索与抓取（「在mmsp里面增加search和fetch的能力,实现方式和embedding类似」）：`deepseek-official` 经 `deepseek-webtool` 服务 `deepseek-search` 与 `deepseek-fetch`（§3）；Jina 模型族为 `jina-`；不列出模型的端点（含 Bedrock 上的 `anthropic-official`）在 `list_models` 抛出 `UnsupportedOperationError`（§5）。 |
| **2026-11-04（[#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)）** | OpenAI 格式兼容客户端 `openai-image`、`openai-speech`、`openai-transcription`：`openai-official` 经 `openai-image` 服务 `gpt-image-`（§3）；无模型族的网关模型（`bytedance-seed/seedream-5-0-flash`、`fish-audio/drama-3`）用 `client_type` 指定。 |
| **2026-11-16（[#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)）** | DeepSeek 语音合成与识别（「把deepseek的tts和asr包一下」，端点 `/v1/tools/tts`、`/v1/tools/asr`）：`deepseek-official` 经 `deepseek-speech` 服务 `deepseek-tts`、经 `deepseek-transcription` 服务 `deepseek-asr`（§3）；均不列出模型。 |

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **客户端类型**：`OFFICIAL_CLIENT_TYPES` 或 `COMPATIBLE_CLIENT_TYPES` 中的名称，由 `client_type` 或环境变量 `CLIENT_TYPE` 给出。
- **官方客户端**：实现厂商自有 API、服务该厂商模型的客户端。
- **兼容客户端**：实现单一线上协议、服务任意对应端点的客户端。
- **模型族**：`MODEL_FAMILIES` 中的厂商模型 id 前缀（如 `claude-`、`kimi-`）及其指定的官方客户端。
- **指定的客户端**：由客户端类型选出的客户端。
- **推断出的客户端**：由模型 id 所属模型族选出的客户端。

## 3. 客户端类型

- **跨代支持**：官方客户端服务其厂商的每一代模型，直至下线。
- **优先级**：代码传入的客户端类型必须优先于 `CLIENT_TYPE`（仅在代码未传时生效）。
- **大小写与旧别名**：客户端类型必须不区分大小写，且必须接受旧名 `openai`（`openai-chat`）、`gemini-official`（`google-official`）与 `gemini-generate-content`（`google-genai`）。
- **子客户端委派**（无论指定或推断、均不区分大小写，必须按表委派）：

| 官方客户端 | 模型 id | 匹配方式 | 目标客户端 |
|---|---|---|---|
| `openai-official` | `text-embedding-` | 前缀 | `openai-embedding` |
| `openai-official` | `gpt-image-` | 前缀 | `openai-image` |
| `deepseek-official` | `deepseek-search`、`deepseek-fetch` | 整个 id | `deepseek-webtool` |
| `deepseek-official` | `deepseek-tts` | 整个 id | `deepseek-speech` |
| `deepseek-official` | `deepseek-asr` | 整个 id | `deepseek-transcription` |

## 4. 按模型 id 路由

- **前缀匹配**：无客户端类型时，必须由模型 id 开头的模型族（不区分大小写）指定客户端；匹配必须是前缀匹配，路由不得按子串或版本匹配。
- **未知报错**：未知模型族的 id 必须抛出 `RoutingError`（要求传入客户端类型）；未知客户端类型无论模型 id 为何都必须抛出 `RoutingError`。
- **模型代区分**：客户端内部区分各代模型的规则见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#61-明确匹配) §6.1。

## 5. 列出模型

- **指定的客户端**：`list_models` 必须按端点原序返回其全部模型。
- **推断出的客户端**：`list_models` 必须按端点原序只返回模型族指向同一官方客户端的 id（过滤多厂商网关）。
- **不列出模型的端点**：无论指定或推断，`list_models` 都必须抛出 `UnsupportedOperationError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1）。

## 6. 修改这些表

新增模型族或客户端类型行是普通改动；改变表的含义必须经由 RFC。

## 7. Conformance

- **路由实现**：`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`（`MODEL_FAMILIES`、`client_type_for_model` / `clientTypeForModel`、`routed_client_type` / `routedClientType`），由 `src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts` 调用。
- **客户端测试**：`src_py/tests/test_client.py` / `src_ts/tests/client.test.ts`（类型/模型族路由、未知模型族/类型拒绝、环境变量指定、目录全覆盖）。
- **凭据测试**：`test_credentials.py` / `credentials.test.ts`。
- **模型列表测试**：`test_list_models.py` / `list-models.test.ts`。
