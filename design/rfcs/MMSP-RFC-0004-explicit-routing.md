# MMSP-RFC-0004 Routing is explicit

- Feature Name: `explicit_routing`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0004-explicit-routing.zh.md)

## Summary
[summary]: #summary

`AutoLLMClient` builds its client from the `client_type` it is given and one table of client types. Without a client type, the family prefix a model id begins with names the vendor's official client, and an id of no known family raises and asks for one. Routing has no other rule: model ids are matched by prefix, never by substring or version.

## Motivation
[motivation]: #motivation

Before [#228](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/228) some model ids routed by a substring, so a gateway's id such as `moonshotai/kimi-k3` reached a client by an accident of its spelling, and a new generation needed a new match rather than a row. With one table of client types and one table of families, a reader can say from the tables which client a model id reaches, and an id of no known family asks for a `client_type` instead of guessing.

## Rule
[rule]: #rule

- A new generation of a vendor's models goes into the vendor's official client, which tells generations apart by an explicit version (`"gpt-6" in self._model`, never `"gpt" in model`) and keeps the older ones working until the owner retires one.
- A compatible client speaks one wire protocol for whatever endpoint serves it.
- Adding a row (a family, a client type) is a normal change; changing what the tables mean goes through an RFC.

## Enforced by
[enforced-by]: #enforced-by

The tables and `routed_client_type` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, which `auto_client.py` / `autoClient.ts` route through; `test_client.py::test_client_type_or_model_family_names_the_client`, `::test_a_model_of_no_known_family_asks_for_a_client_type`, `::test_model_catalog_routes_to_its_client_group` and their Jest mirrors.
