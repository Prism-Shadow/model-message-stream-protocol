# MMSP-RFC-0006 Client routing is explicit

- Feature Name: `explicit_routing`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0006-explicit-routing.zh.md)

## Summary
[summary]: #summary

`AutoLLMClient` builds its client from the `client_type` it is given and one table of client types. Without a client type, the family prefix a model id begins with names the vendor's official client, and an id of no known family raises `RoutingError` and asks for one. Routing has no other rule: model ids are matched by prefix, never by substring or version.

## Motivation
[motivation]: #motivation

Before [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) some model ids routed by a substring, so a gateway's id such as `moonshotai/kimi-k3` reached a client by an accident of its spelling, and a new generation needed a new match rather than a row. With one table of client types and one table of families, a reader can tell from the tables which client a model id reaches, and an id of no known family asks for a `client_type` instead of guessing. How a client tells generations apart inside itself is [MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.md). Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0004.

## Rule
[rule]: #rule

- An official client speaks its vendor's own API and serves the vendor's models: a new generation goes into it, and the older ones keep working until the owner retires one. A compatible client speaks one wire protocol for whatever endpoint serves it.
- `CLIENT_TYPE` in the environment names the client when the code does not, and the earlier names of client types are accepted. `openai-official` serves a `text-embedding-` model through `openai-embedding`.
- A client deduced from a model id lists from `list_models` only the ids whose family names the same client. A client named by its type lists everything its endpoint serves.
- Adding a row (a family, a client type) is a normal change; changing what the tables mean goes through an RFC.

## Enforced by
[enforced-by]: #enforced-by

- The tables and routing functions of `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, which `src_py/mmsp/auto_client.py` / `src_ts/src/autoClient.ts` route through.
- The routing cases of `src_py/tests/test_client.py` / `src_ts/tests/client.test.ts`:
  - the client type or the family names the client;
  - an id of no known family asks for one;
  - an unknown client type is refused;
  - the environment names the client;
  - every catalog entry reaches its client group.
- `test_list_models.py` / `list-models.test.ts`.
