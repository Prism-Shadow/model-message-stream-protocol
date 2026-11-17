# MMSP-RFC-0008 Request Interruption

- Feature Name: `request_interruption`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[中文版](MMSP-RFC-0008-request-interruption.zh.md)

## Abstract

A caller can interrupt a request at any point by aborting its **`AbortSignal`** or **closing its stream**, immediately closing the upstream provider request across all clients (with the single exception in §3). This specification defines **stream termination**, **language-specific cleanup**, **stateful rollback**, and **server/playground propagation**.

## 1. Introduction

- **Core decision (允许立即中断)**: Stopping a stream at any point ends the provider's request immediately (originally stated in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0012).
- **Failures before [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292)**:
  - **Leaked Python connections**: Closing or leaving an `openai` or `google-genai` stream left the upstream connection open until garbage collection, keeping upstream requests open after playground Stop or caller disconnect.
  - **Delayed aborts**: Aborting while the caller was busy or another task was reading waited until the next read or event.
  - **Corrupted TypeScript termination**: Aborted `openai` or `anthropic` streams emitted `.done` items and `IncompleteStreamError`—or a `stop` and a recorded turn if usage had already arrived.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Signal**: The `AbortSignal` passed to a call (`mmsp.abort_signal` in Python; platform `AbortSignal` in TypeScript).
- **Abort**: Calling `signal.abort(reason)` in Python, or `controller.abort(reason)` in TypeScript.
- **Close**: Calling `aclose()` / `return()` on the stream generator, or leaving its read loop (in Python, once no reference holds the generator).
- **Abort error**: `asyncio.CancelledError` carrying the signal's reason in Python; the signal's `reason` in TypeScript.
- **Open item**: The currently streaming item that has not yet emitted `.done`.

## 3. Interrupting a Stream

- **Immediate upstream closure**: A caller MAY interrupt a stream at any point by aborting its signal or closing it. The provider's request MUST close at once, except that the Python `mmsp` client aborted between reads closes at the caller's next read (§4).
- **Post-abort events and errors**: After an abort, the caller MUST receive already-arrived deltas followed by the abort error; a closed generator yields nothing more. The caller MUST NOT receive a `.done` for the open item, a `stop`, or a partial `.done` followed by `IncompleteStreamError`.
- **No turn or trace recorded**: A stream ending without `stop` MUST record nothing and save no trace ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#61-the-history-holds-copies) §6.1, [MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved) §3).

## 4. Python

- **Auto-closing stream contexts**: Every Python client MUST read the provider's stream inside a closing context (`async with stream:`; `aclosing` on `google_genai` plus closing the underlying HTTP responses its SDK leaves to GC), so closing the client's generator closes the connection.
- **Base-class signal watcher**: On abort, the base class immediately cancels any pending read task, or closes the resting client generator if no read is pending.
- **`mmsp` client difference**: Forwards the server stream via its own `streaming_response`, which watches the signal only during a pending read; an abort between reads raises the abort error and closes the request on the caller's next read.
- **Wrapper propagation**: `AutoLLMClient` and `streaming_response_stateful` close their inner generator when closed.

## 5. TypeScript

- **Pass-through signal**: Every TypeScript client MUST pass the signal to its SDK, or to `fetch` in the `mmsp` client.
- **`google_genai` connection closure**: Passes the signal via an internal `AbortController` that its generator also aborts on exit, since closing that SDK's stream alone leaves the connection open.
- **Always throw caller's reason**: An aborted stream MUST throw the caller's reason, not the SDK's—thrown by the base class when the SDK ends quietly, and rethrown by `google_genai` in place of the SDK's `AbortError`.

## 6. Stateful Calls

- **Immediate lock release & no history**: An abort MUST release a stateful call's claim on the client at once and MUST NOT record its turn, even if the abort lands as `stop` arrives ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#62-one-stateful-call-at-a-time) §6.2).
- **Race with stream end**: An abort landing as the provider's stream ends MUST still terminate the stream as an abort.

## 7. Server, Playground and `mmsp` Client

- **Upstream abort on disconnect or Stop**: The MMSP server and playground MUST abort their upstream when the caller disconnects, and when the playground's Stop is clicked.
- **Python server disconnect detection**: Detects disconnect when a write fails (on the next event or keep-alive) and immediately closes the upstream.
- **`mmsp` client timing**: Ends the stream mid-read on abort; between events, ends at once in TypeScript and on the next read in Python (§4).

## 8. Leaving Without Aborting

- **Python unclosed streams**: Leaving a Python stream before `stop` without aborting or closing holds the provider request (and the stateful client lock) until `await stream.aclose()` or GC collection.
- **TypeScript `for await`**: Leaving `for await` closes the stream automatically.
- **Caller obligation**: A caller that retains a reference to a stream it leaves SHOULD abort or close it.

## 9. Conformance

- **Core client & signal modules**: `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, `src_py/mmsp/abort_signal.py`, `src_py/mmsp/auto_client.py`, and stream loops in `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`.
- **Server & playground**: `src_py/mmsp/integration/server.py` and `playground.py`, mirrored in `src_ts/src/integration/server.ts` and `playground.ts`.
- **Interruption test suite** (`src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`): Tests every streaming client (stateless and stateful) against a silent local upstream and verifies:
  - **<= 200 ms connection close**: On abort while waiting, on next read after abort while busy, on `aclose()` / `return()`, and on leaving the loop.
  - **Clean abort output**: Caller gets the abort error and no `.done` or `stop`.
  - **Zero side effects**: Nothing is recorded or traced, even when aborted after usage and finish reason arrive.
- **Signal & server tests**: `test_abort_signal.py`, `test_mmsp_server.py` / `mmsp-server.test.ts`.
