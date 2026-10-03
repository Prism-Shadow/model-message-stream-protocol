---
description: 通过 HTTP 把你的 key 能访问的所有模型统一成一条 MMSP 流，并用 mmsp 客户端调用。
---

MMSP 服务端通过 HTTP 提供其环境能访问的所有模型，输出 MMSP 事件。厂商 key 只留在服务端，调用方只需要一种协议。

## 启动服务端

<div class="code-group">

```typescript
import { startServer } from "@prismshadow/mmsp/integration/server";

startServer("127.0.0.1", 25752);
```

```python
from mmsp.integration.server import start_server

start_server(host="127.0.0.1", port=25752)
```

</div>

也可以在 shell 中启动（TypeScript 脚本在仓库的 `src_ts` 目录下运行）：

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm run server -- --host 127.0.0.1 --port 25752
```

```bash
python -m mmsp.integration.server --host 127.0.0.1 --port 25752
```

</div>

默认监听 `127.0.0.1:25752`。`createServerApp()` / `create_server_app()` 返回 Express / Flask 应用，但不启动它。

如需 key，传入 `--api-key`（`apiKey`、`api_key`）或设置 `MMSP_SERVER_API_KEY`。此后每个请求都必须带上 `Authorization: Bearer <key>`。

## 路由

请求里只写模型。服务端在自己的进程里按 `AutoLLMClient(model=...)` 的方式路由，使用其环境中的厂商 key：设置了 `CLIENT_TYPE` 时，所有模型都走它指定的客户端；否则由 id 开头的系列名决定官方客户端（见[模型与端点](/zh/docs/models/#按模型-id-路由)）。

| 服务端环境 | 提供 |
| --- | --- |
| `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`…… | 每个 id 走其系列的官方客户端 |
| `CLIENT_TYPE=openai-responses` `OPENAI_BASE_URL=https://openrouter.ai/api/v1` `OPENAI_API_KEY=…` | 每个 id 都经由 OpenRouter，例如 `qwen/qwen3.8-27b` |

设置了 `CLIENT_TYPE=mmsp` 时，服务端拒绝启动。

## 接口

| 接口 | 请求 | 响应 |
| --- | --- | --- |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events：每个事件一行 `data: <UniEvent>`，最后是 `data: [DONE]` |
| `GET /v1/models` | | `{"models": [...]}` |

```text
data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.delta","text":"Hel"}],...}

data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.done","text":"Hello"}],...}

data: {"role":"assistant","event_type":"stop","content_items":[],"usage_metadata":{...},"finish_reason":"stop",...}

data: [DONE]
```

- 事件就是服务端那一侧客户端的[公开流](/zh/docs/streaming/)：delta、done 项、一个 `stop`。
- 字节数据，即 `inline_data` 和 `inline_thinking` 项的 `data`，双向都以 base64 传输。
- 模型没有输出时，服务端每 15 秒写一行 `: keep-alive` 注释。
- `/v1/models` 对服务端持有的每个厂商 key，列出该厂商中它能路由的 id；设置了 `CLIENT_TYPE` 时，列出该客户端端点的全部模型。
- 错误格式为 `{"error": {"type", "message", ...}}`：key 不对返回 HTTP 401，请求体格式错误或模型无法路由返回 400，请求体超过 50 MB 返回 413，列出模型失败返回 502。流开始之后，错误是一个 `data:` 事件，随后是 `data: [DONE]`。

## mmsp 客户端

<div class="code-group">

```typescript
const client = new AutoLLMClient({
  model: "claude-sonnet-5-5",
  clientType: "mmsp",
  baseUrl: "http://127.0.0.1:25752",
  apiKey: "none",
});
```

```python
client = AutoLLMClient(
    model="claude-sonnet-5-5",
    client_type="mmsp",
    base_url="http://127.0.0.1:25752",
    api_key="none",
)
```

</div>

它返回的流与服务端那一侧客户端返回的相同。不传 `base_url` 时读取 `MMSP_BASE_URL` 和 `MMSP_API_KEY`，默认 `http://127.0.0.1:25752`。传入 `base_url` 时必须同时传入 `api_key`，服务端没有 key 时传 `"none"`。错误原样抛出，见[错误](/zh/docs/errors/#经由-mmsp-服务端)。

在 [Playground](/zh/docs/tracing/#playground) 中选择客户端类型 `mmsp`，即可经由服务端对话。

## 追踪

配置中的 `trace_id` 会传到服务端，所以这一轮会保存两份：客户端保存在它所在的机器上，服务端保存在它自己的 `cache`（或 `MMSP_CACHE_DIR`）下。要查看服务端那一份，在服务端所在的机器上启动 [tracer](/zh/docs/tracing/)。
