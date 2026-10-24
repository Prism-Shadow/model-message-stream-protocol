# MMSP-RFC-0012 A request can be interrupted

- Feature Name: `interruptible_requests`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0012-interruptible-requests.zh.md)

## Summary
[summary]: #summary

A caller stops a stream at any point by aborting its signal or by closing the generator, and the provider's request closes with it at once, in every client of both packages, except that the Python `mmsp` client, aborted while the caller is busy between reads, closes its request at the caller's next read. The caller gets the deltas that arrived and then the abort error, or nothing more from a closed generator, and never a `.done` for the open item or a `stop`. A stream that ends without its `stop` records nothing and saves no trace.

## Motivation
[motivation]: #motivation

The owner's decision was 允许立即中断: a caller can stop a stream at any point, and the provider's request ends with it. Before [#292](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/292):
- closing or leaving a Python stream on the openai or google-genai SDK left the connection open until the garbage collector ran;
- an abort that came while the caller was busy, or while another task was reading, waited for the next read or the next event;
- an aborted TypeScript stream on the openai or anthropic SDK ended like a cut-off one: `.done` items and `IncompleteStreamError`, or, once the usage had arrived, a `stop` and a recorded turn.

So in Python the playground's Stop, and a server whose caller had gone, could keep the upstream request open for seconds, or for as long as the provider stayed silent.

## Rule
[rule]: #rule

- **Closing and the abort error.** A caller closes the generator with `aclose()` / `return()`, or by leaving the loop (in Python, once nothing else holds the generator). The abort error is `asyncio.CancelledError` carrying the signal's reason in Python, and the signal's `reason` in TypeScript. The caller never gets a partial `.done` followed by `IncompleteStreamError`.
- **Python.** Every Python client reads the provider's stream, where it has one, inside a context that closes it (`async with stream:`; `aclosing` on `google_genai`, which also closes the HTTP responses its request opened, because its SDK leaves them to the garbage collector). So closing the client's generator closes the connection. The base class does that as soon as the signal is aborted: it cancels a pending read in whichever task makes it, and with no read pending it closes the client's generator where it rests. `AutoLLMClient` and `streaming_response_stateful` close the generator they read with their own.
- **TypeScript.** Every TypeScript client passes the signal to its SDK, or to `fetch` in the `mmsp` client. `google_genai` passes it through an `AbortController` of its own, which its generator aborts on the way out too, because closing that SDK's stream leaves the connection open. An aborted stream throws the caller's reason, not the SDK's: the base class throws it when the SDK ends its stream quietly, and `google_genai` rethrows it in place of the SDK's own `AbortError`.
- **Stateful calls.** An abort releases a stateful call's claim on the client at once, and the aborted call never records its turn, even when the abort lands as the `stop` arrives ([MMSP-RFC-0008](MMSP-RFC-0008-immutable-history.md)). An abort that lands as the provider's stream ends is still an abort.
- **Server, playground and `mmsp` client.**
  - The MMSP server and the playground abort their upstream when they find their caller gone, and the playground's Stop aborts it too.
  - The Python server finds a disconnect when a write fails, at its next event or keep-alive, and from then on closes the upstream at once.
  - The `mmsp` client's signal ends its stream between events or mid-read.
- **Leaving without aborting.** A caller that leaves a Python stream before its `stop`, without aborting or closing it, holds the provider's request, and on a stateful call the client, until the generator is closed: by `await stream.aclose()`, or by the event loop once nothing holds the generator. In TypeScript, leaving `for await` closes it.

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`.
- `src_py/mmsp/abort_signal.py`.
- The stream loop of every client under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`, and `src_py/mmsp/auto_client.py`.
- `src_py/mmsp/integration/server.py` and `playground.py`, mirrored in `src_ts/src/integration/server.ts` and `playground.ts`.
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`. They stream every streaming client type, stateless and stateful, from a local upstream that goes silent, and check that:
  - the connection closes within 200 ms of an abort while the caller waits, of the caller's next read after an abort while it was busy, of `aclose()` / `return()`, and of leaving the loop;
  - the caller gets the abort error and no `.done` or `stop`;
  - nothing is recorded or traced, also when the abort lands after the usage and the finish reason arrived.
- `test_abort_signal.py`.
- `test_mmsp_server.py` / `mmsp-server.test.ts`.
