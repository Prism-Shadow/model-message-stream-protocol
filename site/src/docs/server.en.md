---
description: Serve the models of a table over HTTP as MMSP streams, and call them with the mmsp client.
---

The MMSP server serves the models of its table over HTTP as MMSP events. Each row maps an upstream model to the id clients name; the upstream keys stay on the server.

## Configure

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

Every column of a row is required:

| Column | Holds |
| --- | --- |
| `model_id` | The upstream id, as `AutoLLMClient` takes it |
| `base_url` | The upstream endpoint, such as `https://api.anthropic.com`, `https://api.openai.com/v1`, `https://openrouter.ai/api/v1` |
| `api_key` | The upstream key |
| `server_model_id` | The id clients name |
| `client_type` | The upstream client, one of the [official](/docs/models/#official-clients) or [compatible](/docs/models/#compatible-clients) client types; a row with `mmsp` and another server's `/v1` relays it |

`api_keys` lists the bearer keys clients may send, one or several. Empty or absent, the server is open and says so at start.

A cell that starts with `$` (`$VAR` or `${VAR}`) in `base_url`, `api_key`, `client_type` or `api_keys` is read from the environment when the file is loaded; model ids are taken as written. The table is read once, at start: an empty table, a missing or empty column, two rows with one `server_model_id`, an unknown `client_type` or an unset `$VAR` stop the server with the row named. A wrong key or an unreachable endpoint shows on the row's first request, as the vendor's error.

## Start the server

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

Or from the file: `loadServerConfig(path)` / `load_server_config(path)` returns `{ models, api_keys }` with its `$VAR` cells resolved. From a shell (the TypeScript script runs in `src_ts` of a clone of the repository):

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

`--config` defaults to `MMSP_SERVER_CONFIG`; `--host`, `--port` default to `127.0.0.1:25752`, so a client's base URL is `http://127.0.0.1:25752/v1`. `createServerApp({ models, apiKeys })` / `create_server_app(models, api_keys)` return the Express / Flask app without starting it; `startServer` returns the `http.Server`.

## Routes

| Route | Request | Answer |
| --- | --- | --- |
| `GET /v1/models` | | `{"object": "list", "data": [{"id": "claude", "object": "model", "created": …, "owned_by": "mmsp"}, …]}`, one entry per row |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events: one `data: <UniEvent>` per event, then `data: [DONE]` |

```text
data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.delta","text":"Hel"}],...}

data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.done","text":"Hello"}],...}

data: {"role":"assistant","event_type":"stop","content_items":[],"usage_metadata":{...},"finish_reason":"stop",...}

data: [DONE]
```

- The events are the [public stream](/docs/streaming/) of the row's client: deltas, done items, one `stop`.
- Bytes, the `data` of `inline_data` and `inline_thinking` items, travel as base64 both ways.
- While the model is silent, the server writes a `: keep-alive` comment every 15 seconds.
- An error is `{"error": {"type", "message", ...}}`: HTTP 401 `AuthenticationError` without one of the keys, 400 `InvalidRequestError` for a malformed body, 404 `NotFoundError` for a model not in the table (`The model 'x' does not exist; GET /v1/models lists the models this server serves.`) and for any other path (`No route for GET /models; ...`), 413 for a body over 50 MB. Once a stream has begun, it is one `data:` event, then `data: [DONE]`.

## The mmsp client

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

It yields the stream the row's client yields. Without a `base_url` it reads `MMSP_BASE_URL` and `MMSP_API_KEY`, and defaults to `http://127.0.0.1:25752/v1`. A `base_url` passed in needs an `api_key` passed in: `"none"` for an open server. `listModels()` / `list_models()` returns the table's ids. Errors come back as themselves; see [Errors](/docs/errors/#through-an-mmsp-server).

In the [playground](/docs/tracing/#playground), the client type `mmsp` chats through a server.

## Traces

A `trace_id` in the config reaches the server, so the turn is saved twice: by the client on its machine, and by the server under its own `cache` (or `MMSP_CACHE_DIR`). Start the [tracer](/docs/tracing/) on the server's machine to read the server's copy.
