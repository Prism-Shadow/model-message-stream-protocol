# MMSP-RFC-0004 路由是显式的

- Feature Name: `explicit_routing`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0004-explicit-routing.md)

## Summary
[summary]: #summary

`AutoLLMClient` 根据传入的 `client_type` 和一张客户端类型表构造客户端。未传入客户端类型时，由模型 id 开头的模型族前缀指定该厂商的官方客户端；不属于任何已知模型族的 id 会抛出异常，要求传入客户端类型。路由没有别的规则：模型 id 只按前缀匹配，从不按子串或版本匹配。

## Motivation
[motivation]: #motivation

在 [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) 之前，有些模型 id 按子串路由，于是像 `moonshotai/kimi-k3` 这样的网关 id 会因为拼写上的巧合落到某个客户端，新一代模型也要新增一条匹配规则，而不是新增一行。有了一张客户端类型表和一张模型族表，读者看表就能说出一个模型 id 会到达哪个客户端；不属于任何已知模型族的 id 会要求传入 `client_type`，而不是去猜。

## Rule
[rule]: #rule

- 厂商的新一代模型放进该厂商的官方客户端。官方客户端用明确的版本区分各代（`"gpt-6" in self._model`，绝不用 `"gpt" in model`），并让旧的各代继续可用，直到项目负责人决定下线其中一代。
- 兼容客户端只实现一种线上协议，可用于提供该协议的任何端点。
- 新增一行（一个模型族、一个客户端类型）是普通改动；改变这些表的含义须经 RFC。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts` 中的表与 `routed_client_type`，`auto_client.py` / `autoClient.ts` 通过它路由；`test_client.py::test_client_type_or_model_family_names_the_client`、`::test_a_model_of_no_known_family_asks_for_a_client_type`、`::test_model_catalog_routes_to_its_client_group` 及其对应的 Jest 测试。
