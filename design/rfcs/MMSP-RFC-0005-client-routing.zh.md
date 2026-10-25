# MMSP-RFC-0005 客户端路由

- Feature Name: `client_routing`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[English](MMSP-RFC-0005-client-routing.md)

## Abstract

客户端路由根据客户端类型与模型 id，决定 `AutoLLMClient` 基于哪个客户端构造。客户端类型经由一张客户端类型表指定客户端；没有客户端类型时，由模型 id 开头的模型族前缀指定该厂商的官方客户端，不属于任何已知模型族的 id 抛出 `RoutingError`。模型 id 只按前缀匹配，从不按子串或版本匹配。

## 1. Introduction

在 [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) 之前，有些模型 id 按子串路由，于是像 `moonshotai/kimi-k3` 这样的网关 id 会因为拼写上的巧合落到某个客户端，新一代模型也要新增一条匹配规则，而不是新增一行。有了一张客户端类型表和一张模型族表，读者看表就能说出一个模型 id 会到达哪个客户端；不属于任何已知模型族的 id 会要求传入 `client_type`，而不是去猜。本规范最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0004，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0006。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *客户端类型*：`OFFICIAL_CLIENT_TYPES` 或 `COMPATIBLE_CLIENT_TYPES` 中的一个名称，以 `client_type` 传入，或由环境变量 `CLIENT_TYPE` 给出。
- *官方客户端*：实现其厂商自己的 API、服务该厂商模型的客户端。
- *兼容客户端*：只实现一种线上协议、用于提供该协议的任何端点的客户端。
- *模型族*：`MODEL_FAMILIES` 中的一个前缀，某个厂商的模型 id 都以它开头，例如 `claude-` 或 `kimi-`，以及它指定的官方客户端。
- *指定的客户端*：由客户端类型选出的客户端。*推断出的客户端*：由模型 id 所属的模型族选出的客户端。

## 3. 客户端类型

- 官方客户端服务其厂商的每一代模型：厂商的新一代模型放进它，旧的各代继续可用，直到项目负责人决定下线其中一代。
- 代码中传入的客户端类型必须优先于 `CLIENT_TYPE`；代码没有传入时，才由 `CLIENT_TYPE` 指定客户端。
- 客户端类型必须不区分大小写地被接受，旧名称 `openai`（即 `openai-chat`）、`gemini-official`（即 `google-official`）与 `gemini-generate-content`（即 `google-genai`）也必须被接受。
- `openai-official` 必须经由 `openai-embedding` 服务 `text-embedding-` 模型，无论这个客户端是指定的还是推断出的。

## 4. 按模型 id 路由

- 没有客户端类型时，必须由模型 id 开头的模型族指定客户端，比较时不区分大小写。匹配必须是前缀匹配；路由不得按子串或版本匹配。
- 不属于任何已知模型族的 id 必须抛出 `RoutingError`，要求传入客户端类型；未知的客户端类型必须抛出 `RoutingError`，无论模型 id 是什么。
- 客户端内部怎样区分它服务的各代模型，见 [MMSP-RFC-0003 §6.1](MMSP-RFC-0003-message-requests.zh.md)。

## 5. 列出模型

在指定的客户端上，`list_models` 必须返回其端点提供的全部模型。在推断出的客户端上，它必须只返回所属模型族与自身模型 id 指向同一官方客户端的那些 id，因此代理多家厂商的网关会被筛到这家厂商自己的模型。两者都保持端点返回的顺序。

## 6. 修改这些表

新增一行，即一个模型族或一个客户端类型，是普通改动。改变这些表的含义必须经由 RFC。

## 7. Conformance

- `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的表与路由函数（`MODEL_FAMILIES`、`client_type_for_model` / `clientTypeForModel`、`routed_client_type` / `routedClientType`），`src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts` 通过它们路由。
- `src_py/tests/test_client.py` / `src_ts/tests/client.test.ts` 中的路由用例：
  - 客户端类型或模型族指定客户端；
  - 不属于任何已知模型族的 id 要求传入客户端类型；
  - 未知的客户端类型被拒绝；
  - 环境变量指定客户端；
  - 清单中的每个条目都路由到其客户端分组。
- `test_credentials.py` / `credentials.test.ts` 中的路由用例。
- `test_list_models.py` / `list-models.test.ts`。
