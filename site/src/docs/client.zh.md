---
description: AutoLLMClient、它的方法，以及随它一起导出的辅助函数。
---

`AutoLLMClient` 是你唯一需要调用的类。它根据 `client_type` 创建对应的客户端，并转发请求。

## 创建客户端

<div class="code-group">

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

// OpenAI 官方客户端，由模型 id 的系列指名
const client = new AutoLLMClient({ model: "gpt-5.5" });

// 同样的客户端，写全，key 和端点在代码里给出
const withEndpoint = new AutoLLMClient({
  model: "gpt-5.5",
  clientType: "openai-official",
  apiKey: "your-openai-api-key",
  baseUrl: "https://api.openai.com/v1",
});

// 兼容客户端，对接任何提供 OpenAI Chat Completions 的端点
const withType = new AutoLLMClient({
  model: "custom-model",
  clientType: "openai-chat",
  baseUrl: "http://127.0.0.1:8000/v1/",
  apiKey: "none",
});
```

```python
from mmsp import AutoLLMClient

# OpenAI 官方客户端，由模型 id 的系列指名
client = AutoLLMClient(model="gpt-5.5")

# 同样的客户端，写全，key 和端点在代码里给出
client = AutoLLMClient(
    model="gpt-5.5",
    client_type="openai-official",
    api_key="your-openai-api-key",
    base_url="https://api.openai.com/v1",
)

# 兼容客户端，对接任何提供 OpenAI Chat Completions 的端点
client = AutoLLMClient(
    model="custom-model",
    client_type="openai-chat",
    base_url="http://127.0.0.1:8000/v1/",
    api_key="none",
)
```

</div>

| 选项 | Python | TypeScript | 含义 |
| --- | --- | --- | --- |
| 模型 | `model` | `model` | 精确的模型 id。 |
| 客户端 | `client_type` | `clientType` | 官方客户端如 `openai-official`，或兼容客户端如 `openai-chat`。如果模型 id 以已知系列开头，可省略此参数，SDK 会自动选择官方客户端；其他 id 必须提供，否则报错。详见[模型与端点](/zh/docs/models/)。 |
| Key | `api_key` | `apiKey` | 默认使用客户端的 `<P>_API_KEY`，但只用于环境变量指定的端点或客户端的默认端点。 |
| 端点 | `base_url` | `baseUrl` | 默认使用客户端的 `<P>_BASE_URL`，否则使用其默认端点。 |
| 请求头 | `default_headers` | `defaultHeaders` | 随每个请求发送，用于需要自定义请求头的端点。 |

API key 只会发送到它被指定的地方。所有客户端遵循同一条规则，其中 `<P>` 是客户端的环境变量前缀（`deepseek-official` 为 `DEEPSEEK`，`openai-chat` 为 `OPENAI`，详见[模型与端点](/zh/docs/models/)）：

- 传入了 key 就使用它。端点依次取传入的 base URL、`<P>_BASE_URL`、客户端的默认端点。
- 未传入 key 时，客户端只在两种情况下读取 `<P>_API_KEY`：未传入 base URL，此时端点为 `<P>_BASE_URL` 或默认端点；或传入的 base URL 正是客户端自己的默认端点（忽略末尾斜杠与主机名大小写）。例如 `deepseek-official` 客户端未传 base URL 或传入 `https://api.deepseek.com` 时，使用 `DEEPSEEK_API_KEY`。
- 未传入 key 而传入其他 base URL 时，客户端在构造时抛出 `ApiKeyRequiredError`，环境变量中的 key 绝不会发往该端点。请传入 key，或去掉 base URL 并设置 `<P>_API_KEY`；端点不是默认端点时再设置 `<P>_BASE_URL`。
- `mmsp` 客户端是唯一的例外：传入 base URL 而不传 key，表示一个开放的 MMSP 服务端，请求不带 key。

这条规则也以数据形式导出：TypeScript 为 `@prismshadow/mmsp/credentials`，它不导入任何模块，可放入浏览器包；Python 为 `mmsp.credentials`。`environmentCredential(clientType, baseUrl)`（`environment_credential`）回答未传 key 的客户端会怎么做，`routedClientType(model, clientType)`（`routed_client_type`）回答模型会用哪个客户端，`CLIENT_CREDENTIALS` 列出每个客户端类型的环境变量与默认端点。客户端解析凭据时用的也是同一张表。

## 方法

<div class="code-group">

```typescript
streamingResponse(options: { messages: UniMessage[]; config: UniConfig }): AsyncGenerator<UniEvent>;

streamingResponseStateful(options: { message: UniMessage; config: UniConfig }): AsyncGenerator<UniEvent>;

listModels(): Promise<string[]>;

getHistory(): UniMessage[];
setHistory(history: UniMessage[]): void;
clearHistory(): void;
```

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

</div>

两个流式方法都会先产出 `delta` 事件，最后产出恰好一个 `stop` 事件。有状态方法在产出 `stop` 事件前就已记录本轮对话，因此你可以在看到 `stop` 事件后立即停止迭代。

`get_history` 返回历史记录的副本，`set_history` 存储传入历史的副本，确保历史记录不会在你不知情时被修改。

当客户端通过 `client_type` 指定时，`list_models` 会列出端点支持的所有模型。从模型 id 推断出的客户端，只列出同一系列的模型 id。

## 辅助函数

<div class="code-group">

```typescript
import { listSupportedModels, normalizeLegacyMessages } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // 默认 "USD"
const messages = normalizeLegacyMessages(storedMessages);
```

```python
from mmsp import list_supported_models, normalize_legacy_messages

models = list_supported_models(currency="CNY")  # 默认 "USD"
messages = normalize_legacy_messages(stored_messages)
```

</div>

- `list_supported_models` 为每个模型和端点返回一条记录，包含模型 id、base URL、客户端类型、输入输出模态、上下文窗口以及每百万 token 的标价。
- `normalize_legacy_messages` 用于转换 [0.5.0 之前保存的消息](/zh/docs/messages/#050-之前保存的消息)。该函数将在 0.6.0 版本中移除。
