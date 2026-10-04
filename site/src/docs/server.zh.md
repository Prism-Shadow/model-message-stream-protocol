---
description: 通过 HTTP 把一张表里的模型提供为 MMSP 流，并用 mmsp 客户端调用。
---

MMSP 服务端通过 HTTP 提供其表中的模型，输出 MMSP 事件。每一行把一个上游模型映射为调用方使用的 id；上游 key 只留在服务端。

## 配置

```json
{
  "models": [
    {"model_id": "claude-sonnet-5-5", "api_key": "$ANTHROPIC_API_KEY", "server_model_id": "claude"},
    {"model_id": "gpt-5.5", "base_url": "https://api.openai.com/v1", "api_key": "$OPENAI_API_KEY", "server_model_id": "gpt-5.5", "client_type": "openai-official"},
    {"model_id": "qwen/qwen3.8-27b", "base_url": "https://openrouter.ai/api/v1", "api_key": "$OPENROUTER_API_KEY", "server_model_id": "qwen3.8", "client_type": "openai-responses"}
  ],
  "api_keys": ["$MMSP_SERVER_API_KEY"]
}
```

`base_url` 和 `client_type` 可以为空或不写，其余列必填：

| 列 | 内容 |
| --- | --- |
| `model_id` | 上游 id，即 `AutoLLMClient` 接收的形式 |
| `base_url` | 上游端点，例如 `https://api.openai.com/v1`、`https://openrouter.ai/api/v1`；为空或不写时用该客户端的默认端点（它的环境变量，否则是厂商官方的） |
| `api_key` | 上游 key |
| `server_model_id` | 调用方使用的 id |
| `client_type` | 上游客户端，为某个[官方](/zh/docs/models/#官方客户端)或[兼容](/zh/docs/models/#兼容客户端)客户端类型；`mmsp` 加另一个服务端的 `/v1` 即可转发到该服务端；为空或不写时由 `AutoLLMClient` 决定：先看 `CLIENT_TYPE`，否则用模型 id 对应的官方客户端 |

`api_keys` 列出调用方可以发送的 bearer key，可以有一个或多个。为空或不写时，服务端对所有请求开放，并在启动时说明。

`base_url`、`api_key`、`client_type` 或 `api_keys` 中以 `$` 开头的值（`$VAR` 或 `${VAR}`）在加载文件时从环境变量读取；模型 id 按原样使用。表只在启动时读取一次：表为空、某个必填列缺失或为空、两行使用同一个 `server_model_id`、未知的 `client_type`（或模型 id 不属于任何系列却没写 `client_type`）、未设置的 `$VAR`，都会让服务端停止启动并指明是哪一行。key 不对或端点不可达，会在该行的第一个请求上以厂商的错误出现。

## 启动服务端

<div class="code-group">

```typescript
import { startServer } from "@prismshadow/mmsp/integration/server";

startServer({
  models: [{
    model_id: "claude-sonnet-5-5",
    base_url: "https://api.anthropic.com",
    api_key: process.env.ANTHROPIC_API_KEY!,
    server_model_id: "claude",
    client_type: "anthropic-official",
  }],
  apiKeys: ["secret"],
});
```

```python
import os

from mmsp.integration.server import start_server

start_server(
    [{
        "model_id": "claude-sonnet-5-5",
        "base_url": "https://api.anthropic.com",
        "api_key": os.environ["ANTHROPIC_API_KEY"],
        "server_model_id": "claude",
        "client_type": "anthropic-official",
    }],
    api_keys=["secret"],
)
```

</div>

也可以从文件读取：`loadServerConfig(path)` / `load_server_config(path)` 返回 `{ models, api_keys }`，其中的 `$VAR` 已替换为环境变量的值；`resolveServerConfig(config)` / `resolve_server_config(config)` 对已解析的配置做同样的处理；`readServerConfig(path)` / `read_server_config(path)` 按原样返回文件内容。在 shell 中启动（TypeScript 脚本在仓库的 `src_ts` 目录下运行）：

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm run server -- --config mmsp-server.json
```

```bash
python -m mmsp.integration.server --config mmsp-server.json
```

</div>

```text
Starting MMSP server at http://127.0.0.1:25752/v1
Serving models: claude, gpt-5.5, qwen3.8
```

`--config` 默认取 `MMSP_SERVER_CONFIG`；`--host`、`--port` 默认 `127.0.0.1:25752`，因此调用方的 base URL 是 `http://127.0.0.1:25752/v1`。`--metrics FILE`（代码中为 `metricsPath` / `metrics_path`）把[指标历史](#指标)保存在该文件里，下次启动接着记录；一个文件只供一个服务端使用。不传则不写文件。`createServerApp({ models, apiKeys })` / `create_server_app(models, api_keys)` 返回 Express / Flask 应用，但不启动它；`startServer` 返回 `http.Server`。上面几行由 `announceServer` / `announce_server` 打印，服务端开放时还会多一行 `Open server: api_keys is empty, every request is accepted`。

## 接口

| 接口 | 请求 | 响应 |
| --- | --- | --- |
| `GET /v1/models` | | `{"object": "list", "data": [{"id": "claude", "object": "model", "created": …, "owned_by": "mmsp"}, …]}`，每行一项 |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events：每个事件一行 `data: <UniEvent>`，最后是 `data: [DONE]` |
| `GET /v1/metrics` | `?window=N` 或 `?from=F&to=T`，以及 `?columns=C`；可选 | 服务端自启动以来以及某个时间范围内的处理情况，见[指标](#指标) |

```text
data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.delta","text":"Hel"}],...}

data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.done","text":"Hello"}],...}

data: {"role":"assistant","event_type":"stop","content_items":[],"usage_metadata":{...},"finish_reason":"stop",...}

data: [DONE]
```

- 事件就是该行客户端的[公开流](/zh/docs/streaming/)：delta、done 项、一个 `stop`。
- 字节数据，即 `inline_data` 和 `inline_thinking` 项的 `data`，双向都以 base64 传输。
- 模型没有输出时，服务端每 15 秒写一行 `: keep-alive` 注释。
- 错误格式为 `{"error": {"type", "message", ...}}`：没有带其中一个 key 返回 HTTP 401 `AuthenticationError`，请求体格式错误返回 400 `InvalidRequestError`，模型不在表中（`The model 'x' does not exist; GET /v1/models lists the models this server serves.`）或路径不存在（`No route for GET /models; ...`）返回 404 `NotFoundError`，请求体超过 50 MB 返回 413。流开始之后，错误是一个 `data:` 事件，随后是 `data: [DONE]`。

## 指标

`GET /v1/metrics` 与其他 `/v1/` 接口一样需要 key，返回服务端自启动以来的处理情况，包括总计和每个模型：

```json
{
  "started_at": 1790000000, "since": 1789400000, "uptime_s": 125,
  "requests": 10, "successes": 8, "failures": 1, "disconnects": 1, "in_flight": 0, "success_rate": 0.8889,
  "latency_ms": {"first_event": {"p50": 120, "p90": 400}, "total": {"p50": 900, "p90": 2300}},
  "tokens": {"prompt": 30, "cached": 0, "thoughts": 120, "response": 50},
  "tokens_out": 170, "generation_ms": 6800, "tps": 25.0,
  "refused": {"unauthorized": 0, "invalid_request": 0, "unknown_model": 0},
  "last_request_at": 1790000100.123,
  "errors": [{"at": 1790000090.456, "model": "gpt-5.5", "message": "Error code: 529 - …"}],
  "models": [{"id": "claude", "requests": 5, …, "last_request_at": 1790000100.123, "last_outcome": "success", "last_error": null}]
}
```

| 字段 | 统计的是 |
| --- | --- |
| `since` | 历史的起点：即 `started_at`，服务端接着记录历史文件时更早 |
| `requests` | 到达某个模型的请求 |
| `successes` | 以 `stop` 事件结束的流 |
| `failures` | 以错误结束的流；模型的 `last_error` 记录最近一条错误信息 |
| `disconnects` | 调用方提前断开的请求，不算失败 |
| `in_flight` | 仍在输出的请求 |
| `success_rate` | `successes / (successes + failures)`，两者都为 0 时为 `null` |
| `latency_ms` | 首个事件耗时和整体耗时的 p50、p90，取最近 1000 次成功 |
| `tokens` | 成功请求的用量之和 |
| `tokens_out` | 成功请求的思考 token 与回复 token 之和 |
| `generation_ms` | 每次成功从首个事件到结束的耗时之和，每次至少记 1 ms |
| `tps` | `tokens_out / generation_ms × 1000`，保留一位小数；还没有成功请求时为 `null` |
| `refused` | 到达模型之前就被拒绝的请求，按原因分开计数；只有总计 |
| `errors` | 最近 100 次失败，最新的在前，随历史一起保存；只有总计 |

每个模型的条目包含同样的计数，另有 `last_request_at`、`last_outcome` 和 `last_error`。时间均为 unix 秒。

加上 `?window=N`（N 为 10 到 5184000，即 60 天）会多出 `window`：最近 N 秒，最后一列是当前这一列。改用 `?from=F&to=T`（unix 秒，相隔不超过 60 天）则是从 F 到 T 这段时间。`?columns=C`（1 到 1440）限定列数上限，默认 360。取其他值，或 `window` 与 `from`、`to` 同时出现，返回 400 `InvalidRequestError`。

服务端按时钟保留 2 小时的 10 秒桶、2 天的 1 分钟桶和 60 天的 1 小时桶。桶超出所在粒度的保留时长后，并入下一级粒度的桶，延迟样本保留均匀分布的 64 个；超过 60 天的不再保留。请求计入它开始时所在的桶；一个 10 秒桶的分位数取自它的前 64 次成功。列宽 `bucket_s` 取 10 s、20 s、30 s、1、2、5、10、15、20、30 min、1、2、3、6、12 h 中能满足 `columns` 的最小值（都不满足则取 12 h），且不细于范围起点处保存的桶。`start` 和 `end` 按列宽对齐，数组始终覆盖整个范围，没有数据的地方为 0 或 `null`。以 `?window=86400&columns=72` 为例：

```json
"window": {
  "seconds": 86400, "bucket_s": 1200, "start": 1789914000, "end": 1790000400,
  "total": {"requests": 2210, …, "refused": 14, "tokens_out": 804000, "thoughts": 160000, "response": 644000, "generation_ms": 19000000, "tps": 42.3,
            "latency_ms": {…},
            "series": {"requests": [31, 28, …], "successes": […], "failures": […], "disconnects": […], "refused": […],
                       "tokens_out": […], "thoughts": […], "response": […], "generation_ms": […], "tps": [41.8, 43.0, …],
                       "p50": [1150, 1230, …], "p90": […], "first_event_p50": […], "first_event_p90": […]}},
  "models": [{"id": "claude", "requests": 1180, …, "series": {…}}],
  "previous": {"requests": 1970, …}
}
```

`seconds` 为 N，或 T − F。`total` 和每个模型的条目包含该范围内的合计和 `series`，`series` 从 `start` 到 `end` 每列一个值；`refused` 只有总计。`previous` 是前一个范围的合计，只有历史完整覆盖那个范围时才有值，否则为 `null`。

Playground 的 [server 页面](#在-playground-里启动)把这些数据画出来，服务端运行或停止时都能看。

## mmsp 客户端

<div class="code-group">

```typescript
const client = new AutoLLMClient({
  model: "claude",
  clientType: "mmsp",
  baseUrl: "http://127.0.0.1:25752/v1",
  apiKey: "secret",
});
```

```python
client = AutoLLMClient(
    model="claude",
    client_type="mmsp",
    base_url="http://127.0.0.1:25752/v1",
    api_key="secret",
)
```

</div>

这个客户端只做转发：发出消息，读取事件，原样返回，只把字节数据解码回来。用 `curl -N` 看到的是同一个流：

```bash
curl -N http://127.0.0.1:25752/v1/stream -H "Authorization: Bearer $MMSP_SERVER_API_KEY" -H "Content-Type: application/json" \
  -d '{"model": "claude", "messages": [{"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]}]}'
```

不传 `base_url` 时读取 `MMSP_BASE_URL` 和 `MMSP_API_KEY`，默认 `http://127.0.0.1:25752/v1`。只传 `base_url` 不传 `api_key` 时不发送 key，开放的服务端正是如此；`MMSP_API_KEY` 只发给 `MMSP_BASE_URL`。`listModels()` / `list_models()` 返回表中的 id。服务端报告的错误以 `UpstreamError` 抛出，见[错误](/zh/docs/errors/#经由-mmsp-服务端)。

在 [Playground](/zh/docs/tracing/#playground) 中选择客户端类型 `mmsp`，即可经由服务端对话。

## 在 Playground 里启动

[Playground](/zh/docs/tracing/#playground) 顶栏的 Open Server 打开位于 `/server/` 的 server 页面。页头显示状态和 base URL，下面是三个标签页：Overview、Models 和 Settings。

Models 里每个模型一行。填入模型 id 只会同步填入 Served as；不手动设置时，Client type 保持 Auto，Base URL 保持 Default。每个模型收起为一行（提供的 id、上游、状态），点开即可编辑。Settings 里是调用方发送的 key（不填则对所有请求开放）、host 和 port，以及 File：格式化显示已保存的文件，key 遮住、点开才显示，附文件路径和复制按钮。模型行、key 和监听地址都标有 Live（正在运行）、Saved（已写入文件）或 Unsaved（只在浏览器里）。

Save（Ctrl/Cmd+S）把页面内容写入 `MMSP_SERVER_CONFIG`，未设置时写入 `cache`（或 `MMSP_CACHE_DIR`）下的 `server.json`。文件就是上面的[配置](#配置)，外加 `host` 和 `port`，命令行会忽略这两项，所以两者可以用 `MMSP_SERVER_CONFIG` 指向同一个文件。值按输入原样写入：写成 `$VAR` 的 key 不会进入文件，启动时从 Playground 的环境变量读取。

Start 运行的是文件，而不是页面上的内容，保存过文件后才可点。文件与正在运行的不一致时出现 Apply，它用文件替换正在运行的服务端：先构建新服务端再停掉旧的，因此新表被拒绝时，旧服务端照常运行。点 Stop 或停止 Playground，服务端随之停止。

Overview 按最近 15 min、1 h、6 h、24 h、7 d 或 30 d，或自选的 From/To 时间范围（不超过 60 天）显示以下内容，服务端运行期间每 3 秒刷新一次：

- 六个指标卡：Requests、Success、Latency p50、Latency p90、Tokens out 和 TPS，各自标出与前一个时间范围相比的变化；
- 每个模型一张卡片，显示状态、请求数、成功率、p50、p90、TPS、最近一次请求的结果和趋势；点卡片会在 Models 里打开该行；
- Requests 图，按结果分为 ok、failed、dropped；
- Latency 图，p50 和 p90 两条线；
- Errors 列表。

服务端把历史保存在配置文件旁边的 `<config>-metrics.json` 里（`server.json` 旁边就是 `server-metrics.json`），所以 Apply 和重启之后接着记录。服务端停止时，Overview 显示一个清单（添加模型、保存、启动），有历史时清单下面显示历史。

## 追踪

配置中的 `trace_id` 会传到服务端，由服务端把这一轮保存在它自己的 `cache`（或 `MMSP_CACHE_DIR`）下；客户端不保存。Playground 启动的服务端与 Playground 共用缓存，因此在 Playground 的 [tracer](/zh/docs/tracing/) 里就能看到这一轮。
