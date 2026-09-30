---
description: AutoLLMClient、它的方法，以及随它一起导出的辅助函数。
---

`AutoLLMClient` 是你唯一需要调用的类。它选出会讲该模型线上协议的客户端，并把调用转发过去。

## 创建客户端

<div class="code-group">

```python
from mmsp import AutoLLMClient

# 按模型 id，key 来自环境变量
client = AutoLLMClient(model="gpt-5.5")

# 显式给出 key 和端点
client = AutoLLMClient(
    model="gpt-5.5",
    api_key="your-openai-api-key",
    base_url="https://api.openai.com/v1",
)

# 通过指名的线上协议，对接任何提供该协议的端点
client = AutoLLMClient(model="custom-model", client_type="openai-chat")
```

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

// 按模型 id，key 来自环境变量
const client = new AutoLLMClient({ model: "gpt-5.5" });

// 显式给出 key 和端点
const withEndpoint = new AutoLLMClient({
  model: "gpt-5.5",
  apiKey: "your-openai-api-key",
  baseUrl: "https://api.openai.com/v1",
});

// 通过指名的线上协议，对接任何提供该协议的端点
const withType = new AutoLLMClient({ model: "custom-model", clientType: "openai-chat" });
```

</div>

| 选项 | Python | TypeScript | 含义 |
| --- | --- | --- | --- |
| 模型 | `model` | `model` | 精确的模型 id。 |
| Key | `api_key` | `apiKey` | 默认取提供商的环境变量，但只在端点也来自环境变量时。 |
| 端点 | `base_url` | `baseUrl` | 默认取提供商的环境变量，否则取官方端点。 |
| 协议 | `client_type` | `clientType` | 直接指名客户端，而不是从模型 id 推断。见[模型与端点](/zh/docs/models/)。 |
| 请求头 | `default_headers` | `defaultHeaders` | 随每个请求发送，供要求自定义请求头的端点使用。 |

一个 key 只去它被授予的地方。从环境变量读到 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端，只把它发给环境变量指定的端点，即 `OPENAI_BASE_URL` 或 `ANTHROPIC_BASE_URL`，或提供商的官方端点。给了 `base_url` 却没给 `api_key` 时，它在构造时就抛错，而不是把那个 key 发往另一个端点：把 key 和 URL 一起传。像 `deepseek-v4` 这样的厂商客户端读取自己的变量 `DEEPSEEK_API_KEY`，不论给它哪个端点。

## 方法

<div class="code-group">

```python
async def streaming_response(messages: list[UniMessage], config: UniConfig) -> AsyncIterator[UniEvent]:
    """用完整的消息列表流式输出一条响应。不保存任何东西。"""

async def streaming_response_stateful(message: UniMessage, config: UniConfig) -> AsyncIterator[UniEvent]:
    """对一条新消息流式输出响应，并把两者都记入历史。"""

async def list_models() -> list[str]:
    """已配置端点所提供的模型 id。"""

def get_history() -> list[UniMessage]: ...
def set_history(history: list[UniMessage]) -> None: ...
def clear_history() -> None: ...
```

```typescript
streamingResponse(options: { messages: UniMessage[]; config: UniConfig }): AsyncGenerator<UniEvent>;

streamingResponseStateful(options: { message: UniMessage; config: UniConfig }): AsyncGenerator<UniEvent>;

listModels(): Promise<string[]>;

getHistory(): UniMessage[];
setHistory(history: UniMessage[]): void;
clearHistory(): void;
```

</div>

两个流式方法都先产出 `delta` 事件，然后恰好一个 `stop` 事件。有状态方法在产出 `stop` 事件之前就记录本轮，所以一看到它你就可以停止迭代。

`get_history` 返回一份副本，`set_history` 存入一份副本，历史不会在你背后改变。

当客户端是用 `client_type` 指名的时，`list_models` 列出端点提供的一切。从模型 id 推断出的客户端只列出能推断回它自己的那些 id。

## 辅助函数

<div class="code-group">

```python
from mmsp import list_supported_models, normalize_legacy_messages

models = list_supported_models(currency="CNY")  # 默认 "USD"
messages = normalize_legacy_messages(stored_messages)
```

```typescript
import { listSupportedModels, normalizeLegacyMessages } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // 默认 "USD"
const messages = normalizeLegacyMessages(storedMessages);
```

</div>

- `list_supported_models` 对每个模型和端点各返回一条：模型 id、base URL、客户端、输入和输出模态、上下文窗口，以及每百万 token 的标价。
- `normalize_legacy_messages` 转换 [0.5.0 之前保存的消息](/zh/docs/messages/#050-之前保存的消息)。它在 0.6.0 中移除。
