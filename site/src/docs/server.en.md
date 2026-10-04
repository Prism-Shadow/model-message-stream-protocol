---
description: Serve the models of a table over HTTP as MMSP streams, and call them with the mmsp client.
---

The MMSP server serves the models of its table over HTTP as MMSP events. Each row maps an upstream model to the id clients name; the upstream keys stay on the server.

## Configure

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

`base_url` and `client_type` may be empty or absent; the other columns are required:

| Column | Holds |
| --- | --- |
| `model_id` | The upstream id, as `AutoLLMClient` takes it |
| `base_url` | The upstream endpoint, such as `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`; empty or absent, the client's default (its variable, else the vendor's) |
| `api_key` | The upstream key |
| `server_model_id` | The id clients name |
| `client_type` | The upstream client, one of the [official](/docs/models/#official-clients) or [compatible](/docs/models/#compatible-clients) client types; a row with `mmsp` and another server's `/v1` relays it; empty or absent, the one `AutoLLMClient` picks: `CLIENT_TYPE`, else the official client the model id names |

`api_keys` lists the bearer keys clients may send, one or several. Empty or absent, the server is open and says so at start.

A cell that starts with `$` (`$VAR` or `${VAR}`) in `base_url`, `api_key`, `client_type` or `api_keys` is read from the environment when the file is loaded; model ids are taken as written. The table is read once, at start: an empty table, a missing or empty required column, two rows with one `server_model_id`, an unknown `client_type` (or none, for a model id that names no family) or an unset `$VAR` stop the server with the row named. A wrong key or an unreachable endpoint shows on the row's first request, as the vendor's error.

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

Or from the file: `loadServerConfig(path)` / `load_server_config(path)` returns `{ models, api_keys }` with its `$VAR` cells resolved, `resolveServerConfig(config)` / `resolve_server_config(config)` does the same for a config already parsed, and `readServerConfig(path)` / `read_server_config(path)` returns the file as written. From a shell (the TypeScript script runs in `src_ts` of a clone of the repository):

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

`--config` defaults to `MMSP_SERVER_CONFIG`; `--host`, `--port` default to `127.0.0.1:25752`, so a client's base URL is `http://127.0.0.1:25752/v1`. `createServerApp({ models, apiKeys })` / `create_server_app(models, api_keys)` return the Express / Flask app without starting it; `startServer` returns the `http.Server`. `announceServer` / `announce_server` prints the lines above, with `Open server: api_keys is empty, every request is accepted` for an open server.

## Routes

| Route | Request | Answer |
| --- | --- | --- |
| `GET /v1/models` | | `{"object": "list", "data": [{"id": "claude", "object": "model", "created": …, "owned_by": "mmsp"}, …]}`, one entry per row |
| `POST /v1/stream` | `{"model", "messages", "config"}` | Server-sent events: one `data: <UniEvent>` per event, then `data: [DONE]` |
| `GET /v1/metrics` | `?window=N`, optional | What the server has served since it started; see [Metrics](#metrics) |

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

## Metrics

`GET /v1/metrics`, under the same key rule as the other `/v1/` routes, reports what the server has served since it started, in total and per model:

```json
{
  "started_at": 1790000000, "uptime_s": 125,
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

| Field | Counts |
| --- | --- |
| `requests` | Requests that reached a model |
| `successes` | Streams that ended with their `stop` event |
| `failures` | Streams that ended in an error; a model's `last_error` holds the latest message |
| `disconnects` | Callers that went away first; not failures |
| `in_flight` | Requests still streaming |
| `success_rate` | `successes / (successes + failures)`, `null` before either |
| `latency_ms` | p50 and p90 of the time to the first event and to the end, over the latest 1000 successes |
| `tokens` | The usage of the successes, summed |
| `tokens_out` | Thinking + response tokens of the successes |
| `generation_ms` | First event to end of each success, summed; at least 1 ms each |
| `tps` | `tokens_out / generation_ms × 1000`, one decimal; `null` before a success |
| `refused` | Requests refused before a model, by cause; in total only |
| `errors` | The latest 20 failures, newest first; in total only |

A model entry holds the same counts, with its `last_request_at`, `last_outcome` and `last_error`. Times are unix seconds.

`?window=N`, N from 10 to 7200, adds `window`: the last N seconds in 10 s buckets of the clock, rounded up to whole buckets and ending with the current one. Buckets are kept for two hours. A request counts in the bucket it began in; a bucket's percentiles are over its first 64 successes. Any other `window` is a 400 `InvalidRequestError`.

```json
"window": {
  "seconds": 300, "bucket_s": 10, "start": 1790000000, "end": 1790000130,
  "total": {"requests": 10, …, "refused": 0, "tokens_out": 170, "thoughts": 120, "response": 50, "generation_ms": 6800, "tps": 25.0,
            "latency_ms": {…},
            "series": {"requests": [0, 2, …], "successes": […], "failures": […], "disconnects": […], "refused": […],
                       "tokens_out": […], "thoughts": […], "response": […], "generation_ms": […], "tps": [null, 24.1, …],
                       "p50": [null, 880, …], "p90": […], "first_event_p50": […], "first_event_p90": […]}},
  "models": [{"id": "claude", "requests": 5, …, "series": {…}}],
  "previous": null
}
```

`total` and each model entry hold the window's sums and `series`, one value per bucket from `start` to `end`; `refused` is in total only. `start` is never before the server's first bucket. `previous` holds the sums of the window before, `null` unless the server ran through all of it.

The playground's [server page](#from-the-playground) draws them while it runs the server.

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

The client is a forwarding client: it posts the messages, reads the events and yields them as they are, bytes decoded. `curl -N` shows the same stream:

```bash
curl -N http://127.0.0.1:25752/v1/stream -H "Authorization: Bearer $MMSP_SERVER_API_KEY" -H "Content-Type: application/json" \
  -d '{"model": "claude", "messages": [{"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]}]}'
```

Without a `base_url` it reads `MMSP_BASE_URL` and `MMSP_API_KEY`, and defaults to `http://127.0.0.1:25752/v1`. A `base_url` passed without an `api_key` is sent no key, which is what an open server takes; `MMSP_API_KEY` goes only to `MMSP_BASE_URL`. `listModels()` / `list_models()` returns the table's ids. An error the server reports is raised as `UpstreamError`; see [Errors](/docs/errors/#through-an-mmsp-server).

In the [playground](/docs/tracing/#playground), the client type `mmsp` chats through a server.

## From the playground

Open Server, in the top bar of the [playground](/docs/tracing/#playground), opens the server page at `/server/`. Its header shows the state and the base URL; three tabs follow: Overview, Models and Settings.

Models holds a row per model. A model id fills in Served as only; Client type stays Auto and Base URL Default until set. A row collapses to one line (served id, upstream, state) and opens to edit. Settings holds the keys clients send (none for an open server), the host, the port and the file's path. Rows, keys and the listen pair read Live (running), Saved (in the file) or Unsaved (only in the browser).

Save (Ctrl/Cmd+S) writes the page to `MMSP_SERVER_CONFIG`, else `server.json` in `cache` (or `MMSP_CACHE_DIR`). The file is the [config](#configure) plus `host` and `port`, which the command line ignores, so `MMSP_SERVER_CONFIG` can name one file for both. Cells are written as typed: a key written as `$VAR` stays out of the file and is read from the playground's environment at start.

Start runs the file, not the page, and is enabled once one is saved. Apply, shown while the file differs from what runs, replaces the running server with the file; it builds the new one first, so a table the server refuses leaves the old one running. Stop, or stopping the playground, stops the server.

Overview shows a checklist while the server is stopped (add a model, save, start). While it runs, it shows, over a range of 5 min, 15 min or 1 h, refreshed every 3 seconds:

- six tiles, Requests, Success, Latency p50, Latency p90, Tokens out and TPS, each with its change against the previous range;
- a card per model with its state, requests, success, p50, p90, TPS, last outcome and a trend; a card opens its row on Models;
- the Requests chart, by outcome (ok, failed, dropped);
- the Latency chart, p50 and p90;
- the Errors list.

## Traces

A `trace_id` in the config reaches the server, which saves the turn under its own `cache` (or `MMSP_CACHE_DIR`); the client saves nothing. A server the playground started shares the playground's cache, so its [tracer](/docs/tracing/) lists the turn.
