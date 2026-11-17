# MMSP-RFC-0008 请求中断

- Feature Name: `request_interruption`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[English](MMSP-RFC-0008-request-interruption.md)

## Abstract

调用方可在任何时候通过中止 **`AbortSignal`** 或**关闭流**来中断请求，所有客户端发往服务商的请求随之立即关闭（唯一例外见 §3）。本文规定**流中断行为**、**双语言连接清理**、**有状态调用回滚**及**服务端与 playground 传递规则**。

## 1. Introduction

- **核心决定（「允许立即中断」）**：调用方可在任意时刻停下流，发往服务商的请求随之立即结束（最初在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0012）。
- **[#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292) 之前的缺陷**：
  - **Python 连接泄漏**：在 `openai` 或 `google-genai` SDK 上关闭或离开流后，连接需等垃圾回收才关闭，导致 playground 点击 Stop 或调用方断开后上游请求仍持续开启。
  - **中止延迟生效**：调用方忙于其他操作或另一任务正在读取时，中止需等到下一次读取或下一个事件才生效。
  - **TypeScript 异常结流**：在 `openai` 或 `anthropic` SDK 上中止流会像断流一样产出 `.done` 与 `IncompleteStreamError`；若用量已到达，则会产出 `stop` 并记录回合。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **信号**：调用时传入的 `AbortSignal`（Python 来自 `mmsp.abort_signal`，TypeScript 为平台自带）。
- **中止**：Python 中调用 `signal.abort(reason)`；TypeScript 中在所属 `AbortController` 上调用 `abort(reason)`。
- **关闭**：在流生成器上调用 `aclose()` / `return()`，或离开读取循环（Python 中需无其他引用持有该生成器）。
- **中止错误**：Python 中为携带信号原因的 `asyncio.CancelledError`；TypeScript 中为信号的 `reason`。
- **未完成的内容项**：增量仍在流式到达、尚未产出 `.done` 的内容项。

## 3. 中断一条流

- **立即关闭上游连接**：调用方可以在任何时候中止信号或关闭流来中断它。发往服务商的请求必须随之立即关闭；唯一例外是调用方在两次读取之间忙于别的事时中止 Python `mmsp` 客户端，此时在调用方下一次读取时关闭请求（§4）。
- **中止后的事件与异常**：中止后，调用方必须先收到已到达的增量，随后收到中止错误；已关闭的生成器不再产出任何内容。调用方不得收到未完成内容项的 `.done`、`stop`，或残缺 `.done` 后跟 `IncompleteStreamError`。
- **不记录未完成回合**：未收到 `stop` 即结束的流必须什么也不记录，且不保存 trace（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#61-历史保存副本) §6.1、[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#3-何时保存轨迹) §3）。

## 4. Python

- **流上下文自动关闭**：每个 Python 客户端读取服务商流时，必须处于自动关闭上下文中（`async with stream:`；`google_genai` 使用 `aclosing` 并一并关闭其 SDK 留给垃圾回收的底层 HTTP 响应），使关闭客户端生成器即关闭连接。
- **基类信号监听与取消**：信号一被中止，基类立即动作：有读取进行时取消发起读取的任务；无读取进行时直接关闭停驻的客户端生成器。
- **`mmsp` 客户端的差异**：通过自身的 `streaming_response` 转发服务端流，仅在读取进行中关注信号；两次读取之间的中止在下一次读取时抛出中止错误并关闭请求。
- **外层包装联动关闭**：`AutoLLMClient` 与 `streaming_response_stateful` 在自身生成器关闭时，一并关闭其读取的内部生成器。

## 5. TypeScript

- **透传信号给 SDK**：每个 TypeScript 客户端都必须将信号传给其 SDK，`mmsp` 客户端则传给 `fetch`。
- **`google_genai` 连接关闭**：通过内部 `AbortController` 传递信号，并在生成器退出时中止该控制器（仅关闭该 SDK 的流不会关闭底层连接）。
- **统一抛出调用方原因**：被中止的流必须抛出调用方的原因而非 SDK 的原因：SDK 静默结束流时由基类抛出该原因；`google_genai` 则用它替换 SDK 的 `AbortError` 重新抛出。

## 6. 有状态调用

- **立即释放占用且不记历史**：中止必须立即释放有状态调用对客户端的占用，且不得记录该回合，即使中止恰好在 `stop` 到达时发生（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#62-同一时间只有一次有状态调用) §6.2）。
- **流结束临界点竞争**：恰好在服务商流结束时发生的中止，仍必须按中止结束该流。

## 7. 服务端、playground 与 `mmsp` 客户端

- **断开或 Stop 时中止上游**：MMSP 服务端和 playground 发现调用方离开时必须中止上游；playground 的 Stop 按钮也必须中止上游。
- **Python 服务端断连检测**：在下一个事件或 keep-alive 写入失败时发现断连，并立即关闭上游。
- **`mmsp` 客户端生效时机**：读取途中收到信号立即结束流；两个事件之间收到信号时，TypeScript 立即结束，Python 在下一次读取时结束（§4）。

## 8. 不中止就离开

- **Python 未关闭流的占用**：在 `stop` 前离开 Python 流且既不中止也不关闭，会一直占用服务商请求（有状态调用还会占用客户端），直到调用 `await stream.aclose()` 或无引用后由事件循环回收。
- **TypeScript `for await` 自动关闭**：离开 `for await` 循环即会自动关闭流。
- **调用方清理义务**：离开流后仍持有该流引用的调用方，应当中止或关闭它。

## 9. Conformance

- **客户端与信号核心实现**：`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`、`src_py/mmsp/abort_signal.py`、`src_py/mmsp/auto_client.py`，以及 `src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中各客户端的流循环。
- **服务端与 playground**：`src_py/mmsp/integration/server.py` 与 `playground.py`，及 `src_ts/src/integration/server.ts` 与 `playground.ts` 中的对应实现。
- **中断测试套件**（`src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`）：在每种流式客户端（无状态与有状态）上对接保持沉默的本地上游，验证：
  - **200 ms 内关闭连接**：等待时中止、忙时中止后的下一次读取、调用 `aclose()` / `return()`、离开循环，均在 200 ms 内关闭连接。
  - **干净的中止输出**：调用方收到中止错误，且不收到 `.done` 或 `stop`。
  - **零副作用**：不记录历史也不保存 trace，即使中止发生在用量和结束原因到达之后。
- **信号与服务端测试**：`test_abort_signal.py`、`test_mmsp_server.py` / `mmsp-server.test.ts`。
