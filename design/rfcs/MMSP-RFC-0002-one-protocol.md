# MMSP-RFC-0002 One protocol for every model

- Feature Name: `one_protocol`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0002-one-protocol.zh.md)

## Summary
[summary]: #summary

Every model is called through the same three shapes: `UniConfig` in, `UniMessage` in and out, `UniEvent` out. A content item is one of the kinds `types.py` / `types.ts` define, a message holds only complete `.done` items, and no message or event carries a provider's own type. The protocol is one in both packages: `mmsp` and `@prismshadow/mmsp` have the same clients, mappings, error classes and stream under the same names, up to each language's casing and idiom, and a behavior one package lacks or does differently is a bug.

## Motivation
[motivation]: #motivation

MMSP exists so that a caller writes to one message format and one stream grammar and changes models by changing a string. A provider feature that enters as one client's own key is a provider the caller has to know about again, and a package that behaves differently is a second protocol. The order rule comes from a failure the clients had: a Responses-style transform that appended the collected text after the tool call it preceded made DeepSeek answer "No tool output found for tool call". The audit that wrote the parity rule found the packages apart on the wire in two places: a key the OpenAI Python SDK rejects as a keyword ([#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)) and a key openai-node does not unwrap from a literal `extra_body` ([#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)). The shared e2e tests and the one model catalog ([#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)) check the parity rather than promise it. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0002 and MMSP-RFC-0009.

## Rule
[rule]: #rule

- A provider feature enters MMSP as a `UniConfig` key or an item field of the protocol, or as opaque `fidelity` on the item it belongs to ([MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md)), never as a key or field of one client's own. A change to a shape (an item kind or field, a `UniConfig` key, a `UniEvent` field) changes the protocol and goes through an RFC.
- The message transform keeps the order of an assistant turn's items (thinking, then text, then a tool call) wherever the wire format can express it.
- Both packages put the same request body on the wire. A key outside an SDK's typed parameters travels through that SDK's own channel: `extra_body` in the OpenAI and Anthropic Python SDKs, and a top-level body key in their TypeScript SDKs. A change lands in both packages in one PR, with mirrored tests.
- The shared e2e tests, `src_py/tests/test_client.py` and `src_ts/tests/client.test.ts`, are one contract every client satisfies:
  - a model enters them as its entry in `.github/ci/models.json`, with its capability flags and key variable;
  - no shared test branches on a model name, and no model gets a test file of its own;
  - a failing shared test means the client is wrong until proven otherwise;
  - any broader test edit needs the owner's explicit approval, per change.
- A generation that leaves the catalog stays supported and routed ([MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.md)).

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/types.py`, `src_ts/src/types.ts`.
- The abstract transforms of `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`.
- The paired test files under `src_py/tests/` and `src_ts/tests/`, among them `test_message_order.py` / `message-order.test.ts`, and `test_request_body.py` / `request-body.test.ts`, which read the body the Anthropic clients send on every SDK line.
- `.github/ci/models.json`, the one catalog both suites load, with `.github/ci/plan.py`, `.github/ci/README.md` and `.github/workflows/ci.yml`.
- The routing case of `test_client.py` / `client.test.ts` that checks every catalog entry reaches its client group.
