# MMSP-RFC-0007 Error Types

- Feature Name: `error_types`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)
- Kind: spec

[中文版](MMSP-RFC-0007-error-types.zh.md)

## Abstract

Outside `integration/`, every error MMSP raises (except the **abort error**) is a specific **`MMSPError`** subclass from `errors.py` / `errors.ts` carrying structured fields. This specification defines the **error classes**, their **built-in bases**, **server relay**, and **registration rules**.

## 1. Introduction

- **Problem**: Callers need a single class to catch across both packages and the server; bare `ValueError` or `Error` instances cannot be distinguished from bugs.
- **Audit findings**:
  - [#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269): Both Google clients rejected `tts_config` with a bare error.
  - [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288), [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290) (2026-10-23 audit): Found ~60 more sites (e.g., tool result without `tool_call_id`, image on a text-only model); expanded the rule to cover every error.
  - Originally stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) (MMSP-RFC-0007) and [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) (MMSP-RFC-0009).
- **2026-11-04 update ([#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316))**: OpenAI-format image generation gateways may return an image URL instead of bytes; an HTTP error when downloading that URL inside an open stream raises `ProviderStreamError` with the HTTP status as its `code` (§3.2).

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Bare built-in error**: An instance of `ValueError`, `RuntimeError`, or `Error` itself rather than an `MMSPError` subclass.
- **Abort error**: `asyncio.CancelledError` carrying the signal's reason in Python; the signal's `reason` in TypeScript ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#2-conventions-and-terminology) §2).

## 3. The Error Classes

- **No bare errors**: Code outside `integration/` MUST NOT raise or throw a bare built-in error of its own; apart from the abort error, it raises one of the classes below.
- **Pass-through exceptions**: Vendor SDK exceptions or caller task cancellations propagate as-is.

### 3.1 Before the request

| Error Class | When Raised & Fields |
| :--- | :--- |
| `UnsupportedParameterError` | A `UniConfig` value the model cannot take (names client and parameter). `thinking_level` MUST NOT raise this ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#63-thinking-levels) §6.3). |
| `UnsupportedContentError` | A well-formed content item the model cannot take. |
| `InvalidMessageError` | A message that cannot be sent as-is (carries `item_type` and `message_index` where applicable): unknown item, tool result without `tool_call_id`, invalid base64 image, TTS script without speaker labels, or empty message. |
| `UnsupportedOperationError` | An operation a client cannot perform at all. |
| `ConcurrentCallError` | Overlapping stateful calls ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#62-one-stateful-call-at-a-time) §6.2). |
| `RoutingError` | Unknown or unroutable model ID ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#4-routing-by-model-id) §4). |
| `ApiKeyRequiredError` | Missing credentials in constructor ([MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md#4-resolution) §4). |

### 3.2 Inside a stream

Raised in place of the item or `stop` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5):

| Error Class | When Raised & Fields |
| :--- | :--- |
| `ToolCallArgumentParseError` | Streamed tool call arguments do not parse as a JSON object. |
| `EmptyResponseError` | Response has no item at all, or only thinking items. |
| `IncompleteStreamError` | Stream ended without usage or finish reason. |
| `StreamProtocolError` | Client broke the stream grammar. |
| `ProviderStreamError` | Provider error inside an open stream not raised by its SDK: Interactions API `error` event, or HTTP error status when downloading a generated image's `url` (status stored as `code`). |
| `UnknownEventError` | Unrecognized event when `MMSP_DEBUG` is set ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1). |

### 3.3 Built-in bases

- **All classes**: MUST inherit from `ValueError` in Python and `Error` in TypeScript.
- **`ProviderStreamError`**: MUST also inherit from `RuntimeError` in Python.

## 4. Relay Through the Server

- **`MMSPError` subclasses**: The MMSP server MUST relay every MMSP error with its fields (`to_wire_error` / `toWireError`); the `mmsp` client raises `UpstreamError` with `error_type` set to the class name and `error` holding the fields.
- **Vendor SDK exceptions**: Propagate as-is; the server relays them by class name, plus the upstream HTTP status when kept by the SDK.

## 5. Adding a Class

- **Same-change registration**: A new class MUST be added to `to_wire_error` / `toWireError` and exported by both packages in the same change.

## 6. Conformance

- **Definitions & wire relay**: `src_py/mmsp/errors.py`, `src_ts/src/errors.ts`, `src_py/mmsp/wire.py`, `src_ts/src/wire.ts`.
- **Server relay & base checks**: `src_py/tests/test_mmsp_server.py` and `src_ts/tests/mmsp-server.test.ts` relay every `MMSPError` subclass, verify full coverage of `errors`, and check exports and §3.3 bases.
- **Site-level assertions**: `test_stream_protocol.py`, `test_message_order.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_env_credentials.py`, `test_image_detail.py`, `test_client.py`, `test_list_models.py`, and their Jest mirrors.
- **Zero bare-error verification** (must match nothing outside `integration/`):
  - `grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp`
  - `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`
