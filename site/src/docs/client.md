---
description: AutoLLMClient, its methods, and the helpers exported next to it.
---

`AutoLLMClient` is the one class you call. It picks the client that speaks the model's wire protocol and forwards to it.

## Create a client

<div class="code-group">

```python
from mmsp import AutoLLMClient

# by model id, with the key from the environment
client = AutoLLMClient(model="gpt-5.5")

# with the key and the endpoint spelled out
client = AutoLLMClient(
    model="gpt-5.5",
    api_key="your-openai-api-key",
    base_url="https://api.openai.com/v1",
)

# through a named wire protocol, for any endpoint that serves it
client = AutoLLMClient(model="custom-model", client_type="openai-chat")
```

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

// by model id, with the key from the environment
const client = new AutoLLMClient({ model: "gpt-5.5" });

// with the key and the endpoint spelled out
const withEndpoint = new AutoLLMClient({
  model: "gpt-5.5",
  apiKey: "your-openai-api-key",
  baseUrl: "https://api.openai.com/v1",
});

// through a named wire protocol, for any endpoint that serves it
const withType = new AutoLLMClient({ model: "custom-model", clientType: "openai-chat" });
```

</div>

| Option | Python | TypeScript | Meaning |
| --- | --- | --- | --- |
| Model | `model` | `model` | The exact model id. |
| Key | `api_key` | `apiKey` | Defaults to the provider's environment variable. |
| Endpoint | `base_url` | `baseUrl` | Defaults to the provider's environment variable, then to its official endpoint. |
| Protocol | `client_type` | `clientType` | Names the client instead of deducing it from the model id. See [Models and endpoints](/docs/models/). |
| Headers | `default_headers` | `defaultHeaders` | Sent with every request, for endpoints that demand their own. |

## Methods

<div class="code-group">

```python
async def streaming_response(messages: list[UniMessage], config: UniConfig) -> AsyncIterator[UniEvent]:
    """Stream one response from a full message list. Keeps nothing."""

async def streaming_response_stateful(message: UniMessage, config: UniConfig) -> AsyncIterator[UniEvent]:
    """Stream one response to a new message, and record both in the history."""

async def list_models() -> list[str]:
    """The model ids the configured endpoint serves."""

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

Both streaming methods yield `delta` events, then exactly one `stop` event. The stateful method records the turn before it yields the `stop` event, so you may stop iterating as soon as you see it.

`get_history` returns a copy, and `set_history` stores a copy, so the history never changes behind your back.

`list_models` lists everything the endpoint serves when the client was named with `client_type`. A client deduced from a model id lists only the ids that deduce back to it.

## Helpers

<div class="code-group">

```python
from mmsp import list_supported_models, normalize_legacy_messages

models = list_supported_models(currency="CNY")  # "USD" by default
messages = normalize_legacy_messages(stored_messages)
```

```typescript
import { listSupportedModels, normalizeLegacyMessages } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // "USD" by default
const messages = normalizeLegacyMessages(storedMessages);
```

</div>

- `list_supported_models` returns one entry per model and endpoint: the model id, the base URL, the client, the input and output modalities, the context window, and the list price per million tokens.
- `normalize_legacy_messages` converts [messages saved before 0.5.0](/docs/messages/#messages-saved-before-050). It is removed in 0.6.0.
