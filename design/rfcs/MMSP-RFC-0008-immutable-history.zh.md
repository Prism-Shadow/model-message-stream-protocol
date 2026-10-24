# MMSP-RFC-0008 历史消息不改变

- Feature Name: `immutable_history`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0008-immutable-history.md)

## Summary
[summary]: #summary

有状态的历史保存的是深拷贝，与调用方、与产出的事件都不共享任何对象：
- `streaming_response_stateful` 记录发送的那条消息的副本，并在 `stop` 事件到达时记录助手消息的副本；
- `get_history` 返回一份副本，`set_history` 保存一份副本。

记录下来的消息保持它的内容项与 `fidelity`，之后的每次调用都从它们回传这条消息。MMSP 在交给它的消息上只写一个字段，即 `created_at`；没有任何消息转换读取它，所以它不会到达服务商，输入 token 和前缀缓存都不受影响。

## Motivation
[motivation]: #motivation

一段对话就是一个前缀，服务商缓存它，调用方为它付费。历史如果在两个回合之间变了，模型的上下文和开销也就跟着变了，而没有人做过这个决定。造成这种变化的可能是：事件产出之后又被改动，调用方改动了拿回去的列表，或者第二次调用与第一次赛跑，记下一个在生成时没有看到第一次回合的回合。[#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) 做了三处改动：
- 历史保存副本；
- 同一时间只运行一次有状态调用；
- 没有可发送内容的消息被拒绝，而不是被丢弃或以空内容发送。

关于时间戳，项目负责人的决定是：给历史消息加时间戳 created_at 不会影响输入 token，也不会破坏前缀缓存，所以可以放心做。因此基类客户端直接在调用方自己的消息上打时间戳，而不是在副本上打。

## Rule
[rule]: #rule

- **同一时间只有一次有状态调用。** 一个客户端上已有一次调用在进行时，再调用 `streaming_response_stateful` 会在发送任何内容之前抛出 `ConcurrentCallError`。一次调用占用客户端，直到它的 `stop` 事件、它的错误、它的信号被中止，或它的生成器被关闭。被中止的调用立即释放客户端，并且什么也不记录，即使中止恰好发生在它的 `stop` 到达之时（[MMSP-RFC-0012](MMSP-RFC-0012-interruptible-requests.zh.md)）。`streaming_response` 不保存历史，所以可以与有状态调用同时运行。`AutoLLMClient` 把调用转发给它包装的客户端，所以占用的是被包装的那个客户端。
- **何时记录回合。** 回合在 `stop` 事件产出之前记录，因此调用方可以在看到 `stop` 时就停止迭代，下一次调用也可以从那时开始。没有 `stop` 就结束的流不追加任何内容，也不保存 trace（[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)）。
- **消息上会写入什么。** 发送时没有 `created_at` 的消息，由 `streaming_response` 和 `mmsp` 客户端在这个对象本身上写入发送的时间：可能是调用方自己的消息，也可能是历史中某条记录时没有它的消息的副本。MMSP 不会在交给它的消息上写入别的任何内容。在 0.6.0 之前，0.5.0 之前记录的消息会在请求之前和 `set_history` 中由 `legacy` 转换为当前的内容项类型，转换结果是副本（[MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.zh.md)）。
- **没有可发送内容的消息。** 客户端没有任何可发送内容的消息（没有内容项，或只有思考），会在发往服务商的请求发出之前抛出带有 `message_index` 的 `InvalidMessageError`（[MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md)）。它绝不会被悄悄丢弃，也绝不会以空内容发送，因此请求与历史中的回合始终一致。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`。
- `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`。
- `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`。
- 各客户端的消息转换，它们都不读取 `created_at`。除了类型定义以及基类客户端和 `mmsp` 客户端中打时间戳的地方，只有 tracer 和 playground 读取它，用来显示。
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`，它们检查：
  - 调用方的消息只多出 `created_at`，别无其他；
  - 历史与调用方、与流都不共享任何对象；
  - 第二次有状态调用抛出 `ConcurrentCallError`；
  - 被中止的调用释放客户端，并且什么也不记录；
  - 对话接着交给它的历史继续；
  - 旧的内容项类型被转换。
- `test_message_order.py` / `message-order.test.ts`，它们把一条空消息和一条只有思考的消息交给各客户端的消息转换。
- `test_mmsp_server.py` / `mmsp-server.test.ts`，它们经由 `mmsp` 客户端记录一个有状态的回合，连同它的 `created_at`。
