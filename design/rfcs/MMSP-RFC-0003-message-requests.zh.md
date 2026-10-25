# MMSP-RFC-0003 请求须异步流式

- Feature Name: `async_streaming`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0003-async-streaming.md)

## Summary
[summary]: #summary

调用模型只有 `streaming_response` 与 `streaming_response_stateful` 两个入口（TypeScript 中为 `streamingResponse` 与 `streamingResponseStateful`），它们都是产出 `UniEvent` 的异步生成器；没有同步调用，也没有一次返回整个响应的调用。

流只有一套语法，由基类收尾：
- 先是若干 `delta` 事件，每个事件恰好携带一个内容项；
- 然后恰好一个 `stop` 事件，携带用量和结束原因，不携带内容项。

一条流要么以 `stop` 事件结束，要么以异常结束，不会两者兼有。

## Motivation
[motivation]: #motivation

同时服务许多对话的宿主程序，绝不能因为某个服务商而阻塞自己的事件循环；调用方也绝不能把被截断的回答当成完整的回答。所以每次调用都是一条异步流，没有 `stop` 的流就是没有完成。在第二版流式协议（[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)）之前，每个客户端自己判断内容项在哪里结束，自己为它收尾，因此针对某个服务商的流的修复（[#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218)、[#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)）一次只能落到一个客户端，使用方也无法依赖统一形态的流。语法在一处收尾之后：
- 客户端就是对线上事件的一个简单循环；
- 流中按内容项类型区分的代码集中在一个文件里；
- 违反语法的流是那个客户端的缺陷，由共享测试发现，而不是由调用方发现。

这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0003。

## Rule
[rule]: #rule

- **客户端产出什么。** 客户端的 `_streaming_response_internal` / `_streamingResponseInternal` 发出请求，服务商的流中每来一个事件，就产出一个 `UniEvent`。服务商提供流式端点时，客户端就读取流式端点。它只产出 delta，从不产出 `.done` 内容项。
- **基类做什么。** 基类把每个 delta 交给 `StreamItems`（`stream_items.py` / `streamItems.ts`），由它判断每个内容项在哪里结束，并为它收尾。客户端各个 `stop` 事件上的用量和结束原因，由基类合并进唯一的公开 `stop`（[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)）。
- **内容项。** 每个内容项都以连续的 `.delta` 片段流出，随后是它唯一的 `.done` 内容项，也就是那些片段拼接的结果。内容项之间从不交错。按顺序排列的 `.done` 内容项，加上 `stop` 事件的这两个字段，就是助手消息。
- **`.done` 内容项怎样构建。** 只由 `StreamItems` 用已经流出的片段构建，因此使用方流式收到的内容与最终交到它手上的内容绝不会不一致：
  - 增长字段是各片段该字段的拼接；
  - 工具调用的参数由拼接后的 JSON 解析而来；
  - 其余字段取自第一个片段；
  - `fidelity` 是片段携带的那一份。一个内容项最多只有一个 delta 携带它的 fidelity，`.done` 会再带一次。

  从线上读取完整内容项的客户端（MiniMax 的工具调用）把它作为单个片段流出，绝不再同时流出它的 delta。`concat_uni_events_to_uni_message` 恰好保留各 `.done` 内容项和 `stop` 事件的这两个字段。
- **违反语法。** 客户端产出违反这套语法的内容时，在任何模式下都抛出 `StreamProtocolError`：`.done` 内容项、带用量的 delta 事件、同一内容项上两份不同的 fidelity。这是客户端的缺陷，绝不修补。另有两种错误会出现在 `stop` 的位置上（[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)）：
  - 服务商的流缺少用量或结束原因就结束时，抛出 `IncompleteStreamError`；
  - 只有思考、别无其他内容的响应，抛出 `EmptyResponseError`。
- **不含通用内容的事件。** 不含任何通用内容的线上事件就是空的 delta 事件。客户端不认识的事件会被跳过，因此网关自己插入的帧无法终止一次生成。设置 `MMSP_DEBUG` 后改为抛出 `UnknownEventError`（[MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md)）。
- **`mmsp` 客户端**原样转发其服务端的公开流。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` 与 `src_py/mmsp/stream_items.py`，以及 `src_ts/src/baseClient.ts`、`src_ts/src/streamItems.ts` 中的对应实现。
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流，包括每个 `.done` 内容项等于其片段的拼接。
- `test_stream_protocol.py`、`test_stream_items.py`、`test_unknown_events.py`、`test_empty_response.py` 及其对应的 Jest 测试。
- `test_mmsp_server.py` / `mmsp-server.test.ts`，检查经过服务端的流与上游的流相同。
