---
description: Save every turn to disk with one config field, and read it in a local viewer.
---

## Trace a conversation

Set `trace_id` in the config. MMSP saves the full history and the config after every response, before it yields the `stop` event.

<div class="code-group">

```typescript
for await (const event of client.streamingResponseStateful({
  message: { role: "user", content_items: [{ type: "text.done", text: "Hello" }] },
  config: { trace_id: "agent1/conversation_001" },
})) {
  // ...
}
```

```python
async for event in client.streaming_response_stateful(
    message={"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]},
    config={"trace_id": "agent1/conversation_001"},
):
    pass
```

</div>

Traces are written under `cache`, or under the directory named by the environment variable `MMSP_CACHE_DIR`. The id above writes two files:

| File | Holds |
| --- | --- |
| `cache/agent1/conversation_001.json` | The full history and the config, as data |
| `cache/agent1/conversation_001.txt` | The conversation as a readable transcript |

There is no database and nothing to set up.

## Read the traces

Start the viewer and open `http://127.0.0.1:25750`.

<div class="code-group">

```typescript
import { Tracer } from "@prismshadow/mmsp/integration/tracer";

new Tracer().startWebServer("127.0.0.1", 25750);
```

```python
from mmsp.integration.tracer import Tracer

Tracer().start_web_server(host="127.0.0.1", port=25750)
```

</div>

Or start it from a shell (the TypeScript scripts run in `src_ts` of a clone of the repository):

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm run tracer
```

```bash
python -m mmsp.integration.tracer --cache_dir ./cache --host 127.0.0.1 --port 25750
```

</div>

## Playground

The playground is a local chat page for trying a model by hand: pick a model, set the config, send messages, watch the events. Picking a model fills in its client type and the endpoint that client reaches, the environment's or the vendor's own; change either to try the model through another protocol or a gateway. List models adds what the endpoint serves as entries that keep the client type and endpoint they were listed with, plus the latest key; listing again with only another key adds nothing. Open `http://127.0.0.1:25751`; the tracer is served at `/tracer/` next to it. The server page at `/server/` starts an MMSP server from a table saved to a config file.

<div class="code-group">

```typescript
import { startPlaygroundServer } from "@prismshadow/mmsp/integration/playground";

startPlaygroundServer("127.0.0.1", 25751);
```

```python
from mmsp.integration.playground import start_playground_server

start_playground_server(host="127.0.0.1", port=25751)
```

</div>

From a shell:

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm run playground
```

```bash
python -m mmsp.integration.playground --host 127.0.0.1 --port 25751
```

</div>
