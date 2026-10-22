# MMSP-RFC-0010 Every stream ends with its usage and finish reason

- Feature Name: `stop_metadata`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0010-stop-metadata.zh.md)

## Summary
[summary]: #summary

A stream a client finishes ends with one `stop` event whose `usage_metadata` is an object and whose `finish_reason` is set, and the assistant message built from that stream carries both. A provider stream that ends without either raises `IncompleteStreamError` in place of the `stop` event, after the deltas before it, so no caller sees a stop without them and no stateful history records the turn.

## Motivation
[motivation]: #motivation

A caller reads the cost of a request from the `stop` event and nowhere else, and a stored history keeps the cost of every turn on its assistant message; both need the two fields to be there every time, not usually. The base class already refused to emit a stop without them, but with a bare `ValueError` that a caller could not tell from a bug ([MMSP-RFC-0007](MMSP-RFC-0007-typed-rejection.md)). The case this rule was decided on: on 2026-10-22 a GLM-5.3-Flash stream in CI ended without its usage chunk ([run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)); a probe of the same request showed the provider's last chunk carries the finish reason and the usage together every time, so the stream had been cut short, which is what a caller wants to retry. Fixed in <!-- W1 PR link -->`fix/incomplete-stream-error`.

## Rule
[rule]: #rule

- A client's `stop` events carry the usage and the finish reason wherever the wire reports them, in pieces; the base class merges the pieces field by field into the one public `stop`, a later count replacing an earlier one ([MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.md)). A count the provider does not report is `None`; no count is required to be a number.
- An embedding request is one `stop` event carrying its vectors, its prompt tokens and `finish_reason` `stop`.
- `IncompleteStreamError` names the client and the missing field or fields, and carries the usage or finish reason that did arrive, so the tokens can still be counted. It is not a `StreamProtocolError`, which is a bug in a client, and not an `EmptyResponseError`, which is a response without content.
- `concat_uni_events_to_uni_message`, the stateful history and the tracer copy the `stop` event's `usage_metadata` and `finish_reason` onto the assistant message; a message a caller builds by hand may carry neither.
- The `mmsp` client forwards its server's `stop` event as it is; a server-side `IncompleteStreamError` reaches it as `UpstreamError` with that `error_type` and the error's fields.

## Enforced by
[enforced-by]: #enforced-by

`_PublicStream.stop` in `src_py/mmsp/base_client.py` and `PublicStream.stop` in `src_ts/src/baseClient.ts`; `IncompleteStreamError` in `src_py/mmsp/errors.py` / `src_ts/src/errors.ts` and its case in `wire.py` / `wire.ts`; `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream; `test_stream_protocol.py`, `test_empty_response.py`, `test_mmsp_server.py` and their Jest mirrors.
