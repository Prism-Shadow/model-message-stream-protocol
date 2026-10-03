# MMSP 服务端与 `mmsp` 客户端

- **Date:** 2026-10-02
- **Type:** feature
- **Scope:** `integration`, `mmsp`, `wire`, `errors`, `docs`
- **PR:** [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247)

[English](2026-10-02-mmsp-server.md)

## 变更内容

- **MMSP 服务端**（`mmsp.integration.server`、`@prismshadow/mmsp/integration/server`）：通过 HTTP 把一张表里的模型提供为 MMSP 流。每一行的 `model_id`、`api_key` 和 `server_model_id`（调用方使用的 id）必填；`base_url`、`client_type` 为空或不写时交给 `AutoLLMClient` 决定（用它的默认端点；客户端先看 `CLIENT_TYPE`，否则用模型 id 对应的官方客户端）。`api_keys` 列出调用方可以发送的 bearer key，可以有多个；列表为空时服务端对所有请求开放，并在启动时说明。两者都来自同一个 JSON 文件，通过 `--config PATH` 或 `MMSP_SERVER_CONFIG` 指定，由 `load_server_config` / `loadServerConfig` 读取；其中 `base_url`、`api_key`、`client_type` 或 `api_keys` 里以 `$` 开头的值从环境变量读取，变量未设置则启动失败。`create_server_app(models, api_keys)` / `createServerApp({ models, apiKeys })` 接收这些行并返回 Flask / Express 应用；`start_server` / `startServer`（返回 `http.Server`）启动它；`--host`、`--port` 默认 `127.0.0.1:25752`，因此调用方的 base URL 是 `http://127.0.0.1:25752/v1`。每一行的上游客户端在启动时构建一次；表为空、某个必填列缺失、`server_model_id` 重复、某个 key 为空或某行被其客户端拒绝时，启动失败并指明是哪一行或哪个 key。
- `GET /v1/models` 以 OpenAI 的格式列出表中的模型：`{"object": "list", "data": [{"id": <server_model_id>, "object": "model", "created": <unix s>, "owned_by": "mmsp"}, ...]}`。
- `POST /v1/stream` 接收 `{"model", "messages", "config"}`，以 server-sent events 响应：公开流的每个事件一行 `data: <UniEvent JSON>`，最后是 `data: [DONE]`；模型没有输出时每 15 秒写一行 `: keep-alive` 注释。`config` 原样转发，因此 `trace_id` 在服务端也会保存一份。调用方断开时，上游请求随之中止。请求体上限 50 MB。
- 错误格式为 `{"error": {"type", "message", ...}}`：没有带服务端的任一 key 返回 401 `AuthenticationError`，请求体格式错误返回 400 `InvalidRequestError`，模型不在表中或路由不存在返回 404 `NotFoundError`，请求体超限返回 413；流开始之后，错误是一个错误事件，随后是 `data: [DONE]`。
- 字节数据以 base64 传输；只有 `inline_data.*` 和 `inline_thinking.*` 项的 `data` 会解码回字节。
- **`mmsp` 客户端**（`mmsp/`、`MmspClient`），兼容客户端类型 `mmsp`：返回服务端那一侧客户端产生的公开流。按凭证规则读取 `MMSP_API_KEY` / `MMSP_BASE_URL`，默认 `http://127.0.0.1:25752/v1`；请求 `{base_url}/stream` 和 `{base_url}/models`。`list_models` 返回表中的 id。
- 五种 MMSP 错误带着各自的字段穿过服务端，在客户端以原类型再次抛出；其他错误一律抛出新增的 `UpstreamError`（`client`、`status`、`error_type` / `errorType`），两个包都导出。
- `mmsp.wire` / `src_ts/src/wire.ts`：服务端与客户端共用的路由、默认值、字节编解码和错误编解码。
- `resolve_server_config(config, source)` / `resolveServerConfig(config, source)`：`load_server_config` 的结构检查和 `$VAR` 解析，与 Playground 共用。`read_server_config(path)` / `readServerConfig(path)`：按原样返回文件内容，不解析 `$VAR`，保留所有键。
- `announce_server` / `announceServer`：打印启动信息 `Starting MMSP server at <base URL>`、`Serving models: <ids>`、`Dashboard at http://host:port/`，服务端开放时再加一行 `Open server: api_keys is empty, every request is accepted`；`start_server` / `startServer` 和 Playground 都调用它。
- `GET /v1/metrics`（`ServerMetrics`，与其他 `/v1/` 接口一样需要 key）：自启动以来的总计和每个模型的请求数、成功数（以 stop 事件结束）、失败数（以错误结束）、断开数（单独计数）、进行中的请求数、成功率、最近 1000 次成功的首个事件耗时和整体耗时的 p50/p90，以及 token 用量；到达模型之前被拒绝的请求只计总数；每个模型还有最近一次请求的时间、结果和错误。`GET /` 提供展示这些数据的仪表盘，只需输入一次 key（`mmsp.dashboard.key`），每 3 秒刷新；404 的提示信息列出了这两个路由。
- Playground：客户端类型选择器中新增 `mmsp`（"MMSP server"），默认 base URL 为 `MMSP_BASE_URL` 或 `http://127.0.0.1:25752/v1`；新增 `/server/` 页面（从顶栏进入），页面上的模型表（Client type 留空为 Auto，Base URL 留空为 Default）、`api_keys`、host 和 port 保存到 `MMSP_SERVER_CONFIG`，未设置时保存到缓存目录下的 `server.json`（命令行的格式外加 `host` 和 `port`，值按输入原样写入），服务端按保存的文件在 Playground 进程内启动（`GET`、`PUT /server/api/config`；`GET /server/api/status`，含 `dashboard_url` 和正在运行的 `config`；`POST /server/api/start`、`/restart`、`/stop`；`$VAR` 形式的值在启动时从 Playground 的环境变量读取）。每一行、每个 key 和监听地址都标有 In effect、Saved 或 Unsaved；Restart 先构建新服务端再停掉旧的；未保存的草稿留在浏览器的 `mmsp.playground.server` 下；启动和停止都会打印到 Playground 的控制台。
- Playground 聊天页面：列出的模型以模型 id、客户端类型、API key 和 base URL 四者为一项；模型 id 相同的项分开列出，描述为 `<client type> · <host>`，选中一项即填入这四个字段。
- 文档：README 新增 MMSP Server 一节，站点 Tools 下新增 Server 页面（含仪表盘一节），客户端列表加入 `mmsp`，错误页新增经由服务端的错误一节，并更新了 skills 参考文档。
