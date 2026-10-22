# MMSP-RFC-0011 Thinking survives the round trip

- Feature Name: `thinking_round_trip`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0011-thinking-round-trip.zh.md)

## Summary
[summary]: #summary

A client replays the thinking its own model produced on its own endpoint with everything that model needs to continue from it: the text through the field or channel that carried it, the signature, encrypted reasoning or reasoning field name recorded in `fidelity`, and the empty reasoning field a provider demands on a turn that made tool calls without thinking; the request is accepted and the model's behavior is intact. Thinking another model or endpoint produced goes back in the form the provider takes for thinking it did not produce, or is left out where the provider rejects it; it never goes back as the assistant's own text.

## Motivation
[motivation]: #motivation

Every reasoning model degrades when its earlier thinking is missing from a tool-use loop, and several refuse the request: DeepSeek returns 400 without `reasoning_content` on a turn that called a tool, Gemini 3 returns 400 without the thought signature on the first call of a step, Claude 5.5 rejects a partially dropped thinking block, and OpenAI, Kimi, GLM and MiniMax document the loss of quality (the snapshots under `llmsdk_docs/`). [MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.md) says what a replay may carry; this rule says what it must keep, which is what the owner asked for: a client's message turned into a `UniMessage` and back loses nothing the model needs, above all its thinking. The audit that wrote it ran a thinking-and-tool-call turn and its replay on every official client on 2026-10-22, and found the two cases where the sentence was false: a Claude replay of a thinking item that carries no signature, fixed in [#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268), and the Chat Completions client on OpenRouter, which never read the `reasoning_details` that carry GPT's encrypted reasoning and Gemini's thought signature on that route, fixed in <!-- W3 PR link -->`fix/openai-chat-reasoning-details`.

## Rule
[rule]: #rule

- What each wire needs back is what the client records: a Responses reasoning item's channel, `encrypted_content`, and the `signature` and `format` a gateway adds; a Messages thinking block's `signature`, and a redacted block's `data`; an Interactions thought step's signature; a generateContent part's `thought_signature`, on the part it came with; a Chat Completions turn's reasoning field name, with the text in that field, in both fields when the name is unknown, and empty on a tool-calling turn that thought nothing once the conversation has produced the field; a gateway's `reasoning_details`, as received. A field joins this list only when a probe shows the request fails or the model degrades without it ([MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.md)).
- The scope is the same model on the same endpoint. Thinking from elsewhere: a Claude replay leaves out a thinking item without a signature, as the API does with blocks the model cannot read; a Gemini replay opens the turn with the placeholder signature Google documents and keeps the text as an unsigned thought; a Chat Completions replay sends the text through both reasoning fields; a Responses replay rebuilds a `reasoning_text` item. None of them puts it in the assistant's text.
- A response that is thinking and nothing else is not recorded, because no provider takes it back: it raises `EmptyResponseError` ([MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.md)).
- The `mmsp` client sends items and their `fidelity` to its server unchanged, so the server's upstream client replays them as above.

## Enforced by
[enforced-by]: #enforced-by

The message transforms of the clients and the fidelity they record in their event transforms; `src_py/tests/test_reasoning_fidelity.py`, `test_reasoning_replay_without_thinking.py`, `test_message_order.py` and their Jest mirrors; the second round of `test_client.py::test_tool_use` / `client.test.ts`, which replays the thinking turn of every model in the catalog.
