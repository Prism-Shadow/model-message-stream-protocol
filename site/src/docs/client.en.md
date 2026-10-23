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
| Key | `api_key` | `apiKey` | Defaults to the client's `<P>_API_KEY`, for the endpoint the environment names or the client's default endpoint only. |
| Endpoint | `base_url` | `baseUrl` | Defaults to the client's `<P>_BASE_URL`, then to its default endpoint. |
| Headers | `default_headers` | `defaultHeaders` | Sent with every request, for endpoints that demand their own. |

A key goes only where it was given for. Every client follows one rule, `<P>` being its variable prefix (`DEEPSEEK` for `deepseek-official`, `OPENAI` for `openai-chat`; see [Models and endpoints](/docs/models/)):

- A key passed in is used. The endpoint is the base URL passed in, else `<P>_BASE_URL`, else the client's default endpoint.
- Without a key, the client reads `<P>_API_KEY` only when no base URL is passed, the endpoint then being `<P>_BASE_URL` or the default, or when the base URL passed is the client's own default endpoint, trailing slashes and the host's case aside. A `deepseek-official` client given no base URL, or `https://api.deepseek.com`, uses `DEEPSEEK_API_KEY`.
- Without a key, any other base URL raises `ApiKeyRequiredError` at construction, and the environment's key is never sent there. Pass the key, or drop the base URL and set `<P>_API_KEY`, plus `<P>_BASE_URL` when the endpoint is not the default.
- The rest of OpenAI's environment (`OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET`, the headers `OPENAI_CUSTOM_HEADERS` lists) follows `OPENAI_API_KEY`: a client built on the OpenAI SDK sends it only to the endpoint that key goes to, never to a gateway, a vLLM server or another vendor's API.
- The clients of a server that may take no key are the exception: for `mmsp` and `openai-chat-vllm-adapter`, a base URL without a key is an open server, called with no key, and so is the default endpoint when `<P>_API_KEY` is unset (`http://127.0.0.1:25752/v1` for `mmsp`; `http://127.0.0.1:8000/v1`, where `vllm serve` answers, for the vLLM adapter, which sends vLLM's placeholder key `EMPTY`).

The same rule ships as data: `@prismshadow/mmsp/credentials` in TypeScript, which imports nothing and fits a browser bundle, and `mmsp.credentials` in Python. `environmentCredential(clientType, baseUrl)` (`environment_credential`) answers what a client handed no key will do, `routedClientType(model, clientType)` (`routed_client_type`) which client a model reaches, and `CLIENT_CREDENTIALS` lists each client type's variables and default endpoint. The clients resolve their credentials through the same table.

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

The history holds deep copies: the stateful method records copies of the message you sent and of the reply, `get_history` returns a deep copy and `set_history` stores one, so neither your objects nor the events you were handed can change it. A message you pass without `created_at` is stamped with one on your own object. One stateful call runs at a time on a client: another one started before the first has yielded its `stop` event, raised or been aborted raises `ConcurrentCallError`. An aborted call releases the client at once and records nothing; a stream you leave earlier holds the client until it is closed (`await stream.aclose()` in Python). A message with nothing the client can send, no content items or thinking alone, raises `InvalidMessageError` before the request goes out.

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
