# MMSP-RFC-0002 Message Protocol

- Feature Name: `message_protocol`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[中文版](MMSP-RFC-0002-message-protocol.zh.md)

## Abstract

MMSP is one message protocol for every model. A model is called with three shapes, `UniConfig` in, `UniMessage` in and out and `UniEvent` out, whose content items are a closed set of kinds defined once in `types.py` / `types.ts`. This document specifies those shapes, what a message may carry (its items' universal fields and a lean per-item `fidelity`), how a provider feature enters the protocol, and the parity of the Python and TypeScript packages, which are one protocol.

## 1. Introduction

MMSP exists so that a caller writes to one message format and one stream grammar and changes models by changing a string. A provider feature that enters as one client's own key is a provider the caller has to know about again, and a package that behaves differently is a second protocol. The audit that wrote the parity rule found the packages apart on the wire in two places: a key the OpenAI Python SDK rejects as a keyword ([#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)) and a key openai-node does not unwrap from a literal `extra_body` ([#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)). The shared e2e tests and the one model catalog ([#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)) check the parity rather than promise it.

A replayed turn has to be accepted by the API with the model's behavior intact; it does not have to reproduce the wire item field for field, and every field mirrored into `fidelity` is one more provider shape that consumers, traces and histories carry. [#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) added `fidelity` for the exact reasoning field a strict upstream demands back; [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) replaced a gateway's reasoning block, which had been kept whole, with the three keys that rebuild it. The owner's words: 转换只保留必要的部分，冗余字段不需要保留.

Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0002, MMSP-RFC-0009, part of MMSP-RFC-0008 and the second half of MMSP-RFC-0012, and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0002 and MMSP-RFC-0004. The order rule of the earlier MMSP-RFC-0002 is now [MMSP-RFC-0009 §6](MMSP-RFC-0009-protocol-conversion.md#6-order).

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Item*: one entry of a message's or an event's `content_items`. A *complete item* has a `.done` type; a *fragment* has a `.delta` type.
- *Universal field*: a field other than `fidelity` that `types.py` / `types.ts` define on an item, such as `text`, `thinking`, `arguments` or `tool_call_id`.
- *Fidelity*: the `fidelity` object of an item, the wire data no universal field carries (§5).
- *Public stream*: as [MMSP-RFC-0003 §2](MMSP-RFC-0003-message-requests.md#2-conventions-and-terminology) defines it. *Replay*: as [MMSP-RFC-0004 §2](MMSP-RFC-0004-message-fidelity.md#2-conventions-and-terminology) defines it.

## 3. The Three Shapes

### 3.1 `UniConfig`

A request's configuration is a `UniConfig`: the keys `types.py` / `types.ts` define, every one optional. A key MUST mean the same thing on every client; how a client sends, ignores or refuses a key is [MMSP-RFC-0003 §6](MMSP-RFC-0003-message-requests.md#6-request-parameters).

### 3.2 `UniMessage`

A message has a `role` (`user` or `assistant`), `content_items`, and optionally `usage_metadata`, `finish_reason` and `created_at` (milliseconds since the epoch). A message MUST hold complete items only: the base class builds an assistant message from the complete items of its stream, and any other item a caller sends is refused ([MMSP-RFC-0007 §3.1](MMSP-RFC-0007-error-types.md#31-before-the-request)), apart from the item types of histories recorded before 0.5.0, which are converted ([MMSP-RFC-0009 §7](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input)). The order of the items is part of the message ([MMSP-RFC-0009 §6](MMSP-RFC-0009-protocol-conversion.md#6-order)). An assistant message built from a stream carries the stream's `usage_metadata` and `finish_reason` ([MMSP-RFC-0003 §4.4](MMSP-RFC-0003-message-requests.md#44-the-assistant-message)); a message a caller builds by hand MAY carry neither.

### 3.3 `UniEvent`

An event has `role`, `event_type` (`delta` or `stop`), `content_items`, `usage_metadata`, `finish_reason` and `created_at`. In the public stream a `delta` event MUST carry exactly one item, a fragment or a complete item, and neither usage nor finish reason; the one `stop` event MUST carry no items and both ([MMSP-RFC-0003 §4](MMSP-RFC-0003-message-requests.md#4-the-stream-grammar)). What a client yields to the base class is [MMSP-RFC-0003 §4.1](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields).

### 3.4 Content Items

The complete kinds are `text.done`, `image_url.done`, `inline_data.done`, `thinking.done`, `inline_thinking.done`, `tool_call.done`, `tool_result.done` and `embedding.done`. The fragment kinds are the `.delta` forms of all of them but `image_url` and `tool_result`, which a caller writes and no stream carries. A message or an event MUST NOT carry any other kind of item, a provider's own types included.

## 4. Provider Features

- A provider feature MUST enter MMSP as a `UniConfig` key or an item field of the protocol, or as opaque `fidelity` on the item it belongs to (§5), never as a key or field of one client's own.
- A change to a shape (an item kind or field, a key of `UniConfig`, a field of `UniMessage` or `UniEvent`) changes the protocol and MUST go through an RFC.

## 5. What a Message Carries

- A message holds its items' universal fields and, per item, only the `fidelity` a replay needs: wire data no universal field carries, such as a thinking signature, encrypted reasoning, a phase, or the reasoning field name a strict upstream demands. What each wire needs back, and what a field needs to join it, is [MMSP-RFC-0004 §4](MMSP-RFC-0004-message-fidelity.md#4-what-each-wire-needs-back).
- `fidelity` MUST NOT hold a copy of a universal field, an id the provider regenerates or ignores, or a field no replay uses.
- `fidelity` MUST give a kind of data the same name in every client: `signature`, `encrypted_content`, `format`, `channel`, `phase`, `reasoning_field`, `reasoning_id`. A client MUST NOT keep a wire item, or a list of them, whole under the wire's own name. `reasoning_id` is kept only for a gateway's encrypted reasoning block, whose id the gateway needs back.
- `fidelity.item_id` is the id a client identifies its items with while streaming. `StreamItems` MUST strip it before an item goes out, so it reaches no consumer, trace or history.
- A consumer SHOULD treat `fidelity` as opaque and pass it back unchanged.
- The shapes earlier releases recorded inside an item are read until 0.6.0 ([MMSP-RFC-0009 §7](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input)).

## 6. One Protocol in Two Packages

- `mmsp` and `@prismshadow/mmsp` MUST have the same clients, mappings, error classes and stream under the same names, up to each language's casing and idiom. A behavior one package lacks or does differently is a bug.
- Both packages MUST put the same request body on the wire. A key outside an SDK's typed parameters travels through that SDK's own channel: `extra_body` in the OpenAI and Anthropic Python SDKs, and a top-level body key in their TypeScript SDKs.
- A change MUST land in both packages in one PR, with mirrored tests.

## 7. Conformance

- `src_py/mmsp/types.py`, `src_ts/src/types.ts`; the abstract transforms of `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, and `concat_uni_events_to_uni_message` / `concatUniEventsToUniMessage`, which keeps the complete items of a stream.
- `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`, which keep one fidelity per item and strip `item_id`; `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which reject an item that still carries it.
- The paired tests under `src_py/tests/` and `src_ts/tests/`, among them `test_request_body.py` / `request-body.test.ts`, which read the body the Anthropic clients send on every SDK line, and `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`, which assert the exact reasoning item a replay sends, with no id and no partial ciphertext.
- The shared e2e tests, `src_py/tests/test_client.py` and `src_ts/tests/client.test.ts`, are one contract every client satisfies:
  - a model enters them as its entry in `.github/ci/models.json`, with its capability flags and key variable;
  - no shared test branches on a model name, and no model gets a test file of its own;
  - a failing shared test means the client is wrong until proven otherwise;
  - any broader test edit needs the owner's explicit approval, per change.
- `.github/ci/models.json`, the one catalog both suites load, with `.github/ci/plan.py`, `.github/ci/README.md` and `.github/workflows/ci.yml`. The catalog keeps the newest generation of a family; a generation that leaves it stays supported and routed ([MMSP-RFC-0005 §3](MMSP-RFC-0005-client-routing.md#3-client-types)).
- The routing case of `test_client.py` / `client.test.ts` that checks every catalog entry reaches its client group.
