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

`clientType` is one of the official clients (`openai-official`, `anthropic-official`, `gemini-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) or one of the compatible clients (`openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai`). It may be omitted for a model id that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`); any other id throws and asks for one. See [Model selection](models.md).

A key goes only where it was given for. `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` are read from the environment by `openai-official`, `anthropic-official` and the compatible clients only together with `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` / `GEMINI_BASE_URL` (or the provider's own endpoint), so a `baseUrl` passed in needs an `apiKey` passed in with it, or the client raises at construction. The other official clients (`deepseek-official`, `zai-official`, `moonshot-official`, `minimax-official`, `gemini-official`) read their own variable whatever endpoint they are given.

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
`StreamProtocolError`) are listed in [Data models](data-models.md#errors).
