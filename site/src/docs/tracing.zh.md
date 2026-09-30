---
description: 用一个配置字段把每一轮保存到磁盘，并在本地查看器里读取。
---

## 追踪一段对话

在配置里设置 `trace_id`。MMSP 在每次响应之后、产出 `stop` 事件之前，保存完整的历史和配置。

<div class="code-group">

```python
async for event in client.streaming_response_stateful(
    message={"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]},
    config={"trace_id": "agent1/conversation_001"},
):
    pass
```

```typescript
for await (const event of client.streamingResponseStateful({
  message: { role: "user", content_items: [{ type: "text.done", text: "Hello" }] },
  config: { trace_id: "agent1/conversation_001" },
})) {
  // ...
}
```

</div>

追踪写在 `cache` 目录下，或者写在环境变量 `MMSP_CACHE_DIR` 指定的目录下。上面的 id 会写两个文件：

| 文件 | 内容 |
| --- | --- |
| `cache/agent1/conversation_001.json` | 完整的历史和配置，以数据形式 |
| `cache/agent1/conversation_001.txt` | 对话本身，以可读的文本记录形式 |

没有数据库，也不需要任何设置。

## 读取追踪

启动查看器，打开 `http://127.0.0.1:25750`。

<div class="code-group">

```python
from mmsp.integration.tracer import Tracer

Tracer().start_web_server(host="127.0.0.1", port=25750)
```

```typescript
import { Tracer } from "@prismshadow/mmsp/integration/tracer";

new Tracer().startWebServer("127.0.0.1", 25750);
```

</div>

在 shell 里，用 Python：

```bash
python -m mmsp.integration.tracer --cache_dir ./cache --host 127.0.0.1 --port 25750
```

## Playground

Playground 是一个本地聊天页面，用来手动试一个模型：选模型、设配置、发消息、看事件。打开 `http://127.0.0.1:25751`；tracer 在它旁边的 `/tracer/` 路径下提供。

<div class="code-group">

```python
from mmsp.integration.playground import start_playground_server

start_playground_server(host="127.0.0.1", port=25751)
```

```typescript
import { startPlaygroundServer } from "@prismshadow/mmsp/integration/playground";

startPlaygroundServer("127.0.0.1", 25751);
```

</div>
