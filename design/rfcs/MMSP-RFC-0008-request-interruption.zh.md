# MMSP-RFC-0008 请求中断

- Feature Name: `request_interruption`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[English](MMSP-RFC-0008-request-interruption.md)

## Abstract

调用方能在任何时候中止信号或关闭流来中断一个请求，发往服务商的请求随之立即关闭，两个包的每个客户端都是如此，唯一的例外见 §3。本文规定调用方怎样中断、会收到什么，两种语言各自怎样关闭发往服务商的请求，被中断的有状态调用记录什么，以及服务端、playground 与 `mmsp` 客户端怎样传递中断。

## 1. Introduction

项目负责人的决定是「允许立即中断」：调用方能在任何时候停下一条流，发往服务商的请求随之结束。在 [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292) 之前：
- 在 openai 或 google-genai SDK 上关闭或离开一条 Python 流，连接要等垃圾回收运行时才关闭；
- 调用方忙于别的事时，或另一个任务正在读取时到来的中止，要等到下一次读取或下一个事件才生效；
- 在 openai 或 anthropic SDK 上被中止的 TypeScript 流，结束得像一条中途断开的流：先是 `.done` 内容项，再是 `IncompleteStreamError`；用量已经到达时，则是一个 `stop` 和一条被记录的回合。

因此在 Python 中，playground 的 Stop，以及调用方已经离开的服务端，会让上游请求再开着几秒钟，或者在服务商沉默期间一直开着。本规范在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0012。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *信号*：调用时传入的 `AbortSignal`，Python 中来自 `mmsp.abort_signal`，TypeScript 中是平台自带的。
- *中止*：Python 中是 `signal.abort(reason)`；TypeScript 中是在拥有该信号的 `AbortController` 上调用 `abort(reason)`。
- *关闭*：在流的生成器上调用 `aclose()` / `return()`，或者离开读取它的循环（在 Python 中，要等再没有别的东西持有这个生成器）。
- *中止错误*：Python 中是携带信号原因的 `asyncio.CancelledError`；TypeScript 中是信号的 `reason`。
- *未完成的内容项*：增量还在流式到达、尚无 `.done` 的那个内容项。

## 3. 中断一条流

- 调用方可以在任何时候中止信号或关闭流来中断它。发往服务商的请求必须随之立即关闭，只有一种情况例外：调用方在两次读取之间忙于别的事时中止 Python 的 `mmsp` 客户端，它要到调用方下一次读取时才关闭请求（§4）。
- 中止之后，调用方必须先拿到已经到达的增量，然后拿到中止错误；被关闭的生成器不再产出任何东西。调用方不得拿到未完成内容项的 `.done` 或 `stop`，或是残缺的 `.done` 之后跟着的 `IncompleteStreamError`。
- 没有 `stop` 就结束的流必须什么也不记录，也不保存 trace（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#61-历史保存副本) §6.1、[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#3-何时保存轨迹) §3）。

## 4. Python

每个 Python 客户端在服务商有流时，都必须在一个会关闭它的上下文中读取这条流（`async with stream:`；`google_genai` 用 `aclosing`，并且还会关闭它的请求打开的 HTTP 响应，因为它的 SDK 把这些响应留给垃圾回收），所以关闭客户端的生成器就会关闭连接。信号一被中止，基类就这样做：有读取在进行时，取消发起这次读取的任务，不管它是哪个任务；没有读取在进行时，就在客户端生成器停着的地方关闭它。`mmsp` 客户端用自己的 `streaming_response` 转发其服务端的流，它也会取消进行中的读取，但只在有读取进行时才关注信号，所以没有读取在进行时到来的中止，要到调用方下一次读取时才生效：这次读取抛出中止错误并关闭请求。`AutoLLMClient` 和 `streaming_response_stateful` 在自己的生成器关闭时，一并关闭它们读取的那个生成器。

## 5. TypeScript

每个 TypeScript 客户端都必须把信号交给它的 SDK，`mmsp` 客户端则交给 `fetch`。`google_genai` 通过自己的一个 `AbortController` 传递信号，它的生成器退出时也会中止这个控制器，因为关闭那个 SDK 的流并不会关闭连接。被中止的流必须抛出调用方的原因，而不是 SDK 的：SDK 悄悄结束它的流时，由基类抛出这个原因；`google_genai` 则用它替换 SDK 自己的 `AbortError` 重新抛出。

## 6. 有状态调用

中止必须立即释放有状态调用对客户端的占用，被中止的调用不得记录它的回合，即使中止恰好发生在 `stop` 到达之时（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#62-同一时间只有一次有状态调用) §6.2）。恰好在服务商的流结束时发生的中止，也必须按中止结束这条流。

## 7. 服务端、playground 与 `mmsp` 客户端

- MMSP 服务端和 playground 发现调用方已离开时，必须中止它们的上游；playground 的 Stop 也必须中止上游。
- Python 服务端在写入失败时发现连接断开，也就是在下一个事件或下一次 keep-alive 时，从那一刻起立即关闭上游。
- `mmsp` 客户端的信号会在读取进行到一半时结束它的流；在两个事件之间，TypeScript 中立即结束，Python 中在调用方下一次读取时结束（§4）。

## 8. 不中止就离开

调用方在 `stop` 之前离开一条 Python 流，既不中止也不关闭它，就会一直占着发往服务商的请求，有状态调用还会占着客户端，直到生成器被关闭：要么调用 `await stream.aclose()`，要么等到再没有东西持有这个生成器时由事件循环关闭。在 TypeScript 中，离开 `for await` 就会关闭它。仍持有一条已离开的流的调用方，应当中止或关闭它。

## 9. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`；`src_py/mmsp/abort_signal.py`；`src_py/mmsp/auto_client.py`；`src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中每个客户端的流循环。
- `src_py/mmsp/integration/server.py` 与 `playground.py`，以及 `src_ts/src/integration/server.ts` 与 `playground.ts` 中的对应实现。
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`，它们让每种流式客户端类型，分别以无状态和有状态的方式，从一个会陷入沉默的本地上游读取流，并检查：
  - 调用方等待时的中止、调用方忙时中止之后的下一次读取、`aclose()` / `return()`、离开循环，这些发生后 200 ms 内连接关闭；
  - 调用方拿到中止错误，没有 `.done`，也没有 `stop`；
  - 什么也不记录，也不保存 trace，中止发生在用量和结束原因到达之后也是如此。
- `test_abort_signal.py`；`test_mmsp_server.py` / `mmsp-server.test.ts`。
