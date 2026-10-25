# MMSP-RFC-0003 Every request is an async stream

- Feature Name: `async_streaming`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[中文版](MMSP-RFC-0003-async-streaming.zh.md)

## Summary
[summary]: #summary

A model is called only through `streaming_response` and `streaming_response_stateful` (`streamingResponse` and `streamingResponseStateful` in TypeScript), asynchronous generators of `UniEvent`; there is no synchronous call and no call that returns a whole response.

The stream has one grammar, closed by the base class:
- a run of `delta` events, each carrying exactly one item;
- then exactly one `stop` event, which carries the usage and the finish reason and no items.

A stream ends with its `stop` event or with an exception, never both.

## Motivation
[motivation]: #motivation

A host serving many conversations must never block its loop on a provider, and a caller must never mistake a cut-off answer for a complete one, so every call is an async stream and a stream without its `stop` did not complete. Before the second streaming protocol ([#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)), each client decided where its items ended and closed them itself. The fixes for one provider's stream ([#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)) therefore landed one client at a time, and a consumer could not rely on one shape of stream. With the grammar closed in one place:
- a client is a plain loop over wire events;
- the per-kind code of the stream lives in one file;
- a stream that breaks the grammar is a bug in that client, found by the shared tests rather than by a caller.

Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0003.

## Rule
[rule]: #rule

- **What a client yields.** A client's `_streaming_response_internal` / `_streamingResponseInternal` sends the request and yields one `UniEvent` per event of the provider's stream. It reads the provider's streaming endpoint wherever the provider has one. It yields deltas only, never a `.done` item.
- **What the base class does.** It hands each delta to `StreamItems` (`stream_items.py` / `streamItems.ts`), which decides where each item ends and closes it. It merges the usage and finish reason of the client's `stop` events into the one public `stop` ([MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md)).
- **Items.** Every item streams as contiguous `.delta` fragments followed by its one `.done` item, which is those fragments joined. Items never interleave. The `.done` items in order, with the `stop` event's two fields, are the assistant message.
- **How a `.done` item is built.** `StreamItems` alone builds it, from the fragments that went out, so what a consumer streamed and what it is handed never disagree:
  - its growing field is the join of theirs;
  - a tool call's arguments are parsed from the joined JSON;
  - its other fields are the first fragment's;
  - its `fidelity` is the one the fragments carried. At most one delta of an item carries its fidelity, and the `.done` repeats it.

  A client that reads a completed item from the wire (MiniMax's tool calls) streams it as one fragment and never also its deltas. `concat_uni_events_to_uni_message` keeps exactly the `.done` items and the `stop` event's two fields.
- **Breaking the grammar.** What a client yields against this grammar raises `StreamProtocolError` in every mode: a `.done` item, usage on a delta event, or two different fidelity payloads on one item. It is a bug in the client and is never repaired. Two other errors take the place of the `stop` ([MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md)):
  - a provider stream that ends without its usage or finish reason raises `IncompleteStreamError`;
  - a response that is thinking and nothing else raises `EmptyResponseError`.
- **Events with nothing universal.** A wire event with nothing universal is the empty delta event. An event a client does not recognize is skipped, so a gateway's own frames cannot end a generation. `MMSP_DEBUG` makes it raise `UnknownEventError` instead ([MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md)).
- **The `mmsp` client** forwards its server's public stream as sent.

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` and `src_py/mmsp/stream_items.py`, mirrored in `src_ts/src/baseClient.ts` and `src_ts/src/streamItems.ts`.
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream, checking that each `.done` item equals the join of its fragments.
- `test_stream_protocol.py`, `test_stream_items.py`, `test_unknown_events.py`, `test_empty_response.py` and their Jest mirrors.
- `test_mmsp_server.py` / `mmsp-server.test.ts`, which check that the stream through the server equals the upstream stream.
