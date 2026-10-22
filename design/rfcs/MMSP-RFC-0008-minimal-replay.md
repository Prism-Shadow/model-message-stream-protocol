# MMSP-RFC-0008 Replay is minimal; fidelity is the exception channel

- Feature Name: `minimal_replay`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0008-minimal-replay.zh.md)

## Summary
[summary]: #summary

A client rebuilds a replayed assistant turn from its items' universal fields and their `fidelity`, plus the stand-ins a provider requires for what the turn lacks (a dummy thought signature, an empty reasoning field). `fidelity` holds only wire data that no universal field carries and a replay sends back, such as a thinking signature, encrypted reasoning, a phase, or the reasoning field name a strict upstream demands; never an id the provider regenerates or ignores, and never a copy of a universal field. Consumers treat it as opaque and pass it back unchanged.

## Motivation
[motivation]: #motivation

A replayed turn has to be accepted by the API with the model's behavior intact; it does not have to reproduce the wire item field for field, and every field mirrored into `fidelity` is one more provider shape that consumers, traces and histories carry. `fidelity` was added in [#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) for the exact reasoning field a strict upstream demands back; since then a field earns its place only when a probe shows the request fails or the model degrades without it. [#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268) is the case of a thinking item without the signature Claude demands: the replay leaves it out rather than fail.

## Rule
[rule]: #rule

- In a stream, at most one delta of an item carries its fidelity, and the item's `.done` repeats it.
- Claude takes a thinking block back only with the signature it issued, so a Claude replay omits a thinking item that carries none.
- `tool_call_id` holds the provider's call id where the wire carries one, and a replay sends it back; where the wire carries both an item id and a call id, it holds the call id, which correlates a result to its call.

## Enforced by
[enforced-by]: #enforced-by

`Fidelity` in `types.py` / `types.ts`; `StreamItems`, which keeps one fidelity per item and strips `item_id`; the message transforms of the clients; `src_py/tests/test_reasoning_fidelity.py`, `test_reasoning_replay_without_thinking.py`, `test_tool_call_arguments.py` and their Jest mirrors.
