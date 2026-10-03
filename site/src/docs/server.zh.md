---
description: 通过 HTTP 把一张表里的模型提供为 MMSP 流，并用 mmsp 客户端调用。
---

MMSP 服务端通过 HTTP 提供其表中的模型，输出 MMSP 事件。每一行把一个上游模型映射为调用方使用的 id；上游 key 只留在服务端。

## 配置

```json
{
  "models": [
    {"model_id": "claude-sonnet-5-5", "base_url": "https://api.anthropic.com", "api_key": "$ANTHROPIC_API_KEY", "server_model_id": "claude", "client_type": "anthropic-official"},
    {"model_id": "gpt-5.5", "base_url": "https://api.openai.com/v1", "api_key": "$OPENAI_API_KEY", "server_model_id": "gpt-5.5", "client_type": "openai-official"},
    {"model_id": "qwen/qwen3.8-27b", "base_url": "https://openrouter.ai/api/v1", "api_key": "$OPENROUTER_API_KEY", "server_model_id": "qwen3.8", "client_type": "openai-responses"}
  ],
  "api_keys": ["$MMSP_SERVER_API_KEY"]
}
```

每一行的所有列都必填：

| 列 | 内容 |
| --- | --- |
| `model_id` | 上游 id，即 `AutoLLMClient` 接收的形式 |
| `base_url` | 上游端点，例如 `https://api.anthropic.com`、`https://api.openai.com/v1`、`https://openrouter.ai/api/v1` |
| `api_key` | 上游 key |
| `server_model_id` | 调用方使用的 id |
| `client_type` | 上游客户端，为某个[官方](/zh/docs/models/#官方客户端)或[兼容](/zh/docs/models/#兼容客户端)客户端类型；`mmsp` 加另一个服务端的 `/v1` 即可转发到该服务端 |

`api_keys` 列出调用方可以发送的 bearer key，可以有一个或多个。为空或不写时，服务端对所有请求开放，并在启动时说明。

`base_url`、`api_key`、`client_type` 或 `api_keys` 中以 `$` 开头的值（`$VAR` 或 `${VAR}`）在加载文件时从环境变量读取；模型 id 按原样使用。表只在启动时读取一次：表为空、某列缺失或为空、两行使用同一个 `server_model_id`、未知的 `client_type`、未设置的 `$VAR`，都会让服务端停止启动并指明是哪一行。key 不对或端点不可达，会在该行的第一个请求上以厂商的错误出现。

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

也可以从文件读取：`loadServerConfig(path)` / `load_server_config(path)` 返回 `{ models, api_keys }`，其中的 `$VAR` 已替换为环境变量的值。在 shell 中启动（TypeScript 脚本在仓库的 `src_ts` 目录下运行）：

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

`--config` 默认取 `MMSP_SERVER_CONFIG`；`--host`、`--port` 默认 `127.0.0.1:25752`，因此调用方的 base URL 是 `http://127.0.0.1:25752/v1`。`createServerApp({ models, apiKeys })` / `create_server_app(models, api_keys)` 返回 Express / Flask 应用，但不启动它；`startServer` 返回 `http.Server`。

## 接口

| 接口 | 请求 | 响应 |
| --- | --- | --- |
| `GET /v1/models` | | `{"object": "list", "data": [{"id": "claude", "object": "model", "created": …, "owned_by": "mmsp"}, …]}`，每行一项 |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events：每个事件一行 `data: <UniEvent>`，最后是 `data: [DONE]` |

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

它返回的流与该行客户端返回的相同。不传 `base_url` 时读取 `MMSP_BASE_URL` 和 `MMSP_API_KEY`，默认 `http://127.0.0.1:25752/v1`。传入 `base_url` 时必须同时传入 `api_key`，服务端开放时传 `"none"`。`listModels()` / `list_models()` 返回表中的 id。错误原样抛出，见[错误](/zh/docs/errors/#经由-mmsp-服务端)。

在 [Playground](/zh/docs/tracing/#playground) 中选择客户端类型 `mmsp`，即可经由服务端对话。

## 追踪

配置中的 `trace_id` 会传到服务端，所以这一轮会保存两份：客户端保存在它所在的机器上，服务端保存在它自己的 `cache`（或 `MMSP_CACHE_DIR`）下。要查看服务端那一份，在服务端所在的机器上启动 [tracer](/zh/docs/tracing/)。
