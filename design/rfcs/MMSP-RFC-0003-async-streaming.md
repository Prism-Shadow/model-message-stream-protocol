# MMSP-RFC-0003 One stream grammar, closed by the base class

- Feature Name: `stream_grammar`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0003-stream-grammar.zh.md)

## Summary
[summary]: #summary

A stream is a run of `delta` events, each carrying exactly one item, closed by exactly one `stop` event, which carries the usage and the finish reason and no items. Every item streams as contiguous `.delta` fragments followed by its one `.done` item, which is those fragments joined: its growing field is the join of theirs, a tool call's arguments parsed from the joined JSON, its other fields are the first fragment's, and its `fidelity` is the one the fragments carried; items never interleave, and the `.done` items in order, with the `stop` event's usage and finish reason, are the assistant message. A stream ends with its `stop` event or with an exception, never both.

## Motivation
[motivation]: #motivation

Before the second streaming protocol ([#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)), each client decided where its items ended and closed them itself, so the fixes for one provider's stream ([#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)) landed in one client at a time, and a consumer could not rely on one shape of stream. With the grammar closed in one place, a client is a plain loop over wire events, the per-kind code of the stream lives in one file, and a stream that breaks the grammar is a bug in that client, found by the shared tests rather than by a caller.

## Rule
[rule]: #rule

- A client yields deltas only, never a `.done` item; `StreamItems` decides where each item ends and closes it. The usage and finish reason of the client's `stop` events are merged into the one public `stop`.
- A `.done` item is built by `StreamItems` alone, from the fragments that went out, so what a consumer streamed and what it is handed never disagree; a client that reads a completed item from the wire (MiniMax's tool calls) streams it as one fragment and never also its deltas. `concat_uni_events_to_uni_message` keeps exactly the `.done` items and the `stop` event's two fields, and the stateful history records that message.
- A provider stream that ends without the usage or the finish reason the `stop` needs raises `IncompleteStreamError` ([MMSP-RFC-0010](MMSP-RFC-0010-stop-metadata.md)).
- What a client yields against this grammar (a `.done` item, usage on a delta event, two different fidelity payloads on one item) raises `StreamProtocolError` in every mode: it is a bug in the client, never repaired.
- A wire event with nothing universal is the empty delta event, and an event a client does not recognize is skipped, so a gateway's own frames cannot end a generation; `MMSP_DEBUG` makes it raise instead.

## Enforced by
[enforced-by]: #enforced-by

`_PublicStream` in `src_py/mmsp/base_client.py` and `StreamItems` in `src_py/mmsp/stream_items.py`, mirrored in `baseClient.ts` and `streamItems.ts`; `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream, checking that each `.done` item equals the join of its fragments; `test_stream_protocol.py`, `test_stream_items.py`, `test_unknown_events.py` and their mirrors.
