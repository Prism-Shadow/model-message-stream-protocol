# MMSP-RFC-0004 Messages stay lean

- Feature Name: `lean_messages`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[中文版](MMSP-RFC-0004-lean-messages.zh.md)

## Summary
[summary]: #summary

A message holds its items' universal fields and, per item, only the `fidelity` a replay needs: wire data no universal field carries, such as a thinking signature, encrypted reasoning, a phase, or the reasoning field name a strict upstream demands; never a copy of a universal field, never an id the provider regenerates or ignores, and never a field no replay uses. A client rebuilds a replayed assistant turn from those fields plus the stand-ins a provider requires for what the turn lacks (a placeholder thought signature, an empty reasoning field). Consumers treat `fidelity` as opaque and pass it back unchanged.

## Motivation
[motivation]: #motivation

A replayed turn has to be accepted by the API with the model's behavior intact; it does not have to reproduce the wire item field for field, and every field mirrored into `fidelity` is one more provider shape that consumers, traces and histories carry. [#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) added `fidelity` for the exact reasoning field a strict upstream demands back; since then a field earns its place only when a probe shows the request fails or the model degrades without it. [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) replaced a gateway's reasoning block, which had been kept whole, with the three keys that rebuild it. The owner asked for it in these words: 转换只保留必要的部分，冗余字段不需要保留 (a conversion keeps only the necessary parts; redundant fields need not be kept). Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0008 and the second half of MMSP-RFC-0012.

## Rule
[rule]: #rule

- This rule says what a message may carry; [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md) says what it must keep.
- `fidelity` gives a kind of data the same name in every client: `signature`, `encrypted_content`, `format`, `channel`, `phase`, `reasoning_field`, `reasoning_id`. A client never keeps a wire item, or a list of them, whole under the wire's own name. A `reasoning_id` is kept only for a gateway's encrypted reasoning block, whose id the gateway needs back.
- `StreamItems` strips `fidelity.item_id` before an item goes out. `item_id` is the id a client identifies its items with while streaming, so it never reaches consumers, traces or histories.
- A field a client records that no replay uses is removed, not kept. The shapes earlier releases recorded inside an item and no client records any longer are read until 0.6.0 ([MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.md)).

## Enforced by
[enforced-by]: #enforced-by

- `Fidelity` in `src_py/mmsp/types.py` / `src_ts/src/types.ts`.
- `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`, which keep one fidelity per item and strip `item_id`.
- The message transforms of the clients.
- `src_py/tests/test_reasoning_fidelity.py`, which asserts the exact reasoning item a replay sends, with no id and no partial ciphertext.
- `test_reasoning_replay_without_thinking.py`, `test_tool_call_arguments.py`, `test_stream_protocol.py` and their Jest mirrors.
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which reject an item that still carries `fidelity.item_id`.
