# MMSP server and the `mmsp` client

- **Date:** 2026-10-02
- **Type:** feature
- **Scope:** `integration`, `mmsp`, `wire`, `errors`, `docs`
- **PR:** [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247)

[中文版](2026-10-02-mmsp-server.zh.md)

## What changed

- **MMSP server** (`mmsp.integration.server`, `@prismshadow/mmsp/integration/server`): serves the models of a table over HTTP as MMSP streams. A row is `model_id`, `base_url`, `api_key`, `client_type` (the upstream, as `AutoLLMClient` takes them) and `server_model_id` (the id clients name); every column is required. `api_keys` lists the bearer keys clients may send; several are allowed; an empty list is an open server, said at start. Both come from one JSON file, `--config PATH` or `MMSP_SERVER_CONFIG`, read by `load_server_config` / `loadServerConfig`, where a `base_url`, `api_key`, `client_type` or `api_keys` cell starting with `$` is read from the environment and an unset variable stops the start. `create_server_app(models, api_keys)` / `createServerApp({ models, apiKeys })` take the rows and return the Flask / Express app; `start_server` / `startServer` (which returns the `http.Server`) start it; `--host`, `--port` default to `127.0.0.1:25752`, so a client's base URL is `http://127.0.0.1:25752/v1`. Every row's upstream client is built once at start; an empty table, a missing column, a duplicate `server_model_id` or a row its client refuses stops the start with the row named.
- `GET /v1/models` lists the table in OpenAI's shape: `{"object": "list", "data": [{"id": <server_model_id>, "object": "model", "created": <unix s>, "owned_by": "mmsp"}, ...]}`.
- `POST /v1/stream` takes `{"model", "messages", "config"}` and answers with server-sent events: one `data: <UniEvent JSON>` per event of the public stream, then `data: [DONE]`, with a `: keep-alive` comment every 15 s while the model is silent. `config` is forwarded whole, so a `trace_id` is saved on the server too. A disconnect aborts the upstream request. Body limit 50 MB.
- Errors are `{"error": {"type", "message", ...}}`: 401 `AuthenticationError` without one of the server's keys, 400 `InvalidRequestError` for a malformed body, 404 `NotFoundError` for a model not in the table and for any other route, 413 for a body over the limit; once a stream has begun, one error event, then `data: [DONE]`.
- Bytes travel as base64; only the `data` of `inline_data.*` and `inline_thinking.*` items is decoded back.
- **`mmsp` client** (`mmsp/`, `MmspClient`), compatible client type `mmsp`: yields the public stream the server's client yielded. Reads `MMSP_API_KEY` / `MMSP_BASE_URL` under the credential rule, default `http://127.0.0.1:25752/v1`; requests `{base_url}/stream` and `{base_url}/models`. `list_models` returns the table's ids.
- The five MMSP errors cross the server with their fields and are raised again as themselves; any other error is the new `UpstreamError` (`client`, `status`, `error_type` / `errorType`), exported from both packages.
- `mmsp.wire` / `src_ts/src/wire.ts`: the routes, the defaults, the byte codec and the error codec the server and the client share.
- Playground: `mmsp` ("MMSP server") in the client-type picker, default base URL `MMSP_BASE_URL` or `http://127.0.0.1:25752/v1`.
- Docs: an MMSP Server section in the README, a Server page under Tools on the site, `mmsp` in the client lists, a section on errors through a server, and the skills references.
