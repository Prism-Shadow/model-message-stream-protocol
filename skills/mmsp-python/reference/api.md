# APIs

`AutoLLMClient` exposes five basic APIs. Prefer the stateful stream for agent loops. See [Basic Usage](../SKILL.md#basic-usage) for a full tool-use example.

## Initialization

Initialize `AutoLLMClient` in one of three common ways:

```python
# The official OpenAI client, named by the model id's family
client = AutoLLMClient(model="gpt-5.5")

# The same, spelled out, with the key and the endpoint given in code
client = AutoLLMClient(
    model="gpt-5.5",
    client_type="openai-official",
    api_key="your-openai-api-key",
    base_url="https://api.openai.com/v1",
)

# A compatible client, for any endpoint that serves OpenAI Chat Completions
client = AutoLLMClient(
    model="custom-model",
    client_type="openai-chat",
    base_url="http://127.0.0.1:8000/v1/",
    api_key="none",
)
```

`client_type` is one of the official clients (`openai-official`, `anthropic-official`, `google-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) or one of the compatible clients (`openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai`, `mmsp`). It may be omitted for a model id that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`); any other id raises `ValueError` and asks for one. See [Model selection](models.md).

A key goes only where it was given for. A key passed in is used, with the `base_url` passed in, else the client's `<P>_BASE_URL`, else its default endpoint. Without a key, a client reads its `<P>_API_KEY` only when it is given no `base_url` or its own default endpoint (`deepseek-official` with `https://api.deepseek.com` uses `DEEPSEEK_API_KEY`); any other `base_url` raises `ApiKeyRequiredError` at construction, so pass `api_key` with it, or drop it and set `<P>_API_KEY` (plus `<P>_BASE_URL` for another endpoint). The `mmsp` client calls a `base_url` given without a key keyless, as an open server. `mmsp.credentials.environment_credential(client_type, base_url)` says what a client will do.

## Method signatures

```python
async def streaming_response(messages: list[UniMessage], config: UniConfig) -> AsyncIterator[UniEvent]:
    """Stream one stateless response from a full message list: delta events, then one stop event."""

async def streaming_response_stateful(message: UniMessage, config: UniConfig) -> AsyncIterator[UniEvent]:
    """Stream one stateful response and update client history before yielding the stop event."""

def get_history() -> list[UniMessage]:
    """Return a copy of stateful history."""

def set_history(history: list[UniMessage]) -> None:
    """Replace stateful history with a copy."""

def clear_history() -> None:
    """Clear stateful history."""
```

## Module-level helpers

```python
def list_supported_models(currency: Literal["USD", "CNY"] = "USD") -> list[SupportedModel]:
    """List supported models covering official endpoints plus OpenRouter and SiliconFlow.
    Each entry carries (model, base_url, client) - mapping onto the AutoLLMClient
    constructor (model, base_url, client_type) - plus input/output modalities
    (Text/Image/Video/Audio/Embed), context_window, and per-million-token pricing in the
    requested currency (official list prices, converted at 7 CNY/USD)."""

def normalize_legacy_messages(messages: list[UniMessage]) -> list[UniMessage]:
    """Convert messages saved before 0.5.0 to the `.done` item types; messages already
    current are returned as they are. Removed in 0.6.0."""
```

## Errors

All MMSP errors subclass `MMSPError` (a `ValueError`). Unsupported `UniConfig`
values (e.g. `temperature` or `tool_choice` on models that reject them) raise
`UnsupportedParameterError`, which carries `client` and `parameter` attributes. Thinking
levels never raise: every client maps each `ThinkingLevel` to the closest supported level.
Errors raised while streaming (`ToolCallArgumentParseError`, `EmptyResponseError`,
`StreamProtocolError`) are listed in [Data models](data-models.md#errors).
