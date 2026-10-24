# MMSP-RFC-0012 允许中断请求

- Feature Name: `interruptible_requests`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[English](MMSP-RFC-0012-interruptible-requests.md)

## Summary
[summary]: #summary

调用方可以在任何时候中止信号或关闭生成器来停下一条流，发往服务商的请求随之立即关闭，两个包的每个客户端都是如此，只有一种情况例外：调用方在两次读取之间忙于别的事时中止 Python 的 `mmsp` 客户端，它要到调用方下一次读取时才关闭请求。调用方先拿到已经到达的 delta，然后拿到中止错误，生成器被关闭时则不再拿到任何东西，绝不会拿到未完成内容项的 `.done`，也绝不会拿到 `stop`。没有 `stop` 就结束的流什么也不记录，也不保存 trace。

## Motivation
[motivation]: #motivation

项目负责人的决定是「允许立即中断」：调用方可以在任何时候停下一条流，发往服务商的请求随之结束。在 [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292) 之前：
- 在 openai 或 google-genai SDK 上关闭或离开一条 Python 流，连接要等垃圾回收运行时才关闭；
- 调用方忙于别的事时，或另一个任务正在读取时到来的中止，要等到下一次读取或下一个事件才生效；
- 在 openai 或 anthropic SDK 上被中止的 TypeScript 流，结束得像一条中途断开的流：先是 `.done` 内容项，再是 `IncompleteStreamError`；用量已经到达时，则是一个 `stop` 和一条被记录的回合。

因此在 Python 中，playground 的 Stop，以及调用方已经离开的服务端，可能让上游请求再开着几秒钟，或者在服务商沉默期间一直开着。

## Rule
[rule]: #rule

- **关闭与中止错误。** 调用方用 `aclose()` / `return()` 关闭生成器，或者离开循环（在 Python 中，要等再没有别的东西持有这个生成器）。中止错误在 Python 中是携带信号原因的 `asyncio.CancelledError`，在 TypeScript 中是信号的 `reason`。调用方绝不会先拿到一个残缺的 `.done` 再拿到 `IncompleteStreamError`。
- **Python。** 每个 Python 客户端在服务商有流时，都在一个会关闭它的上下文中读取这条流（`async with stream:`；`google_genai` 用 `aclosing`，并且还会关闭它的请求打开的 HTTP 响应，因为它的 SDK 把这些响应留给垃圾回收）。所以关闭客户端的生成器就会关闭连接。信号一被中止，基类就这样做：有读取在进行时，取消发起这次读取的任务，不管它是哪个任务；没有读取在进行时，就在客户端生成器停着的地方关闭它。`AutoLLMClient` 和 `streaming_response_stateful` 在自己的生成器关闭时，一并关闭它们读取的那个生成器。
- **TypeScript。** 每个 TypeScript 客户端都把信号交给它的 SDK，`mmsp` 客户端则交给 `fetch`。`google_genai` 通过自己的一个 `AbortController` 传递信号，它的生成器退出时也会中止这个控制器，因为关闭那个 SDK 的流并不会关闭连接。被中止的流抛出的是调用方的原因，而不是 SDK 的：SDK 悄悄结束它的流时，由基类抛出这个原因；`google_genai` 则用它替换 SDK 自己的 `AbortError` 重新抛出。
- **有状态调用。** 中止会立即释放有状态调用对客户端的占用，被中止的调用绝不记录它的回合，即使中止恰好发生在 `stop` 到达之时（[MMSP-RFC-0008](MMSP-RFC-0008-immutable-history.zh.md)）。恰好在服务商的流结束时发生的中止，仍然是中止。
- **服务端、playground 与 `mmsp` 客户端。**
  - MMSP 服务端和 playground 发现调用方已离开时，会中止它们的上游；playground 的 Stop 也会中止上游。
  - Python 服务端在写入失败时发现连接断开，也就是在下一个事件或下一次 keep-alive 时，从那一刻起立即关闭上游。
  - `mmsp` 客户端的信号在两个事件之间或读取进行到一半时结束它的流。
- **不中止就离开。** 调用方在 `stop` 之前离开一条 Python 流，既不中止也不关闭它，就会一直占着发往服务商的请求，有状态调用还会占着客户端，直到生成器被关闭：要么调用 `await stream.aclose()`，要么等到再没有东西持有这个生成器时由事件循环关闭。在 TypeScript 中，离开 `for await` 就会关闭它。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`。
- `src_py/mmsp/abort_signal.py`。
- `src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中每个客户端的流循环，以及 `src_py/mmsp/auto_client.py`。
- `src_py/mmsp/integration/server.py` 与 `playground.py`，以及 `src_ts/src/integration/server.ts` 与 `playground.ts` 中的对应实现。
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`。它们让每种流式客户端类型，分别以无状态和有状态的方式，从一个会陷入沉默的本地上游读取流，并检查：
  - 调用方等待时的中止、调用方忙时中止之后的下一次读取、`aclose()` / `return()`、离开循环，这些发生后 200 ms 内连接关闭；
  - 调用方拿到中止错误，没有 `.done`，也没有 `stop`；
  - 什么也不记录，也不保存 trace，中止发生在用量和结束原因到达之后也是如此。
- `test_abort_signal.py`。
- `test_mmsp_server.py` / `mmsp-server.test.ts`。
