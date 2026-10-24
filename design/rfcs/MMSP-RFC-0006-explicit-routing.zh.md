# MMSP-RFC-0006 客户端路由须显式

- Feature Name: `explicit_routing`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0006-explicit-routing.md)

## Summary
[summary]: #summary

`AutoLLMClient` 根据传入的 `client_type` 和一张客户端类型表构造客户端。未传入客户端类型时，由模型 id 开头的模型族前缀指定该厂商的官方客户端；不属于任何已知模型族的 id 会抛出 `RoutingError`，要求传入客户端类型。路由没有别的规则：模型 id 只按前缀匹配，从不按子串或版本匹配。

## Motivation
[motivation]: #motivation

在 [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) 之前，有些模型 id 按子串路由，于是像 `moonshotai/kimi-k3` 这样的网关 id 会因为拼写上的巧合落到某个客户端，新一代模型也要新增一条匹配规则，而不是新增一行。有了一张客户端类型表和一张模型族表，读者看表就能说出一个模型 id 会到达哪个客户端；不属于任何已知模型族的 id 会要求传入 `client_type`，而不是去猜。客户端内部怎样区分各代模型，见 [MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.zh.md)。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0004。

## Rule
[rule]: #rule

- 官方客户端实现其厂商自己的 API，服务该厂商的模型：厂商的新一代模型放进它，旧的各代继续可用，直到项目负责人决定下线其中一代。兼容客户端只实现一种线上协议，可用于提供该协议的任何端点。
- 代码没有指定客户端时，由环境变量 `CLIENT_TYPE` 指定；客户端类型的旧名称仍然可用。`openai-official` 经由 `openai-embedding` 服务 `text-embedding-` 模型。
- 由模型 id 推断出的客户端，`list_models` 只列出模型族指向同一客户端的那些 id；按类型指定的客户端，列出其端点提供的全部模型。
- 新增一行（一个模型族、一个客户端类型）是普通改动；改变这些表的含义须经 RFC。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的表与路由函数，`src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts` 通过它们路由。
- `src_py/tests/test_client.py` / `src_ts/tests/client.test.ts` 中的路由用例：
  - 客户端类型或模型族指定客户端；
  - 不属于任何已知模型族的 id 要求传入客户端类型；
  - 未知的客户端类型被拒绝；
  - 环境变量指定客户端；
  - 清单中的每个条目都路由到其客户端分组。
- `test_list_models.py` / `list-models.test.ts`。
