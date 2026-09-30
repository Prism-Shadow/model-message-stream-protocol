---
description: 用一个配置字段保存每轮对话到磁盘，在本地查看器中读取。
---

## 追踪对话

在配置中设置 `trace_id`。MMSP 会在每次响应后、返回 `stop` 事件前，自动保存完整的历史记录和配置。

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

追踪文件默认保存在 `cache` 目录下，也可通过环境变量 `MMSP_CACHE_DIR` 指定其他目录。上面的 id 会生成两个文件：

| 文件 | 内容 |
| --- | --- |
| `cache/agent1/conversation_001.json` | 完整的历史和配置数据 |
| `cache/agent1/conversation_001.txt` | 可读的对话文本记录 |

无需数据库，也无需额外配置。

## 查看追踪

启动查看器，然后访问 `http://127.0.0.1:25750`。

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

也可以在 shell 中用一行命令启动（TypeScript 需在装有 `@prismshadow/mmsp` 的项目中运行）：

<div class="code-group" data-labels="TypeScript,Python">

```bash
node -e 'const { Tracer } = require("@prismshadow/mmsp/integration/tracer"); new Tracer("./cache").startWebServer("127.0.0.1", 25750);'
```

```bash
python -m mmsp.integration.tracer --cache_dir ./cache --host 127.0.0.1 --port 25750
```

</div>

## Playground

Playground 是一个本地聊天页面，用于手动测试模型：选择模型、设置配置、发送消息、观察事件。选择模型后，会自动填入它的客户端类型和该客户端访问的端点（环境变量里的，或厂商官方的）；改动其中任意一项，就能经由另一种协议或网关试用这个模型。List models 会把端点提供的模型加进列表，客户端类型和端点与当前相同。访问 `http://127.0.0.1:25751`；tracer 页面位于其旁边的 `/tracer/` 路径。

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

在 shell 中启动：

<div class="code-group" data-labels="TypeScript,Python">

```bash
node -e 'const { startPlaygroundServer } = require("@prismshadow/mmsp/integration/playground"); startPlaygroundServer("127.0.0.1", 25751);'
```

```bash
python -m mmsp.integration.playground --host 127.0.0.1 --port 25751
```

</div>
