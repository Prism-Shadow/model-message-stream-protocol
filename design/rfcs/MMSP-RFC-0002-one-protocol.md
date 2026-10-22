# MMSP-RFC-0002 One protocol for every model

- Feature Name: `one_protocol`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0002-one-protocol.zh.md)

## Summary
[summary]: #summary

Every model is called through the same three shapes: `UniConfig` in, `UniMessage` in and out, `UniEvent` out. A content item is one of the kinds `types.py` / `types.ts` define, and a message holds only complete `.done` items. No message or event carries a provider's own type.

## Motivation
[motivation]: #motivation

MMSP exists so that a caller writes to one message format and one stream grammar and changes models by changing a string. The three shapes are that promise; a provider feature that enters as one client's own key or field is a provider the caller has to know about again. The order rule comes from a failure the clients had: a Responses-style transform that appended the collected text after the tool call it preceded made DeepSeek answer "No tool output found for tool call".

## Rule
[rule]: #rule

- A provider feature enters MMSP as a `UniConfig` key or an item field of the protocol, or as opaque `fidelity` on the item it belongs to ([MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.md)), never as a key or field of one client's own.
- The message transform keeps the order of an assistant turn's items (thinking, then text, then a tool call) wherever the wire format can express it.
- A change to a shape (an item kind or field, a `UniConfig` key, a `UniEvent` field) changes the protocol and goes through an RFC.

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/types.py`, `src_ts/src/types.ts`; the abstract transforms of `LLMClient` in `base_client.py` / `baseClient.ts`; `src_py/tests/test_message_order.py`, `src_ts/tests/message-order.test.ts`; the shared e2e tests ([MMSP-RFC-0009](MMSP-RFC-0009-two-packages-one-contract.md)).
