# MMSP-RFC-0008 Request Interruption

- Feature Name: `request_interruption`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[中文版](MMSP-RFC-0008-request-interruption.zh.md)

## Abstract

A caller can interrupt a request at any point by aborting its signal or closing its stream, and the provider's request then closes at once, in every client of both packages, with the one exception §3 names. This document specifies what the caller does and receives, how each language closes the provider's request, what an interrupted stateful call records, and how the server, the playground and the `mmsp` client propagate an interruption.

## 1. Introduction

The owner's decision was 允许立即中断: a caller can stop a stream at any point, and the provider's request ends with it. Before [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292):
- closing or leaving a Python stream on the openai or google-genai SDK left the connection open until the garbage collector ran;
- an abort that came while the caller was busy, or while another task was reading, waited for the next read or the next event;
- an aborted TypeScript stream on the openai or anthropic SDK ended like a cut-off one: `.done` items and `IncompleteStreamError`, or, once the usage had arrived, a `stop` and a recorded turn.

So in Python the playground's Stop, and a server whose caller had gone, could keep the upstream request open for seconds, or for as long as the provider stayed silent. Stated in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0012.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Signal*: the `AbortSignal` a call is given, from `mmsp.abort_signal` in Python and the platform's own in TypeScript.
- *Abort*: `signal.abort(reason)` in Python; `abort(reason)` on the `AbortController` that owns the signal in TypeScript.
- *Close*: `aclose()` / `return()` on the stream's generator, or leaving the loop that reads it (in Python, once nothing else holds the generator).
- *Abort error*: `asyncio.CancelledError` carrying the signal's reason in Python; the signal's `reason` in TypeScript.
- *Open item*: the item whose deltas are streaming and which has no `.done` yet.

## 3. Interrupting a Stream

- A caller MAY interrupt a stream at any point by aborting its signal or closing it. The provider's request MUST close with it at once, except that the Python `mmsp` client, aborted while the caller is busy between reads, closes its request at the caller's next read (§4).
- After an abort the caller MUST get the deltas that arrived and then the abort error; a closed generator yields nothing more. The caller MUST NOT get a `.done` for the open item or a `stop`, nor a partial `.done` followed by `IncompleteStreamError`.
- A stream that ends without its `stop` MUST record nothing and save no trace ([MMSP-RFC-0004 §6.1](MMSP-RFC-0004-message-fidelity.md#61-the-history-holds-copies), [MMSP-RFC-0010 §3](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved)).

## 4. Python

Every Python client MUST read the provider's stream, where it has one, inside a context that closes it (`async with stream:`; `aclosing` on `google_genai`, which also closes the HTTP responses its request opened, because its SDK leaves them to the garbage collector), so closing the client's generator closes the connection. The base class does that as soon as the signal is aborted: it cancels a pending read in whichever task makes it, and with no read pending it closes the client's generator where it rests. The `mmsp` client forwards its server's stream in a `streaming_response` of its own, which cancels a pending read too but watches the signal only while a read is pending, so an abort with no read pending takes effect at the caller's next read, which raises the abort error and closes the request. `AutoLLMClient` and `streaming_response_stateful` close the generator they read with their own.

## 5. TypeScript

Every TypeScript client MUST pass the signal to its SDK, or to `fetch` in the `mmsp` client. `google_genai` passes it through an `AbortController` of its own, which its generator aborts on the way out too, because closing that SDK's stream leaves the connection open. An aborted stream MUST throw the caller's reason, not the SDK's: the base class throws it when the SDK ends its stream quietly, and `google_genai` rethrows it in place of the SDK's own `AbortError`.

## 6. Stateful Calls

An abort MUST release a stateful call's claim on the client at once, and the aborted call MUST NOT record its turn, even when the abort lands as the `stop` arrives ([MMSP-RFC-0004 §6.2](MMSP-RFC-0004-message-fidelity.md#62-one-stateful-call-at-a-time)). An abort that lands as the provider's stream ends MUST still end the stream as an abort.

## 7. Server, Playground and `mmsp` Client

- The MMSP server and the playground MUST abort their upstream when they find their caller gone, and the playground's Stop MUST abort it too.
- The Python server finds a disconnect when a write fails, at its next event or keep-alive, and from then on closes the upstream at once.
- The `mmsp` client's signal ends its stream mid-read, and between events at once in TypeScript and at the caller's next read in Python (§4).

## 8. Leaving Without Aborting

A caller that leaves a Python stream before its `stop`, without aborting or closing it, holds the provider's request, and on a stateful call the client, until the generator is closed: by `await stream.aclose()`, or by the event loop once nothing holds the generator. In TypeScript, leaving `for await` closes it. A caller that keeps a stream it leaves SHOULD abort or close it.

## 9. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`; `src_py/mmsp/abort_signal.py`; `src_py/mmsp/auto_client.py`; the stream loop of every client under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`.
- `src_py/mmsp/integration/server.py` and `playground.py`, mirrored in `src_ts/src/integration/server.ts` and `playground.ts`.
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`, which stream every streaming client type, stateless and stateful, from a local upstream that goes silent, and check that:
  - the connection closes within 200 ms of an abort while the caller waits, of the caller's next read after an abort while it was busy, of `aclose()` / `return()`, and of leaving the loop;
  - the caller gets the abort error and no `.done` or `stop`;
  - nothing is recorded or traced, also when the abort lands after the usage and the finish reason arrived.
- `test_abort_signal.py`; `test_mmsp_server.py` / `mmsp-server.test.ts`.
