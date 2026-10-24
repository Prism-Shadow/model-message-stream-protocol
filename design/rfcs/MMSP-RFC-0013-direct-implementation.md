# MMSP-RFC-0013 Implementation code is straightforward

- Feature Name: `direct_implementation`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0013-direct-implementation.zh.md)

## Summary
[summary]: #summary

A client converts in its transform methods and nowhere else. Each method reads the SDK's typed event or the universal item it is given and maps it in one pass, with no layer of its own between the wire and the universal shape, and it accepts one shape of each input. A client reads as a diff against its reference client, and a reader follows one request or one response straight through the file. The base class keeps the same rule: it builds the public stream in `streaming_response` / `streamingResponse` itself, top to bottom, with `StreamItems` closing the items.

## Motivation
[motivation]: #motivation

A client is reviewed as a diff against its reference, and a reader follows one request or one response straight through the file; every helper layer and every shim that takes two shapes of the same input is a place where the two languages drift apart and a provider's quirk hides. The owner asked for it in these words: 转换代码尽量减少抽象，保持易懂. The mmsp-dev skill had said so as how-to; this makes it a rule a change may not bend. The audit that wrote it found no helper layer, and found three branches that read a second shape of an input, each for a history an earlier release recorded: a thought signature held as bytes, a tool call id that is the function name, a reasoning item recorded before its channel was. [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) added a fourth when it moved a gateway's reasoning block, which 0.5.5 kept whole, to the shared fidelity keys. On 2026-10-24 the owner asked the same of the base client: base client也减少一些抽象,尽量让代码容易看懂. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0012; what a message may carry is [MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md).

## Rule
[rule]: #rule

- The conversion of a client is `transform_uni_config_to_model_config`, `transform_uni_message_to_model_input` and `transform_model_output_to_uni_event` (`transformUniConfigToModelConfig`, …), with `_streaming_response_internal` / `_streamingResponseInternal` as a plain loop over the wire ([MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.md)). Its helpers are the private converters its reference client has, the fetching of an image, and `utils`; no conversion code is shared between clients except through `utils` and the base class, or by an adapter that subclasses the client of the protocol it serves and overrides only what its servers read differently, as `openai_chat_vllm_adapter` does `openai_chat`; any other client that needs what another has copies it, so that each reads as a diff against its reference (`openai_official` for the Responses protocol, `openai_chat` for Chat Completions).
- A transform reads the SDK's attributes directly and keeps field access, usage arithmetic and error text where they are used; a block is extracted only where inlining it would bury the flow, never for a few lines, and never as a shim that accepts both dicts and SDK objects.
- One shape per input: wire events are the SDK's types, and messages hold `.done` items only. The item types of histories recorded before 0.5.0 are converted in `legacy` before any transform sees them, until 0.6.0. The four shapes earlier releases recorded inside an item are read until 0.6.0 too: a thought signature as bytes, a tool call id equal to the function name, a reasoning item without its channel, and a 0.5.5 gateway reasoning block kept whole.
- Nothing redundant is kept ([MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md)).
- The base class reads the same way. `streaming_response` / `streamingResponse` validates the messages, reads the client's events, hands each delta to `StreamItems`, merges the usage and finish reason, and builds the `stop`, in that order and in the one method. Its abort handling sits in that method, with the races it covers stated beside it. No private class or helper layer stands between a client's events and the public stream.

## Enforced by
[enforced-by]: #enforced-by

- Review against the reference clients, as `.agents/skills/mmsp-dev/SKILL.md` describes.
- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`.
- `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`.
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`, which check that legacy item types are converted before a transform sees a message.
- `test_reasoning_fidelity.py` and its Jest mirror, which assert the exact item a replay sends.
- `test_message_order.py` and its Jest mirror.
