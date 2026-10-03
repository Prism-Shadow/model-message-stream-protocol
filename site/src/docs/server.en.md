---
description: Serve every model your keys reach over HTTP as one MMSP stream, and call it with the mmsp client.
---

The MMSP server streams every model its environment can reach over HTTP, as MMSP events. The vendor keys stay on the server; its clients need one protocol.

## Start the server

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

From a shell (the TypeScript script runs in `src_ts` of a clone of the repository):

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm run server -- --host 127.0.0.1 --port 25752
```

```bash
python -m mmsp.integration.server --host 127.0.0.1 --port 25752
```

</div>

It listens on `127.0.0.1:25752` by default. `createServerApp()` / `create_server_app()` return the Express / Flask app without starting it.

To require a key, pass `--api-key` (`apiKey`, `api_key`) or set `MMSP_SERVER_API_KEY`. Every request must then carry `Authorization: Bearer <key>`.

## Routing

A request names only the model. The server routes it as `AutoLLMClient(model=...)` would in its own process, with the vendor keys of its environment: `CLIENT_TYPE` names one client for every model, otherwise the family the id begins with names its official client (see [Models and endpoints](/docs/models/#routing-by-model-id)).

| Server environment | Serves |
| --- | --- |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, … | Each id through its family's official client |
| `CLIENT_TYPE=openai-responses` `OPENAI_BASE_URL=https://openrouter.ai/api/v1` `OPENAI_API_KEY=…` | Every id through OpenRouter, such as `qwen/qwen3.8-27b` |

The server refuses to start with `CLIENT_TYPE=mmsp`.

## Routes

| Route | Request | Answer |
| --- | --- | --- |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events: one `data: <UniEvent>` per event, then `data: [DONE]` |
| `GET /v1/models` | | `{"models": [...]}` |

```text
data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.delta","text":"Hel"}],...}

data: {"role":"assistant","event_type":"delta","content_items":[{"type":"text.done","text":"Hello"}],...}

data: {"role":"assistant","event_type":"stop","content_items":[],"usage_metadata":{...},"finish_reason":"stop",...}

data: [DONE]
```

- The events are the [public stream](/docs/streaming/) of the server's client: deltas, done items, one `stop`.
- Bytes, the `data` of `inline_data` and `inline_thinking` items, travel as base64 both ways.
- While the model is silent, the server writes a `: keep-alive` comment every 15 seconds.
- `/v1/models` lists, for each vendor key the server holds, the ids of that vendor it can route; with `CLIENT_TYPE`, everything that client's endpoint lists.
- An error is `{"error": {"type", "message", ...}}`: HTTP 401 for the key, 400 for a malformed body or a model it cannot route, 413 for a body over 50 MB, 502 when a listing failed. Once a stream has begun, it is one `data:` event, then `data: [DONE]`.

## The mmsp client

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

It yields the stream the server's client yields. Without a `base_url` it reads `MMSP_BASE_URL` and `MMSP_API_KEY`, and defaults to `http://127.0.0.1:25752`. A `base_url` passed in needs an `api_key` passed in: `"none"` for an open server. Errors come back as themselves; see [Errors](/docs/errors/#through-an-mmsp-server).

In the [playground](/docs/tracing/#playground), the client type `mmsp` chats through a server.

## Traces

A `trace_id` in the config reaches the server, so the turn is saved twice: by the client on its machine, and by the server under its own `cache` (or `MMSP_CACHE_DIR`). Start the [tracer](/docs/tracing/) on the server's machine to read the server's copy.
