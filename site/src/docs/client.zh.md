---
description: AutoLLMClient、它的方法，以及随它一起导出的辅助函数。
---

`AutoLLMClient` 是你唯一需要调用的类。它会自动选择支持对应模型协议的客户端，并将请求转发过去。

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

# 按协议指定客户端，对接任何提供该协议的端点
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

// 按协议指定客户端，对接任何提供该协议的端点
const withType = new AutoLLMClient({ model: "custom-model", clientType: "openai-chat" });
```

</div>

| 选项 | Python | TypeScript | 含义 |
| --- | --- | --- | --- |
| 模型 | `model` | `model` | 精确的模型 id。 |
| Key | `api_key` | `apiKey` | 默认使用服务商的环境变量，但仅在端点也来自环境变量时生效。 |
| 端点 | `base_url` | `baseUrl` | 默认使用服务商的环境变量，否则使用其官方端点。 |
| 协议 | `client_type` | `clientType` | 直接指定客户端类型，而非从模型 id 推断。详见[模型与端点](/zh/docs/models/)。 |
| 请求头 | `default_headers` | `defaultHeaders` | 随每个请求发送，用于需要自定义请求头的端点。 |

API key 只会发送到它被指定的地方。从环境变量读取 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` 的客户端，只会将其发送到环境变量指定的端点（`OPENAI_BASE_URL` 或 `ANTHROPIC_BASE_URL`）或服务商的官方端点。如果指定了 `base_url` 但未提供 `api_key`，客户端会在构造时直接报错，而不是将 key 发送到其他端点。请将 key 与 URL 一同传入。对于厂商客户端（如 `deepseek-v4`），它会读取自己的环境变量 `DEEPSEEK_API_KEY`，无论给它哪个端点。

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

两个流式方法都会先产出 `delta` 事件，最后产出恰好一个 `stop` 事件。有状态方法在产出 `stop` 事件前就已记录本轮对话，因此你可以在看到 `stop` 事件后立即停止迭代。

`get_history` 返回历史记录的副本，`set_history` 存储传入历史的副本，确保历史记录不会在你不知情时被修改。

当客户端通过 `client_type` 指定时，`list_models` 会列出端点支持的所有模型。从模型 id 推断出的客户端，则只列出能推断回该客户端的模型 id。

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

- `list_supported_models` 为每个模型和端点返回一条记录，包含模型 id、base URL、客户端类型、输入输出模态、上下文窗口以及每百万 token 的标价。
- `normalize_legacy_messages` 用于转换 [0.5.0 之前保存的消息](/zh/docs/messages/#050-之前保存的消息)。该函数将在 0.6.0 版本中移除。
