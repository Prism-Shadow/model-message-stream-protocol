# MMSP-RFC-0009 Protocol Conversion

- Feature Name: `protocol_conversion`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[中文版](MMSP-RFC-0009-protocol-conversion.zh.md)

## Abstract

Protocol conversion is the translation between a provider's wire protocol and MMSP, which every client uses as its intermediate representation: a request is converted from MMSP to the wire, every wire event back to MMSP, and a conversation passes from one provider to another only through MMSP. This document specifies that role, the three transforms a client converts in, the order and the one input shape they keep, the legacy shapes still read, and the base class that turns a client's events into the public stream, all of it written as direct code with no layer of its own.

## 1. Introduction

The owner asked for this specification in these words: 写一下把 MMSP 作为 IR 的转换逻辑，实现代码减少抽象，尽量直观. With one representation in the middle, a client is two conversions, to its own wire and back, and a conversation recorded through one client continues through another without either client knowing the other's shapes.

A client is reviewed as a diff against its reference client, and a reader follows one request or one response straight through the file; every helper layer and every shim that takes two shapes of the same input is a place where the two languages drift apart and a provider's quirk hides. The owner's earlier words were 转换代码尽量减少抽象，保持易懂, and of the base client, base client也减少一些抽象,尽量让代码容易看懂, which [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297) carried out. The order rule comes from a failure: a Responses-style transform appended the collected text after the tool call it preceded, and DeepSeek answered "No tool output found for tool call" until [#185](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/185). [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) added the 0.5.5 gateway reasoning block to the shapes read from earlier releases when it moved that block, which 0.5.5 kept whole, to the shared fidelity keys. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0012 and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0013; the order rule was part of MMSP-RFC-0002 in both.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Intermediate representation*: `UniConfig`, `UniMessage` and `UniEvent` with their content items ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#3-the-three-shapes) §3).
- *Wire*: a provider's request and event shapes, as its SDK types them.
- *Provider client*: every client but `mmsp`, which speaks to an MMSP server rather than to a provider.
- *Transform*: one of the three conversion methods of §4.
- *Reference client*: the client a new client of the same protocol is read as a diff against: `openai-official` for the Responses protocol, `openai-chat` for Chat Completions.
- *Adapter*: a client that subclasses the client of the protocol it serves and overrides only what its servers read differently, as `openai-chat-vllm-adapter` does `openai-chat`.
- *Fidelity*: as [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5 defines it.

## 3. MMSP as the Intermediate Representation

- Every request MUST be converted from MMSP, the `UniConfig` to the provider's config and the `UniMessage`s to its input, and every wire event, or the one response of an endpoint that does not stream, MUST be converted to a `UniEvent` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1). Nothing of a provider's shape crosses into a message or an event ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#34-content-items) §3.4).
- A client MUST NOT convert to or from another provider's wire; the only path between two providers is through MMSP. A caller MAY continue a conversation recorded through one client on another: the record is the items and their `fidelity`, and the receiving client converts them to its own wire as [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#4-what-each-wire-needs-back) §4 and §5 specify.
- Conversion MUST be stateless. Every request carries the whole conversation, a client keeps no conversion state from one request or event to the next, and no client refers to state a provider keeps: the Responses clients (`openai-official`, `openai-responses`, `deepseek-official`, `minimax-official`) and the Interactions client (`google-official`) send `store: false` and no id of an earlier response. A client's one memory is the stateful history, MMSP messages that the base class keeps and sends whole on every call.
- The MMSP server's wire is MMSP itself: `POST /v1/stream` takes `{"model", "messages", "config"}` and answers with the public stream as server-sent events, every bytes value as base64 text (`wire.py` / `wire.ts`). The `mmsp` client's transforms are therefore the identity up to that encoding, and the server's upstream client converts to the provider.

## 4. The Three Transforms

- A client MUST convert in `transform_uni_config_to_model_config`, `transform_uni_message_to_model_input` and `transform_model_output_to_uni_event` (`transformUniConfigToModelConfig`, `transformUniMessageToModelInput`, `transformModelOutputToUniEvent`). The event transform converts one wire event on its own.
- `_streaming_response_internal` / `_streamingResponseInternal` MUST call the config and message transforms, send the request, and yield the event transform's result for each wire event. It MAY complete the request with what needs the config and the messages together, such as the system prompt at the head of a Chat Completions list, the cache breakpoint `anthropic-official` sets on Bedrock, or the single turn a Gemini TTS model takes, and MAY correct an event from an earlier one of the same stream, as `google-genai` reports a turn that called a tool as `tool_call` where generateContent reports `STOP`. The one exception is the embedding path of the two Google clients (`_embed_messages_internal` / `_embedMessagesInternal`), which builds its `embedContent` request itself.
- Conversion code MUST NOT be shared between clients except through `utils`, the base class, or an adapter. A client's private helpers SHOULD be the ones its reference client has, plus the fetching of an image, and a client that needs what another has SHOULD copy it, so that each reads as a diff against its reference.

## 5. Direct Code

A transform reads the SDK's attributes directly (`model_output.delta`, `model_output.item.call_id`) and keeps field access, usage arithmetic and error text where they are used. A contributor SHOULD extract a block only where inlining it would bury the flow, never for a few lines, and MUST NOT write a shim that accepts both dicts and SDK objects.

## 6. Order

The message transform MUST keep the order of an assistant turn's items, thinking, then text, then a tool call, wherever the wire can express it. Messages, generateContent and Interactions keep a turn's items in one ordered list of content blocks, parts or steps, which takes them in order. A Responses-style wire makes a reasoning item, a function call or a tool result an input item of its own while the turn's text is collected into a message item, and the collected text MUST be appended as a message item before such an entry. Chat Completions holds the text, the reasoning field and the tool calls in fields of one message and carries no order between them.

## 7. One Shape per Input

- A transform MUST take one shape of each input, apart from the legacy shapes below: a wire event as the SDK types it, and a message that holds `.done` items ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#32-unimessage) §3.2).
- Histories recorded before 0.5.0 carry item types without the suffix (`text`, `tool_call`, …). `normalize_legacy_messages` / `normalizeLegacyMessages` MUST convert them before the transform of a provider client sees them: each such type becomes its `.done` type and a stray `partial_tool_call` is dropped; a message it converts comes back as a copy and a current one as it is, so the caller's data is never modified; the first conversion in a process warns once. It runs on the request messages of `streaming_response`, on the message of a stateful call, in `set_history`, and on the trace files the tracer loads ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#7-reading-traces) §7). These types are read until 0.6.0.
- Three shapes earlier releases recorded inside an item are read until 0.6.0 too: a thought signature as bytes, a reasoning item without its channel, and a 0.5.5 gateway reasoning block kept whole. A tool call id equal to the function name is not one of them: `google-genai` still records it for a call that arrives without an id, and both Google clients send such a call back without one.
- Nothing redundant is kept ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5).

## 8. The Base Class

- `streaming_response` / `streamingResponse` MUST build the public stream in the one method, top to bottom: it stamps `created_at` and converts legacy types, validates the messages, reads the client's events, handing each delta to `StreamItems` and merging each event's usage and finish reason, closes the last item, raises `IncompleteStreamError` or `EmptyResponseError` where the stream calls for one ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5), builds the `stop`, saves the trace ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved) §3) and yields the `stop`. Its abort handling sits in that method, with the races it covers stated beside it.
- A class or helper layer other than `StreamItems` MUST NOT stand between a client's events and the public stream.
- The `mmsp` client overrides `streaming_response` / `streamingResponse` to forward its server's public stream as it arrives, because the server's upstream client has built it already ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#7-the-mmsp-client) §7).

## 9. Conformance

- Review against the reference clients, as `.agents/skills/mmsp-dev/SKILL.md` describes.
- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`; `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`; `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`; `src_py/mmsp/wire.py` / `src_ts/src/wire.ts`; the transforms of every client under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`.
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`, which check that legacy item types are converted before a request and in `set_history`, that the caller's message is left as it was, and that a current message comes back as it is.
- `test_message_order.py` / `message-order.test.ts`, which send a turn of thinking, text and a tool call through the clients of every protocol and check the order on the wire.
- `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`, which check the exact item a replay sends.
- `test_mmsp_server.py` / `mmsp-server.test.ts`, which check that the stream through the server equals the upstream stream.
