# MMSP-RFC-0003 同一套流语法，由基类收尾

- Feature Name: `stream_grammar`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0003-stream-grammar.md)

## Summary
[summary]: #summary

一条流由若干 `delta` 事件组成，每个事件恰好携带一个内容项，最后由恰好一个 `stop` 事件结束；`stop` 事件携带用量和结束原因，不携带内容项。每个内容项都以连续的 `.delta` 片段流出，随后是它唯一的 `.done` 内容项，而这个 `.done` 内容项就是那些片段拼接的结果：增长字段是各片段该字段的拼接（工具调用的参数由拼接后的 JSON 解析而来），其余字段取自第一个片段，`fidelity` 是片段们携带的那一份；内容项之间从不交错，按顺序排列的 `.done` 内容项，加上 `stop` 事件的用量和结束原因，就是助手消息。一条流要么以 `stop` 事件结束，要么以异常结束，不会两者兼有。

## Motivation
[motivation]: #motivation

在第二版流式协议（[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)）之前，每个客户端自己判断内容项在哪里结束，自己为它收尾，因此针对某个服务商的流的修复（[#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218)、[#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)）一次只能落到一个客户端，使用方也无法依赖统一形态的流。语法在一处收尾之后，客户端就是对线上事件的一个简单循环，流中按内容项类型区分的代码集中在一个文件里；违反语法的流是那个客户端的缺陷，由共享测试发现，而不是由调用方发现。

## Rule
[rule]: #rule

- 客户端只产出 delta，从不产出 `.done` 内容项；由 `StreamItems` 判断每个内容项在哪里结束，并为它收尾。客户端各个 `stop` 事件上的用量和结束原因，合并进唯一的公开 `stop` 事件。
- `.done` 内容项只由 `StreamItems` 从已经流出的片段构建，因此使用方流式收到的内容与最终交到它手上的内容绝不会不一致；从线上读取完整内容项的客户端（MiniMax 的工具调用）把它作为单个片段流出，绝不再同时流出它的 delta。`concat_uni_events_to_uni_message` 恰好保留各 `.done` 内容项和 `stop` 事件的两个字段，有状态的历史记录的就是这条消息。
- 服务商的流在 `stop` 所需的用量或结束原因到达之前就结束时，抛出 `IncompleteStreamError`（[MMSP-RFC-0010](MMSP-RFC-0010-stop-metadata.zh.md)）。
- 客户端产出违反这套语法的内容（`.done` 内容项、带用量的 delta 事件、同一内容项上两份不同的 fidelity）时，在任何模式下都抛出 `StreamProtocolError`：这是客户端的缺陷，绝不修补。
- 不含任何通用内容的线上事件就是空的 delta 事件；客户端不认识的事件会被跳过，因此网关自己插入的帧无法终止一次生成；设置 `MMSP_DEBUG` 后改为抛出异常。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/base_client.py` 中的 `_PublicStream` 与 `src_py/mmsp/stream_items.py` 中的 `StreamItems`，以及 `baseClient.ts`、`streamItems.ts` 中的对应实现；`src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流，包括每个 `.done` 内容项等于其片段的拼接；`test_stream_protocol.py`、`test_stream_items.py`、`test_unknown_events.py` 及其对应的 TypeScript 测试。
