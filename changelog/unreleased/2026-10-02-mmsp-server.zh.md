# MMSP 服务端与 `mmsp` 客户端

- **Date:** 2026-10-02
- **Type:** feature
- **Scope:** `integration`, `mmsp`, `wire`, `errors`, `docs`

[English](2026-10-02-mmsp-server.md)

## 变更内容

- **MMSP 服务端**（`mmsp.integration.server`、`@prismshadow/mmsp/integration/server`）：通过 HTTP 提供其环境能访问的所有模型的流。启动方式：`python -m mmsp.integration.server`，或在 `src_ts` 中运行 `npm run server`（参数 `--host`、`--port`、`--api-key`），或调用 `start_server(host, port, api_key)` / `startServer(host, port, apiKey)`；`create_server_app(api_key)` / `createServerApp({ apiKey })` 返回 Flask / Express 应用。默认 `127.0.0.1:25752`。
- 服务端 key：`--api-key` 或 `MMSP_SERVER_API_KEY`；设置后每个 `/v1/` 请求都必须带上 `Authorization: Bearer <key>`，否则返回 401 `AuthenticationError`。
- 路由：每个请求在服务端进程中按 `AutoLLMClient(model=...)` 的方式路由，先看 `CLIENT_TYPE`，否则看 id 的系列名，使用服务端环境中的厂商 key。请求中不带客户端类型、key 或 base URL。`CLIENT_TYPE=mmsp` 时启动即报错。
- `POST /v1/stream` 接收 `{"model", "messages", "config"}`，以 server-sent events 响应：公开流的每个事件一行 `data: <UniEvent JSON>`，最后是 `data: [DONE]`；模型没有输出时每 15 秒写一行 `: keep-alive` 注释。`config` 原样转发，因此 `trace_id` 在服务端也会保存一份。调用方断开时，上游请求随之中止。请求体上限 50 MB。
- `GET /v1/models` 返回 `{"models": [...]}`：对服务端持有的每个厂商 key，列出该厂商中它能路由的 id；设置了 `CLIENT_TYPE` 时，返回该客户端的完整列表。
- 错误格式为 `{"error": {"type", "message", ...}}`：请求体格式错误或模型无法路由返回 400 `InvalidRequestError`，请求体超限返回 413，列出模型失败返回 502；流开始之后，错误是一个错误事件，随后是 `data: [DONE]`。
- 字节数据以 base64 传输；只有 `inline_data.*` 和 `inline_thinking.*` 项的 `data` 会解码回字节。
- **`mmsp` 客户端**（`mmsp/`、`MmspClient`），兼容客户端类型 `mmsp`：返回服务端那一侧客户端产生的公开流。按凭证规则读取 `MMSP_API_KEY` / `MMSP_BASE_URL`，默认 `http://127.0.0.1:25752`。`list_models` 返回服务端的 `/v1/models`。
- `UnsupportedParameterError`、`UnsupportedOperationError`、`EmptyResponseError`、`StreamProtocolError` 和 `ToolCallArgumentParseError` 带着各自的字段穿过服务端，在客户端以原类型再次抛出。其他错误一律抛出新增的 `UpstreamError`（两个包都导出），携带 `client`、`status` 和 `error_type`（`errorType`）。
- `mmsp.wire` / `src_ts/src/wire.ts`：服务端与客户端共用的路径、默认值、字节编解码和错误编解码。
- Playground：客户端类型选择器中新增 `mmsp`（"MMSP server"），默认 base URL 为 `MMSP_BASE_URL` 或 `http://127.0.0.1:25752`。
- 文档：README 新增 MMSP Server 一节，站点 Tools 下新增 Server 页面，客户端列表加入 `mmsp`，错误页新增经由服务端的错误一节，并更新了 skills 参考文档。
