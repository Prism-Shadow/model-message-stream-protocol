# MMSP-RFC-0009 Every error is typed

- Feature Name: `typed_errors`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0009-typed-errors.zh.md)

## Summary
[summary]: #summary

Every error MMSP raises is an `MMSPError` subclass from `errors.py` / `errors.ts`, named for what went wrong and carrying its fields. Each is still the built-in it replaced: a `ValueError` in Python and an `Error` in TypeScript, with `ProviderStreamError` also a `RuntimeError`. Apart from the abort error ([MMSP-RFC-0012](MMSP-RFC-0012-interruptible-requests.md)), no code outside `integration/` raises or throws a bare built-in error. The MMSP server relays every MMSP error with its fields, so the `mmsp` client raises `UpstreamError` whose `error_type` is the class and whose `error` holds the fields.

## Motivation
[motivation]: #motivation

A caller that handles a refusal needs one class to catch, the same in both packages and through the server; a bare `ValueError` or `Error` cannot be told from a bug. The audit that wrote the first rule found `tts_config` rejected with a bare error in both Google clients ([#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)). The audit of 2026-10-23 found about sixty more places, from a tool result without its `tool_call_id` to an image on a text-only model. The owner then widened the rule from a rejected value to every error ([#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288), [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)). Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0007.

## Rule
[rule]: #rule

- **Before the request:**
  - `UnsupportedParameterError` for a `UniConfig` value the model cannot take, naming the client and the parameter. `thinking_level` is never one ([MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.md)).
  - `UnsupportedContentError` for a well-formed item the model cannot take.
  - `InvalidMessageError` for a message that cannot be sent as it is, with `item_type` and `message_index` where they apply. Examples: an unknown item, a tool result without `tool_call_id`, an image that is not valid base64 or cannot be fetched, a TTS script without speaker labels, a message with nothing to send.
  - `UnsupportedOperationError` for an operation a client cannot perform at all.
  - `ConcurrentCallError` ([MMSP-RFC-0008](MMSP-RFC-0008-immutable-history.md)).
  - `RoutingError` ([MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.md)).
  - `ApiKeyRequiredError` from the constructor ([MMSP-RFC-0007](MMSP-RFC-0007-credential-scope.md)).
- **Inside a stream**, in place of the item or the `stop`:
  - `ToolCallArgumentParseError`;
  - `EmptyResponseError`;
  - `IncompleteStreamError` ([MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md));
  - `StreamProtocolError`, for a client that broke the grammar ([MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.md));
  - `ProviderStreamError`, for an error a provider reports inside an open stream;
  - `UnknownEventError`, for an unrecognized event under `MMSP_DEBUG`.
- **A new class** joins `to_wire_error` / `toWireError` and the exports of both packages in the same change. The vendor SDKs' own exceptions propagate as they are, and the server relays them by their class name.

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/errors.py`, `src_ts/src/errors.ts`.
- `src_py/mmsp/wire.py` / `src_ts/src/wire.ts`.
- `src_py/tests/test_mmsp_server.py` / `src_ts/tests/mmsp-server.test.ts`. They relay every `MMSPError` subclass through the server, check that the cases cover every class `errors` defines, and check that every class is exported and caught as the built-in it replaces.
- `test_stream_protocol.py`, `test_message_order.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_env_credentials.py`, `test_image_detail.py`, `test_client.py`, `test_list_models.py` and their Jest mirrors, which assert the class at each kind of site.
- Review with two greps, which find nothing outside `integration/`: `grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp` and `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`.
