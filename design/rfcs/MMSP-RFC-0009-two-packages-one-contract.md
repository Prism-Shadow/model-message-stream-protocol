# MMSP-RFC-0009 Two packages, one contract

- Feature Name: `two_packages_one_contract`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0009-two-packages-one-contract.zh.md)

## Summary
[summary]: #summary

`mmsp` and `@prismshadow/mmsp` have the same clients, mappings, error classes and stream, under the same names up to each language's casing and idiom; a behavior one package lacks or does differently is a bug. A change lands in both in one PR, with mirrored tests.

## Motivation
[motivation]: #motivation

The two packages are one protocol in two languages, and a caller moving between them, or running the MMSP server in one and a client in the other, expects the same behavior under the same names. The shared e2e tests and the one model catalog ([#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)) check that rather than promise it. The audit that wrote this rule found the packages apart on the wire in two places, a key the OpenAI Python SDK rejects as a keyword ([#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)) and a key openai-node does not unwrap from a literal `extra_body` ([#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)); the request-body bullet below names the channel each SDK has for such a key.

## Rule
[rule]: #rule

- Both packages put the same request body on the wire. A key outside an SDK's typed parameters travels through that SDK's own channel: `extra_body` in the OpenAI Python SDK, a top-level body key in openai-node.
- The shared e2e tests, `src_py/tests/test_client.py` and `src_ts/tests/client.test.ts`, are one contract every client satisfies. A model enters them as its entry in `.github/ci/models.json`, with its capability flags and key variable. No shared test branches on a model name, and no model gets a test file of its own.
- A failing shared test means the client is wrong until proven otherwise. Any broader test edit needs the owner's explicit approval, per change.
- A generation that leaves the catalog stays supported and routed ([MMSP-RFC-0004](MMSP-RFC-0004-explicit-routing.md)).

## Enforced by
[enforced-by]: #enforced-by

The paired test files under `src_py/tests/` and `src_ts/tests/`; `.github/ci/models.json`, the one catalog both suites load; `.github/ci/plan.py`, `.github/ci/README.md` and `.github/workflows/ci.yml`; `test_client.py::test_model_catalog_routes_to_its_client_group` and its Jest mirror.
