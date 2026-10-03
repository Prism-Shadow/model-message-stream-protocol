# MMSP 服务端与 `mmsp` 客户端

- **Date:** 2026-10-02
- **Type:** feature
- **Scope:** `integration`, `mmsp`, `wire`, `errors`, `docs`
- **PR:** [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247)

[English](2026-10-02-mmsp-server.md)

## 变更内容

- **MMSP 服务端**（`mmsp.integration.server`、`@prismshadow/mmsp/integration/server`）：通过 HTTP 把一张表里的模型提供为 MMSP 流。每一行由 `model_id`、`base_url`、`api_key`、`client_type`（上游，即 `AutoLLMClient` 接收的形式）和 `server_model_id`（调用方使用的 id）组成，所有列都必填。`api_keys` 列出调用方可以发送的 bearer key，可以有多个；列表为空时服务端对所有请求开放，并在启动时说明。两者都来自同一个 JSON 文件，通过 `--config PATH` 或 `MMSP_SERVER_CONFIG` 指定，由 `load_server_config` / `loadServerConfig` 读取；其中 `base_url`、`api_key`、`client_type` 或 `api_keys` 里以 `$` 开头的值从环境变量读取，变量未设置则启动失败。`create_server_app(models, api_keys)` / `createServerApp({ models, apiKeys })` 接收这些行并返回 Flask / Express 应用；`start_server` / `startServer`（返回 `http.Server`）启动它；`--host`、`--port` 默认 `127.0.0.1:25752`，因此调用方的 base URL 是 `http://127.0.0.1:25752/v1`。每一行的上游客户端在启动时构建一次；表为空、某列缺失、`server_model_id` 重复或某行被其客户端拒绝时，启动失败并指明是哪一行。
- `GET /v1/models` 以 OpenAI 的格式列出表中的模型：`{"object": "list", "data": [{"id": <server_model_id>, "object": "model", "created": <unix s>, "owned_by": "mmsp"}, ...]}`。
- `POST /v1/stream` 接收 `{"model", "messages", "config"}`，以 server-sent events 响应：公开流的每个事件一行 `data: <UniEvent JSON>`，最后是 `data: [DONE]`；模型没有输出时每 15 秒写一行 `: keep-alive` 注释。`config` 原样转发，因此 `trace_id` 在服务端也会保存一份。调用方断开时，上游请求随之中止。请求体上限 50 MB。
- 错误格式为 `{"error": {"type", "message", ...}}`：没有带服务端的任一 key 返回 401 `AuthenticationError`，请求体格式错误返回 400 `InvalidRequestError`，模型不在表中或路由不存在返回 404 `NotFoundError`，请求体超限返回 413；流开始之后，错误是一个错误事件，随后是 `data: [DONE]`。
- 字节数据以 base64 传输；只有 `inline_data.*` 和 `inline_thinking.*` 项的 `data` 会解码回字节。
- **`mmsp` 客户端**（`mmsp/`、`MmspClient`），兼容客户端类型 `mmsp`：返回服务端那一侧客户端产生的公开流。按凭证规则读取 `MMSP_API_KEY` / `MMSP_BASE_URL`，默认 `http://127.0.0.1:25752/v1`；请求 `{base_url}/stream` 和 `{base_url}/models`。`list_models` 返回表中的 id。
- 五种 MMSP 错误带着各自的字段穿过服务端，在客户端以原类型再次抛出；其他错误一律抛出新增的 `UpstreamError`（`client`、`status`、`error_type` / `errorType`），两个包都导出。
- `mmsp.wire` / `src_ts/src/wire.ts`：服务端与客户端共用的路由、默认值、字节编解码和错误编解码。
- Playground：客户端类型选择器中新增 `mmsp`（"MMSP server"），默认 base URL 为 `MMSP_BASE_URL` 或 `http://127.0.0.1:25752/v1`。
- 文档：README 新增 MMSP Server 一节，站点 Tools 下新增 Server 页面，客户端列表加入 `mmsp`，错误页新增经由服务端的错误一节，并更新了 skills 参考文档。
