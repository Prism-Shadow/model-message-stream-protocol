# A stream stops at once: an abort, a closed generator or a left loop closes the provider's request

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `base_client`, `auto_client`, `ant_messages`, `anthropic_official`, `deepseek_official`, `google_genai`, `google_official`, `minimax_official`, `moonshot_official`, `openai_chat`, `openai_official`, `openai_responses`, `zai_official`, `integration`

[中文版](2026-10-23-interruption.zh.md)

## What changed

- Python `streaming_response` took the reading task before every read instead of once per stream, so an abort cancelled the read wherever it ran, including the task of its own the MMSP server and the playground start for each event. An abort while no read was pending closed the client's stream at once instead of at the caller's next read. An abort that landed as the provider's stream ended still raised `asyncio.CancelledError`, with no done items and no `stop`.
- Every Python client iterated its SDK stream inside `async with stream:`, so closing the client's generator (`aclose()`, leaving an `async for`, an abort) closed the HTTP response. `AutoLLMClient.streaming_response` and `streaming_response_stateful` closed the client's generator with their own (`contextlib.aclosing`).
- Python `GoogleGenaiClient` closed the HTTP responses its `generate_content_stream` request opened when its stream was closed, collected through a response event hook it handed the SDK's httpx client; closing the SDK's stream alone had left the connection open until the garbage collector ran.
- TypeScript `streamingResponse` threw the signal's reason once the client's stream ended on an aborted signal. An abort the openai and anthropic SDKs end quietly reached the caller as the abort, by default a `DOMException` named `AbortError`, where it had come back as `.done` items followed by `IncompleteStreamError`, or, after the usage and finish reason had arrived, as a `stop` that recorded the turn and saved its trace.
- TypeScript `GoogleGenaiClient` sent `generateContentStream` with the signal of its own `AbortController`, aborted by the caller's signal and when the client's generator was closed, so `return()` and leaving a `for await` closed the connection; an aborted stream threw the signal's reason instead of the SDK's own `AbortError`.
- The Python MMSP server and playground, on finding their caller gone, aborted the signal and waited for the read in flight before closing the stream, so the upstream request closed as soon as the disconnect was noticed; the server still notices it on a failed write, at the next event or keep-alive.
- `test_interruption.py` / `interruption.test.ts` streamed every client type, stateless and stateful, from a local upstream that goes silent after three deltas, and checked that the connection closed within 200 ms of an abort while the caller waited, an abort while it was busy, `aclose()` / `return()` and leaving the loop, that the caller got the abort error and no done item or `stop`, and that nothing was recorded or traced. `test_abort_signal.py` covered an abort while another task reads and one as the stream ends, `test_mmsp_server.py` the upstream closing during a silence, `mmsp-server.test.ts` an upstream that ends quietly on abort. The SDK stream stand-ins of the unit tests became streams a client enters with `async with`.

## An interrupted stream

| The caller | Python | TypeScript |
| --- | --- | --- |
| aborts the signal | the deltas that arrived, then `asyncio.CancelledError` carrying the signal's reason | the deltas that arrived, then the signal's reason |
| closes the generator or leaves the loop | the deltas it read, nothing more | the deltas it read, nothing more |

Either way the open item gets no `.done`, no `stop` is sent, nothing is appended to the history and no trace is saved.
