# APIs

`AutoLLMClient` exposes five basic APIs. Prefer the stateful stream for agent loops. See [Basic Usage](../SKILL.md#basic-usage) for a full tool-use example.

## Initialization

Initialize `AutoLLMClient` in one of three common ways:

```typescript
// The official OpenAI client, named by the model id's family
const clientByModel = new AutoLLMClient({ model: "gpt-5.5" });

// The same, spelled out, with the key and the endpoint given in code
const clientWithEndpoint = new AutoLLMClient({
  model: "gpt-5.5",
  clientType: "openai-official",
  apiKey: "your-openai-api-key",
  baseUrl: "https://api.openai.com/v1",
});

// A compatible client, for any endpoint that serves OpenAI Chat Completions
const clientWithType = new AutoLLMClient({
  model: "custom-model",
  clientType: "openai-chat",
  baseUrl: "http://127.0.0.1:8000/v1/",
  apiKey: "none",
});
```

`clientType` is one of the official clients (`openai-official`, `anthropic-official`, `google-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) or one of the compatible clients (`openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai`, `mmsp`). It may be omitted for a model id that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`); any other id throws and asks for one. See [Model selection](models.md).

A key goes only where it was given for. A key passed in is used, with the `baseUrl` passed in, else the client's `<P>_BASE_URL`, else its default endpoint. Without a key, a client reads its `<P>_API_KEY` only when it is given no `baseUrl` or its own default endpoint (`deepseek-official` with `https://api.deepseek.com` uses `DEEPSEEK_API_KEY`); any other `baseUrl` throws `ApiKeyRequiredError` at construction, so pass `apiKey` with it, or drop it and set `<P>_API_KEY` (plus `<P>_BASE_URL` for another endpoint). The `mmsp` and `openai-chat-vllm-adapter` clients call a `baseUrl` given without a key keyless, as an open server, and their default endpoint too when `<P>_API_KEY` is unset. `environmentCredential(clientType, baseUrl)` from `@prismshadow/mmsp/credentials`, which imports nothing and fits a browser bundle, says what a client will do.

## Method signatures

```typescript
/** Stream one stateless response from a full message list: delta events, then one stop event. */
streamingResponse(options: { messages: UniMessage[]; config: UniConfig }): AsyncGenerator<UniEvent>;

/** Stream one stateful response and update client history before yielding the stop event. */
streamingResponseStateful(options: { message: UniMessage; config: UniConfig }): AsyncGenerator<UniEvent>;

/** Return a copy of stateful history. */
getHistory(): UniMessage[];

/** Replace stateful history with a copy. */
setHistory(history: UniMessage[]): void;

/** Clear stateful history. */
clearHistory(): void;
```

## Module-level helpers

```typescript
/**
 * List supported models covering official endpoints plus OpenRouter and
 * SiliconFlow. Each entry carries (model, base_url, client) - mapping onto the
 * AutoLLMClient constructor (model, baseUrl, clientType) - plus input/output
 * modalities (Text/Image/Video/Audio/Embed), context_window, and
 * per-million-token pricing in the requested currency (official list prices,
 * converted at 7 CNY/USD).
 */
function listSupportedModels(currency?: "USD" | "CNY"): SupportedModel[];

/**
 * Convert messages saved before 0.5.0 to the `.done` item types; messages already
 * current are returned as they are. Removed in 0.6.0.
 */
function normalizeLegacyMessages(messages: UniMessage[]): UniMessage[];
```

## Errors

All MMSP errors subclass `MMSPError`. Unsupported `UniConfig` values (e.g.
`temperature` or `tool_choice` on models that reject them) throw
`UnsupportedParameterError`, which carries `client` and `parameter` fields. Thinking
levels never throw: every client maps each `ThinkingLevel` to the closest supported level.
Errors thrown while streaming (`ToolCallArgumentParseError`, `EmptyResponseError`,
`IncompleteStreamError`, `StreamProtocolError`) are listed in [Data models](data-models.md#errors).
