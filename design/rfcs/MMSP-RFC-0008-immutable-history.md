# MMSP-RFC-0008 History does not change

- Feature Name: `immutable_history`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[中文版](MMSP-RFC-0008-immutable-history.zh.md)

## Summary
[summary]: #summary

The stateful history holds deep copies and shares no object with the caller or the yielded events:
- `streaming_response_stateful` records a copy of the message sent, and a copy of the assistant message when the `stop` event arrives;
- `get_history` returns a copy, and `set_history` stores one.

A recorded message keeps its items and `fidelity`, and every later call replays it from them. The one field MMSP writes onto a message it is given is `created_at`, which no message transform reads, so it reaches no provider and leaves the input tokens and the prefix cache as they were.

## Motivation
[motivation]: #motivation

A conversation is a prefix the provider caches and the caller pays for. A history that changes between turns changes the model's context and its cost without anyone deciding to. That can happen through an event mutated after it was yielded, a caller's edit to a list it was given back, or a second call racing the first and recording a turn generated without it. [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) made three changes:
- the history holds copies;
- one stateful call runs at a time;
- a message with nothing to send is refused, instead of being dropped or sent empty.

On timestamps the owner decided: 给历史消息加时间戳 created_at 不会影响输入 token，也不会破坏前缀缓存，所以可以放心做. So the base client stamps the caller's own message rather than a copy.

## Rule
[rule]: #rule

- **One stateful call at a time.** A second `streaming_response_stateful` on a client while one is in flight raises `ConcurrentCallError` before anything is sent. A call holds the client until its `stop` event, its error, the abort of its signal or the close of its generator. An aborted call releases the client at once and records nothing, even when the abort lands as its `stop` arrives ([MMSP-RFC-0012](MMSP-RFC-0012-interruptible-requests.md)). `streaming_response` keeps no history, so it runs beside a stateful call. `AutoLLMClient` forwards to the wrapped client, so the wrapped client holds the claim.
- **When the turn is recorded.** The turn is recorded before the `stop` event is yielded, so a caller may stop iterating at the `stop`, and the next call may begin from then. A stream that ends without its `stop` appends nothing and saves no trace ([MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md)).
- **What is written to a message.** A message sent without `created_at` is stamped with the time it is sent, on the object itself, by `streaming_response` and by the `mmsp` client: the caller's own message, or the history's copy of one recorded without it. Nothing else is written to a message MMSP is given. Until 0.6.0, messages recorded before 0.5.0 are converted by `legacy` to the current item types, as copies, before a request and in `set_history` ([MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.md)).
- **A message with nothing to send.** A message with nothing a client can send (no items, or thinking alone) raises `InvalidMessageError` with its `message_index` before the provider's request goes out ([MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md)). It is never dropped silently and never sent empty, so the request and the history hold the same turns.

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`.
- `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`.
- `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`.
- The message transforms of the clients, none of which reads `created_at`. Outside the types and the stamping in the base client and the `mmsp` client, only the tracer and the playground read it, to display it.
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`, which check that:
  - the caller's messages gain their `created_at` and nothing else;
  - the history shares no object with the caller or the stream;
  - a second stateful call raises `ConcurrentCallError`;
  - an aborted call releases the client and records nothing;
  - a conversation continues the history it was given;
  - legacy item types are converted.
- `test_message_order.py` / `message-order.test.ts`, which send an empty and a thinking-only message through the message transforms of the clients.
- `test_mmsp_server.py` / `mmsp-server.test.ts`, which record a stateful turn through the `mmsp` client with its `created_at`.
