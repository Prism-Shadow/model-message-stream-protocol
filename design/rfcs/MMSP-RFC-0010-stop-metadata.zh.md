# MMSP-RFC-0010 每条流都以用量和结束原因收尾

- Feature Name: `stop_metadata`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0010-stop-metadata.md)

## Summary
[summary]: #summary

客户端走完的一条流，以一个 `stop` 事件结束：它的 `usage_metadata` 是一个对象，`finish_reason` 有值；由这条流构建的助手消息同时带有这两项。服务商的流缺少其中任何一项就结束时，在它之前的 delta 之后、原本 `stop` 事件的位置抛出 `IncompleteStreamError`，因此调用方不会看到缺少这两项的 stop，有状态的历史也不会记录这一回合。

## Motivation
[motivation]: #motivation

调用方只能从 `stop` 事件读到一次请求的开销，存储的历史把每个回合的开销记在它的助手消息上；两者都需要 `stop` 事件的这两项元数据每次都在，而不只是通常都在。基类原本就拒绝发出缺少它们的 stop，用的却是裸的 `ValueError`，调用方无法把它与缺陷区分开（[MMSP-RFC-0007](MMSP-RFC-0007-typed-rejection.zh.md)）。定下这条规则所依据的案例：2026-10-22，CI 中一条 GLM-5.3-Flash 的流在携带用量的数据块到达之前就结束了（[run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)）；对同一请求的探测表明，服务商的最后一个数据块每次都同时携带结束原因和用量，因此那是一条中途断开的流，而这正是调用方想要重试的情况。已在 <!-- W1 PR link -->`fix/incomplete-stream-error` 中修复。

## Rule
[rule]: #rule

- 客户端的 `stop` 事件在线上报告用量和结束原因的地方携带它们，可以分几次携带；基类把这些部分逐字段合并进唯一的公开 `stop`，后到的计数替换先到的（[MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.zh.md)）。服务商不报告的计数为 `None`；不要求任何计数必须是数字。
- 一次 embedding 请求就是一个 `stop` 事件，携带它的向量、提示词的 token 数，以及值为 `stop` 的 `finish_reason`。
- `IncompleteStreamError` 指明客户端与缺少的一个或多个字段，并携带已经到达的用量或结束原因，好让这些 token 仍能计入。它不是 `StreamProtocolError`，那是客户端的缺陷；也不是 `EmptyResponseError`，那是没有内容的响应。
- `concat_uni_events_to_uni_message`、有状态的历史与 tracer 把 `stop` 事件的 `usage_metadata` 和 `finish_reason` 复制到助手消息上；调用方手工构建的消息可以两者都不带。
- `mmsp` 客户端原样转发其服务端的 `stop` 事件；服务端的 `IncompleteStreamError` 以 `UpstreamError` 的形式到达它，带有该 `error_type` 以及这个错误的各个字段。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/base_client.py` 中的 `_PublicStream.stop` 与 `src_ts/src/baseClient.ts` 中的 `PublicStream.stop`；`src_py/mmsp/errors.py` / `src_ts/src/errors.ts` 中的 `IncompleteStreamError`，以及它在 `wire.py` / `wire.ts` 中的分支；`src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流；`test_stream_protocol.py`、`test_empty_response.py`、`test_mmsp_server.py` 及其对应的 Jest 测试。
