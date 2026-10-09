# MMSP TypeScript Implementation

This directory contains the TypeScript implementation of MMSP, mirroring the Python implementation in `src_py/`.

## Building

```bash
make install  # Install dependencies
make build    # Build TypeScript to JavaScript
make lint     # Run ESLint
make test     # Run tests
```

## Usage

### Basic Client Usage

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

process.env.OPENAI_API_KEY = "your-openai-api-key";

async function main() {
  // The official OpenAI client, named by the model id's family
  const client = new AutoLLMClient({ model: "gpt-5.5" });
  // The same, spelled out, with the key given in code:
  // const client = new AutoLLMClient({ model: "gpt-5.5", clientType: "openai-official", apiKey: "your-openai-api-key" });
  // A compatible client, for any endpoint that serves OpenAI Chat Completions:
  // const client = new AutoLLMClient({ model: "custom-model", clientType: "openai-chat", baseUrl: "http://127.0.0.1:8000/v1/", apiKey: "none" });
  // For Gemini on Google Vertex AI, the google-genai client, with the service-account JSON key as the API key:
  // const client = new AutoLLMClient({ model: "gemini-3.8-flash", clientType: "google-genai", apiKey: fs.readFileSync("service-account.json", "utf8") });

  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [{ type: "text.done", text: "Hello!" }],
    },
    config: {},
  })) {
    console.log(event);
  }
}

main().catch(console.error);
```

`clientType` names one of the official clients (`openai-official`, `anthropic-official`, `google-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) or one of the compatible clients (`openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai`, `mmsp`). It may be omitted for a model id that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`), which names its official client; any other id throws and asks for one.

`google-official` speaks the Gemini API's Interactions endpoint. `google-genai` speaks generateContent, as the `@google/genai` SDK does, for Vertex AI (a service-account JSON key as the API key), the Gemini API, and gateways that proxy it; Vertex AI's Interactions endpoint serves none of the Gemini models, so a service-account key needs `google-genai`.

`mmsp` speaks MMSP itself to an MMSP server (`npm run server -- --config <file>`), with the key and endpoint of `MMSP_API_KEY` and `MMSP_BASE_URL`, by default `http://127.0.0.1:25752/v1`.

Both streaming methods yield `delta` events, each carrying exactly one content item, then exactly one `stop` event, always last, carrying `usage_metadata` and `finish_reason`. Each item streams as one or more `.delta` fragments (`text.delta`, `tool_call.delta`, …) followed by its complete `.done` item (`text.done`, `tool_call.done`, …); items never interleave.

### History Management

```typescript
// Get current history
const history = client.getHistory();

// Clear all history
client.clearHistory();

// Replace history with a saved copy
client.setHistory(history);
```

Messages hold complete items only, typed with a `.done` suffix. Item types without the suffix, saved before 0.5.0, are still accepted with a deprecation warning until 0.6.0; `normalizeLegacyMessages(messages)` converts stored messages.

### Tracer Usage

Save and browse conversation history with a web interface:

```typescript
import { Tracer } from "@prismshadow/mmsp/integration/tracer";

// Create a tracer instance
const tracer = new Tracer("./cache");

// Save conversation history
const model = "gpt-5.5";
const history = [
  { role: "user", content_items: [{ type: "text.done", text: "Hello!" }] },
  {
    role: "assistant",
    content_items: [{ type: "text.done", text: "Hi there!" }],
  },
];
const config = {};
tracer.saveHistory(model, history, "session/conv_001", config);

// Start web server to view saved conversations
tracer.startWebServer("127.0.0.1", 25750);
// Open http://127.0.0.1:25750 in your browser
```

### Playground Usage

Interactive web interface for chatting with LLMs:

```typescript
import { startPlaygroundServer } from "@prismshadow/mmsp/integration/playground";

// Start the playground server
startPlaygroundServer("127.0.0.1", 25751);
// Open http://127.0.0.1:25751 in your browser
// Open http://127.0.0.1:25751/tracer/ to browse traces
```

## Examples

Run the examples:

```bash
# Build the project
npm run build

# Run tracer example
npm run tracer

# Run playground example
npm run playground
```
