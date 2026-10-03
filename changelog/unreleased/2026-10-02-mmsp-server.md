# MMSP server and the `mmsp` client

- **Date:** 2026-10-02
- **Type:** feature
- **Scope:** `integration`, `mmsp`, `wire`, `errors`, `docs`

[中文版](2026-10-02-mmsp-server.zh.md)

## What changed

- **MMSP server** (`mmsp.integration.server`, `@prismshadow/mmsp/integration/server`): streams every model its environment reaches over HTTP. Started with `python -m mmsp.integration.server` or `npm run server` in `src_ts` (flags `--host`, `--port`, `--api-key`), or `start_server(host, port, api_key)` / `startServer(host, port, apiKey)`; `create_server_app(api_key)` / `createServerApp({ apiKey })` return the Flask / Express app. Default `127.0.0.1:25752`.
- Server key: `--api-key` or `MMSP_SERVER_API_KEY`; every `/v1/` request then needs `Authorization: Bearer <key>`, or gets 401 `AuthenticationError`.
- Routing: each request goes where `AutoLLMClient(model=...)` sends it in the server's process, by `CLIENT_TYPE`, else by the id's family, with the vendor keys of the server's environment. The request carries no client type, key or base URL. `CLIENT_TYPE=mmsp` raises at start.
- `POST /v1/stream` takes `{"model", "messages", "config"}` and answers with server-sent events: one `data: <UniEvent JSON>` per event of the public stream, then `data: [DONE]`, with a `: keep-alive` comment every 15 s while the model is silent. `config` is forwarded whole, so a `trace_id` is saved on the server too. A disconnect aborts the upstream request. Body limit 50 MB.
- `GET /v1/models` returns `{"models": [...]}`: for each vendor key the server holds, the ids of that vendor it can route; with `CLIENT_TYPE`, the whole listing of that client.
- Errors are `{"error": {"type", "message", ...}}`: 400 `InvalidRequestError` for a malformed body or a model the server cannot route, 413 for a body over the limit, 502 for a failed listing; once a stream has begun, one error event, then `data: [DONE]`.
- Bytes travel as base64; only the `data` of `inline_data.*` and `inline_thinking.*` items is decoded back.
- **`mmsp` client** (`mmsp/`, `MmspClient`), compatible client type `mmsp`: yields the public stream the server's client yielded. Reads `MMSP_API_KEY` / `MMSP_BASE_URL` under the credential rule, default `http://127.0.0.1:25752`. `list_models` returns the server's `/v1/models`.
- `UnsupportedParameterError`, `UnsupportedOperationError`, `EmptyResponseError`, `StreamProtocolError` and `ToolCallArgumentParseError` cross the server with their fields and are raised again as themselves. Any other error is the new `UpstreamError`, exported from both packages, with `client`, `status` and `error_type` (`errorType`).
- `mmsp.wire` / `src_ts/src/wire.ts`: the paths, the defaults, the byte codec and the error codec the server and the client share.
- Playground: `mmsp` ("MMSP server") in the client-type picker, default base URL `MMSP_BASE_URL` or `http://127.0.0.1:25752`.
- Docs: an MMSP Server section in the README, a Server page under Tools on the site, `mmsp` in the client lists, a section on errors through a server, and the skills references.
