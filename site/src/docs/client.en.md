---
description: AutoLLMClient, its methods, and the helpers exported next to it.
---

`AutoLLMClient` is the one class you call. It creates the client its `client_type` names and forwards to it.

## Create a client

<div class="code-group">

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

// the official OpenAI client, named by the model id's family
const client = new AutoLLMClient({ model: "gpt-5.5" });

// the same, spelled out, with the key and the endpoint given in code
const withEndpoint = new AutoLLMClient({
  model: "gpt-5.5",
  clientType: "openai-official",
  apiKey: "your-openai-api-key",
  baseUrl: "https://api.openai.com/v1",
});

// a compatible client, for any endpoint that serves OpenAI Chat Completions
const withType = new AutoLLMClient({
  model: "custom-model",
  clientType: "openai-chat",
  baseUrl: "http://127.0.0.1:8000/v1/",
  apiKey: "none",
});
```

```python
from mmsp import AutoLLMClient

# the official OpenAI client, named by the model id's family
client = AutoLLMClient(model="gpt-5.5")

# the same, spelled out, with the key and the endpoint given in code
client = AutoLLMClient(
    model="gpt-5.5",
    client_type="openai-official",
    api_key="your-openai-api-key",
    base_url="https://api.openai.com/v1",
)

# a compatible client, for any endpoint that serves OpenAI Chat Completions
client = AutoLLMClient(
    model="custom-model",
    client_type="openai-chat",
    base_url="http://127.0.0.1:8000/v1/",
    api_key="none",
)
```

</div>

| Option | Python | TypeScript | Meaning |
| --- | --- | --- | --- |
| Model | `model` | `model` | The exact model id. |
| Client | `client_type` | `clientType` | An official client such as `openai-official`, or a compatible one such as `openai-chat`. May be omitted for a model id that begins with a known family, which names its official client; any other id raises. See [Models and endpoints](/docs/models/). |
| Key | `api_key` | `apiKey` | Defaults to the provider's environment variable, but only when the endpoint comes from the environment too. |
| Endpoint | `base_url` | `baseUrl` | Defaults to the provider's environment variable, then to its official endpoint. |
| Headers | `default_headers` | `defaultHeaders` | Sent with every request, for endpoints that demand their own. |

A key goes only where it was given for. A client that reads `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` from the environment sends it to the endpoint the environment names, `OPENAI_BASE_URL` or `ANTHROPIC_BASE_URL`, or the provider's own. Given a `base_url` and no `api_key`, it raises at construction rather than send that key to another endpoint: pass the key next to the URL. An official client such as `deepseek-official` reads its own variable, `DEEPSEEK_API_KEY`, whatever endpoint it is given.

## Methods

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
    """Stream one response from a full message list. Keeps nothing."""

async def streaming_response_stateful(message: UniMessage, config: UniConfig) -> AsyncIterator[UniEvent]:
    """Stream one response to a new message, and record both in the history."""

async def list_models() -> list[str]:
    """The model ids the configured endpoint serves."""

def get_history() -> list[UniMessage]: ...
def set_history(history: list[UniMessage]) -> None: ...
def clear_history() -> None: ...
```

</div>

Both streaming methods yield `delta` events, then exactly one `stop` event. The stateful method records the turn before it yields the `stop` event, so you may stop iterating as soon as you see it.

`get_history` returns a copy, and `set_history` stores a copy, so the history never changes behind your back.

`list_models` lists everything the endpoint serves when the client was named with `client_type`. A client deduced from a model id lists only the ids of that family.

## Helpers

<div class="code-group">

```typescript
import { listSupportedModels, normalizeLegacyMessages } from "@prismshadow/mmsp";

const models = listSupportedModels("CNY"); // "USD" by default
const messages = normalizeLegacyMessages(storedMessages);
```

```python
from mmsp import list_supported_models, normalize_legacy_messages

models = list_supported_models(currency="CNY")  # "USD" by default
messages = normalize_legacy_messages(stored_messages)
```

</div>

- `list_supported_models` returns one entry per model and endpoint: the model id, the base URL, the client, the input and output modalities, the context window, and the list price per million tokens.
- `normalize_legacy_messages` converts [messages saved before 0.5.0](/docs/messages/#messages-saved-before-050). It is removed in 0.6.0.
