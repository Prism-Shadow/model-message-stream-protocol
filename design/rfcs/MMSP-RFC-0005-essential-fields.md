# MMSP-RFC-0005 Essential fields are never dropped

- Feature Name: `essential_fields`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0005-essential-fields.zh.md)

## Summary
[summary]: #summary

What a stream reports reaches the caller, and what a model needs back goes back:
- **The stop event.** A stream a client finishes ends with one `stop` event whose `usage_metadata` is an object and whose `finish_reason` is set, and the assistant message built from it carries both. A provider stream that ends without either raises `IncompleteStreamError` in place of the `stop`, after the events before it, so no caller sees a stop without them and no history records the turn.
- **Thinking.** A client replays the thinking its own model produced with everything that model needs to continue from it. Thinking another model or endpoint produced goes back in the form the provider takes for it, or is left out where the provider rejects it; it never goes back as the assistant's own text.
- **Tool calls.** A client replays every tool call with the provider's call id.

## Motivation
[motivation]: #motivation

A caller reads the cost of a request from the `stop` event and nowhere else, and a stored history keeps the cost of every turn on its assistant message. On 2026-10-22 a GLM-5.3-Flash stream in CI ended without its usage chunk ([run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)). A probe of the same request showed the provider's last chunk carries the finish reason and the usage together every time, so the stream had been cut short, which is what a caller wants to retry ([#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)).

Every reasoning model degrades when its earlier thinking is missing from a tool-use loop, and several refuse the request:
- DeepSeek returns 400 without `reasoning_content` on a turn that called a tool;
- Gemini 3 returns 400 without the thought signature on the first call of a step;
- Claude 5.5 rejects a partially dropped thinking block.

The owner's ask was that a message turned into a `UniMessage` and back loses nothing the model needs, above all its thinking. The audit of 2026-10-22 ran a thinking-and-tool-call turn and its replay on every official client and found the two places where it did not hold ([#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268), [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)). Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0010 and MMSP-RFC-0011.

## Rule
[rule]: #rule

- **Usage and finish reason.** A client's `stop` events carry the usage and the finish reason wherever the wire reports them, in pieces. The base class merges them field by field into the one public `stop`: a later count replaces an earlier one, and a 0 stays 0. A count the provider does not report is `None`; no count is required to be a number.
- **Embeddings.** An embedding request streams its vectors as items, then one `stop` carrying the input count its endpoint reports as `prompt_tokens`, and `finish_reason` `stop`. `openai-embedding` pairs each vector with its input by the vector's `index`.
- **`IncompleteStreamError`** names the client and the missing field or fields, and carries the usage or finish reason that did arrive, so the tokens can still be counted. It is not a `StreamProtocolError`, which is a bug in a client, and not an `EmptyResponseError`, which is a response without content ([MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md)).
- **Copying onto the assistant message.** `concat_uni_events_to_uni_message`, the stateful history and the tracer copy the `stop` event's `usage_metadata` and `finish_reason` onto the assistant message. A message a caller builds by hand may carry neither.
- **The `mmsp` client:**
  - forwards its server's `stop` as it is;
  - raises `IncompleteStreamError` itself when the server's stream ends before a `stop`;
  - receives a server-side `IncompleteStreamError` as `UpstreamError`, with that `error_type` and the error's fields.
- **What each wire needs back** is what the client records ([MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md)):
  - a Responses reasoning item's channel and `encrypted_content`, plus the `signature` and `format` a gateway adds;
  - a Messages thinking block's `signature`, and a redacted block's `data`;
  - an Interactions thought step's signature;
  - a generateContent part's `thought_signature`, on the part it came with;
  - a Chat Completions turn's reasoning field name, with the text in that field. The text goes in both fields when the name is unknown, and is empty on a tool-calling turn that thought nothing once the conversation has produced the field;
  - a gateway's encrypted reasoning block, as `encrypted_content`, `format` and `reasoning_id`, rebuilt on replay.

  A field joins this list only when a probe shows the request fails or the model degrades without it.
- **Thinking from elsewhere.** The scope is the same model on the same endpoint. For thinking produced elsewhere:
  - `anthropic-official` leaves out a thinking item without a signature, as the API does with blocks the model cannot read;
  - a Gemini replay keeps the text as an unsigned thought and puts the placeholder signature Google documents where the API checks one: `google-official` opens the turn with it, and `google-genai` signs the turn's first call with it;
  - a Chat Completions replay sends the text through both reasoning fields;
  - a Responses replay rebuilds a reasoning item with the text as `reasoning_text`;
  - through `ant-messages`, a compatible client, an unsigned thinking item goes back unsigned. That is the form third-party Messages servers take; Anthropic's own API refuses it.

  None of them puts it in the assistant's text.
- **Thinking alone.** A response that is thinking and nothing else is not recorded, because no provider takes it back: it raises `EmptyResponseError`.
- **`tool_call_id`** holds the provider's call id where the wire carries one, and a replay sends it back. Where the wire carries both an item id and a call id, it holds the call id, which correlates a result to its call. A tool result without one raises `InvalidMessageError` ([MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md)).
- **The `mmsp` client** sends items and their `fidelity` to its server unchanged, so the server's upstream client replays them as above.

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, which build the one `stop` and raise in its place.
- `IncompleteStreamError` in `src_py/mmsp/errors.py` / `src_ts/src/errors.ts`, and its case in `wire.py` / `wire.ts`.
- The message transforms of the clients, and the fidelity they record in their event transforms.
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream.
- `test_stream_protocol.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_mmsp_server.py`, `test_reasoning_fidelity.py`, `test_reasoning_replay_without_thinking.py`, `test_message_order.py`, `test_tool_call_arguments.py` and their Jest mirrors.
- The second round of the tool-use case of `test_client.py` / `client.test.ts`, which replays the tool-calling turn of every model in the catalog, its thinking included.
