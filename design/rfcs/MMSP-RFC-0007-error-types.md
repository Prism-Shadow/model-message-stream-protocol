# MMSP-RFC-0007 Error Types

- Feature Name: `error_types`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[中文版](MMSP-RFC-0007-error-types.zh.md)

## Abstract

Outside `integration/`, every error MMSP raises, apart from the abort error, is an `MMSPError` subclass from `errors.py` / `errors.ts`, named for what went wrong and carrying its fields. This document specifies the classes, where each is raised, the built-ins they are, how the MMSP server relays them, and how a class is added.

## 1. Introduction

A caller that handles a refusal needs one class to catch, the same in both packages and through the server; a bare `ValueError` or `Error` cannot be told from a bug. The audit that wrote the first rule found `tts_config` rejected with a bare error in both Google clients ([#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)). The audit of 2026-10-23 found about sixty more places, from a tool result without its `tool_call_id` to an image on a text-only model, and the owner widened the rule from a rejected value to every error ([#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288), [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)). Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0007 and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0009.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Bare built-in error*: an instance of a built-in class itself, such as `ValueError`, `RuntimeError` or `Error`, rather than of an `MMSPError` subclass.
- *Abort error*: `asyncio.CancelledError` carrying the signal's reason in Python, the signal's `reason` in TypeScript ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#2-conventions-and-terminology) §2).

## 3. The Error Classes

Code outside `integration/` MUST NOT raise or throw a bare built-in error of its own: apart from the abort error, what it raises is one of the classes below. An exception it only passes on, such as a vendor SDK's or a cancellation of the caller's task, propagates as it is.

### 3.1 Before the request

- `UnsupportedParameterError`: a `UniConfig` value the model cannot take, naming the client and the parameter. `thinking_level` MUST NOT be one ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#63-thinking-levels) §6.3).
- `UnsupportedContentError`: a well-formed item the model cannot take.
- `InvalidMessageError`: a message that cannot be sent as it is, with `item_type` and `message_index` where they apply, such as an unknown item, a tool result without `tool_call_id`, an image that is not valid base64, a TTS script without speaker labels, or a message with nothing to send.
- `UnsupportedOperationError`: an operation a client cannot perform at all.
- `ConcurrentCallError` ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#62-one-stateful-call-at-a-time) §6.2); `RoutingError` ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#4-routing-by-model-id) §4); `ApiKeyRequiredError`, from the constructor ([MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md#4-resolution) §4).

### 3.2 Inside a stream

In place of the item or the `stop` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5):
- `ToolCallArgumentParseError`: streamed tool call arguments that do not parse as a JSON object;
- `EmptyResponseError`: a response with no item but thinking, or with no item at all;
- `IncompleteStreamError`: a stream that ended without its usage or its finish reason;
- `StreamProtocolError`: a client that broke the stream grammar;
- `ProviderStreamError`: an error a provider reports inside an open stream that its SDK does not raise, the Interactions API's `error` event;
- `UnknownEventError`: an unrecognized event under `MMSP_DEBUG` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1).

### 3.3 Built-in bases

Every class MUST be a `ValueError` in Python and an `Error` in TypeScript, and `ProviderStreamError` also a `RuntimeError` in Python.

## 4. Relay Through the Server

The MMSP server MUST relay every MMSP error with its fields (`to_wire_error` / `toWireError`), so the `mmsp` client raises `UpstreamError` whose `error_type` is the class and whose `error` holds the fields. A vendor SDK's own exception propagates as it is, and the server relays it by its class name, with the upstream's HTTP status where the SDK keeps one.

## 5. Adding a Class

A new class MUST join `to_wire_error` / `toWireError` and the exports of both packages in the same change.

## 6. Conformance

- `src_py/mmsp/errors.py`, `src_ts/src/errors.ts`; `src_py/mmsp/wire.py` / `src_ts/src/wire.ts`.
- `src_py/tests/test_mmsp_server.py` / `src_ts/tests/mmsp-server.test.ts`, which relay every `MMSPError` subclass through the server, check that the cases cover every class `errors` defines, and check that every class is exported and is the built-in of §3.3.
- `test_stream_protocol.py`, `test_message_order.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_env_credentials.py`, `test_image_detail.py`, `test_client.py`, `test_list_models.py` and their Jest mirrors, which assert the class at each kind of site.
- Review with two greps, which find nothing outside `integration/`: `grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp` and `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`.
