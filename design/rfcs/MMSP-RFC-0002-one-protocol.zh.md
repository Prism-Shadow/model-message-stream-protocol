# MMSP-RFC-0002 所有模型共用一套协议

- Feature Name: `one_protocol`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0002-one-protocol.md)

## Summary
[summary]: #summary

调用任何模型都使用同样的三种结构：输入 `UniConfig`，输入与输出 `UniMessage`，输出 `UniEvent`。内容项只能是 `types.py` / `types.ts` 定义的类型之一，消息只包含完整的 `.done` 内容项。消息和事件中不会出现服务商自己的类型。

## Motivation
[motivation]: #motivation

MMSP 的用意，是让调用方只面对一种消息格式和一套流语法，换模型只需换一个字符串。这三种结构就是这份承诺；服务商的功能一旦以某个客户端独有的键或字段进入，调用方就又得去了解这个服务商。保持顺序这一条来自客户端出过的一个故障：一个 Responses 风格的消息转换，把收集起来的文本追加到了原本排在它后面的工具调用之后，DeepSeek 因此回复 "No tool output found for tool call"。

## Rule
[rule]: #rule

- 服务商的功能要么以协议中的 `UniConfig` 键或内容项字段进入 MMSP，要么以不透明的 `fidelity` 附在所属的内容项上（[MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.zh.md)），绝不成为某个客户端独有的键或字段。
- 只要传输格式能表达顺序，消息转换就保持助手回合中各内容项的顺序（先思考，再文本，再工具调用）。
- 修改任何结构（内容项的类型或字段、`UniConfig` 的键、`UniEvent` 的字段）都是修改协议，须经 RFC。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/types.py`、`src_ts/src/types.ts`；`base_client.py` / `baseClient.ts` 中 `LLMClient` 的抽象转换方法；`src_py/tests/test_message_order.py`、`src_ts/tests/message-order.test.ts`；共享的 e2e 测试（[MMSP-RFC-0009](MMSP-RFC-0009-two-packages-one-contract.zh.md)）。
