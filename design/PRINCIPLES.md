# Design principles

[中文版](PRINCIPLES.zh.md)

These are the invariants MMSP keeps for every model, in both packages. When the code and a principle disagree, the principle wins: the code is fixed, or the principle is changed first through an RFC ([README](README.md)). Each principle is a normative statement, its essential detail, and where the code enforces it. The set was adopted by [MRFC-0001](rfcs/MRFC-0001-rfc-process.md).

## PRN-001 One protocol for every model

Every model is called through the same three shapes: `UniConfig` in, `UniMessage` in and out, `UniEvent` out. A content item is one of the kinds `types.py` / `types.ts` define, and a message holds only complete `.done` items. No message or event carries a provider's own type.

- A provider feature enters MMSP as a `UniConfig` key or an item field of the protocol, or as opaque `fidelity` on the item it belongs to (PRN-007), never as a key or field of one client's own.
- The message transform keeps the order of an assistant turn's items (thinking, then text, then a tool call) wherever the wire format can express it.
- A change to a shape (an item kind or field, a `UniConfig` key, a `UniEvent` field) changes the protocol and goes through an RFC.

Enforced by: `src_py/mmsp/types.py`, `src_ts/src/types.ts`; the abstract transforms of `LLMClient` in `base_client.py` / `baseClient.ts`; `src_py/tests/test_message_order.py`, `src_ts/tests/message-order.test.ts`; the shared e2e tests (PRN-008).

## PRN-002 One stream grammar, closed by the base class

A stream is a run of `delta` events, each carrying exactly one item, closed by exactly one `stop` event, which carries the usage and the finish reason and no items. Every item streams as contiguous `.delta` fragments followed by its one `.done` item; items never interleave, and the `.done` items in order are the assistant message. A stream ends with its `stop` event or with an exception, never both.

- A client yields deltas only, never a `.done` item; `StreamItems` decides where each item ends and closes it. The usage and finish reason of the client's `stop` events are merged into the one public `stop`.
- What a client yields against this grammar (a `.done` item, usage on a delta event, two different fidelity payloads on one item) raises `StreamProtocolError` in every mode: it is a bug in the client, never repaired.
- A wire event with nothing universal is the empty delta event, and an event a client does not recognize is skipped, so a gateway's own frames cannot end a generation; `MMSP_DEBUG` makes it raise instead.

Enforced by: `_PublicStream` in `src_py/mmsp/base_client.py` and `StreamItems` in `src_py/mmsp/stream_items.py`, mirrored in `baseClient.ts` and `streamItems.ts`; `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream; `test_stream_protocol.py`, `test_stream_items.py`, `test_unknown_events.py` and their mirrors.

## PRN-003 Routing is explicit

`AutoLLMClient` builds its client from the `client_type` it is given and one table of client types. Without a client type, the family prefix a model id begins with names the vendor's official client, and an id of no known family raises and asks for one. Routing has no other rule: model ids are matched by prefix, never by substring or version.

- A new generation of a vendor's models goes into the vendor's official client, which tells generations apart by an explicit version (`"gpt-6" in self._model`, never `"gpt" in model`) and keeps the older ones working until the owner retires one.
- A compatible client speaks one wire protocol for whatever endpoint serves it.
- Adding a row (a family, a client type) is a normal change; changing what the tables mean goes through an RFC.

Enforced by: the tables and `routed_client_type` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, which `auto_client.py` / `autoClient.ts` route through; `test_client.py::test_client_type_or_model_family_names_the_client`, `::test_a_model_of_no_known_family_asks_for_a_client_type`, `::test_model_catalog_routes_to_its_client_group` and their Jest mirrors.

## PRN-004 A credential goes only where it was given for

A key passed to a client is used, whatever the base URL. Without one, a client reads its `<P>_API_KEY` only when it is passed no base URL or its own default endpoint. Any other base URL passed without a key raises `ApiKeyRequiredError` when the client is built, before any request; the `mmsp` client alone calls such a URL keyless, as an open server.

- `CLIENT_CREDENTIALS` declares each client type's key variable, base URL variable and default endpoint. A client resolves its key and endpoint through it and reads neither from the environment itself.

Enforced by: `CLIENT_CREDENTIALS` and `environment_credential` in `src_py/mmsp/credentials.py` / `src_ts/src/credentials.ts`, applied by `resolve_credentials` / `resolveCredentials` in `utils.py` / `utils.ts`, which every client calls when it is built; `src_py/tests/test_env_credentials.py`, `src_ts/tests/env-credentials.test.ts`, which build every client type under a controlled environment and read the credential its SDK holds; `test_credentials.py` / `credentials.test.ts`.

## PRN-005 Every thinking level is usable on every client

No client rejects a `ThinkingLevel`: none raises `UnsupportedParameterError` for `thinking_level`, on any model. Where a model has no exact equivalent of a level, its official client sends a setting the model accepts instead, without a warning: Kimi K3, which cannot turn thinking off, runs `none` at `low`, and Gemini runs `xhigh` and `max` at `high`.

- Through a compatible client the endpoint decides what a level runs as, and it may refuse the value the client sends for a model that cannot take it. The `mmsp` client forwards the level to its server.

Enforced by: the `_convert_thinking_level*` methods of the clients; `src_py/tests/test_thinking_level_mapping.py`, `src_ts/tests/thinking-level-mapping.test.ts`; the docstring of `UnsupportedParameterError` in `errors.py` / `errors.ts`.

## PRN-006 A rejected value raises a typed error

A client that rejects a `temperature`, `tool_choice`, `prompt_caching` or `fast_mode` value its model cannot take raises `UnsupportedParameterError`, naming the client and the parameter, before the request goes out. An operation a client cannot perform at all raises `UnsupportedOperationError`. `thinking_level` is never rejected (PRN-005).

- The `mmsp` client relays its server's rejection as `UpstreamError`, whose `error_type` is `UnsupportedParameterError`.

Enforced by: `src_py/mmsp/errors.py`, `src_ts/src/errors.ts`; `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig` of the clients; `test_list_models.py` / `list-models.test.ts`; `test_mmsp_server.py` / `mmsp-server.test.ts`.

## PRN-007 Replay is minimal; fidelity is the exception channel

A client rebuilds a replayed assistant turn from its items' universal fields and their `fidelity`, plus the stand-ins a provider requires for what the turn lacks (a dummy thought signature, an empty reasoning field). `fidelity` holds only wire data that no universal field carries and a replay sends back, such as a thinking signature, encrypted reasoning, a phase, or the reasoning field name a strict upstream demands; never an id the provider regenerates or ignores, and never a copy of a universal field. Consumers treat it as opaque and pass it back unchanged.

- In a stream, at most one delta of an item carries its fidelity, and the item's `.done` repeats it.
- `tool_call_id` holds the provider's call id where the wire carries one, and a replay sends it back; where the wire carries both an item id and a call id, it holds the call id, which correlates a result to its call.

Enforced by: `Fidelity` in `types.py` / `types.ts`; `StreamItems`, which keeps one fidelity per item and strips `item_id`; the message transforms of the clients; `src_py/tests/test_reasoning_fidelity.py`, `test_reasoning_replay_without_thinking.py`, `test_tool_call_arguments.py` and their Jest mirrors.

## PRN-008 Two packages, one contract

`mmsp` and `@prismshadow/mmsp` have the same clients, mappings, error classes and stream, under the same names up to each language's casing and idiom; a behavior one package lacks or does differently is a bug. A change lands in both in one PR, with mirrored tests.

- The shared e2e tests, `src_py/tests/test_client.py` and `src_ts/tests/client.test.ts`, are one contract every client satisfies. A model enters them as its entry in `.github/ci/models.json`, with its capability flags and key variable. No shared test branches on a model name, and no model gets a test file of its own.
- A failing shared test means the client is wrong until proven otherwise. Any broader test edit needs the owner's explicit approval, per change.
- A generation that leaves the catalog stays supported and routed (PRN-003).

Enforced by: the paired test files under `src_py/tests/` and `src_ts/tests/`; `.github/ci/models.json`, the one catalog both suites load; `.github/ci/plan.py`, `.github/ci/README.md` and `.github/workflows/ci.yml`; `test_client.py::test_model_catalog_routes_to_its_client_group` and its Jest mirror.
