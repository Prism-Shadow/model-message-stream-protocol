# MMSP-RFC-0012 Conversion is direct and carries nothing redundant

- Feature Name: `direct_conversion`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0012-direct-conversion.zh.md)

## Summary
[summary]: #summary

A client converts in its transform methods and nowhere else: each reads the SDK's typed event or the universal item it is given and maps it in one pass, with no layer of its own between the wire and the universal shape, and it accepts one shape of each input. A replay carries what [MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.md) allows and nothing more, and an item carries no field that no replay uses.

## Motivation
[motivation]: #motivation

A client is reviewed as a diff against its reference, and a reader follows one request or one response straight through the file; every helper layer, every shim that takes two shapes of the same input, and every field kept "in case" is a place where the two languages drift apart and a provider's quirk hides. The owner asked for it in those words: as little abstraction as possible, keep it understandable, keep only the necessary parts, do not keep redundant fields. The mmsp-dev skill had said so as how-to; this makes it a rule a change may not bend. The audit that wrote it found no helper layer and no dead field, and found three branches that read a second shape of an input, each for a history an earlier release recorded: a thought signature held as bytes, a tool call id that is the function name, a reasoning item recorded before its channel was.

## Rule
[rule]: #rule

- The conversion of a client is `transform_uni_config_to_model_config`, `transform_uni_message_to_model_input` and `transform_model_output_to_uni_event` (`transformUniConfigToModelConfig`, …), with `_streaming_response_internal` / `_streamingResponseInternal` as a plain loop over the wire ([MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.md)). Its helpers are the private converters its reference client has, the fetching of an image, and `utils`; nothing is shared between clients except through `utils` and the base class, and a client that needs what another has copies it, so that each reads as a diff against its reference (`openai_official` for the Responses protocol, `openai_chat` for Chat Completions).
- A transform reads the SDK's attributes directly and keeps field access, usage arithmetic and error text where they are used; a block is extracted only where inlining it would bury the flow, never for a few lines, and never as a shim that accepts both dicts and SDK objects.
- One shape per input: wire events are the SDK's types, messages hold `.done` items only, and the item types of histories recorded before 0.5.0 are converted in `legacy` before any transform sees them, until 0.6.0; the three shapes such histories carry inside an item, a thought signature as bytes, a tool call id equal to the function name, a reasoning item without its channel, are read until 0.6.0 too.
- Nothing redundant: `StreamItems` strips `item_id` before an item goes out; `fidelity` holds no copy of a universal field and no id the provider regenerates ([MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.md)); a field a client records that no replay uses is removed, not kept.

## Enforced by
[enforced-by]: #enforced-by

Review against the reference clients as `.agents/skills/mmsp-dev/SKILL.md` describes; `StreamItems` in `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts` and `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which reject an `item_id` on any item; `src_py/tests/test_reasoning_fidelity.py` and its Jest mirror, which assert the exact reasoning item a replay sends, with no id and no partial ciphertext; `test_message_order.py`; `test_stream_protocol.py`, which checks legacy item types are converted before a transform sees a message.
