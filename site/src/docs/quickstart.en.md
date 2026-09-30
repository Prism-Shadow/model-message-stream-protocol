---
description: Install MMSP, stream a first response, then let the model call a tool.
---

## Install

<div class="code-group" data-labels="Python,TypeScript">

```bash
pip install mmsp
```

```bash
npm install @prismshadow/mmsp
```

</div>

The Python package needs Python 3.11 or newer. `uv add mmsp` works as well.

## Set the API key

MMSP reads the provider's key from the environment: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `ZAI_API_KEY` or `MINIMAX_API_KEY`. You can also pass `api_key` and `base_url` to the client. The examples below name a model whose id picks its official client; [Models and endpoints](/docs/models/) has every client and model.

## Stream a response

<div class="code-group">

```python
import asyncio
from mmsp import AutoLLMClient

async def main():
    client = AutoLLMClient(model="gpt-6.1-sol")
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "Say 'Hello, World!'"}],
        },
        config={},
    ):
        print(event)

asyncio.run(main())
```

```typescript
import { AutoLLMClient } from "@prismshadow/mmsp";

const client = new AutoLLMClient({ model: "gpt-6.1-sol" });
for await (const event of client.streamingResponseStateful({
  message: {
    role: "user",
    content_items: [{ type: "text.done", text: "Say 'Hello, World!'" }],
  },
  config: {},
})) {
  console.log(event);
}
```

</div>

The stream prints four fragments, the complete text, then the one event that ends it:

```json
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "Hello"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": ","}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": " World"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.done", "text": "Hello, World!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 12, "thoughts_tokens": 0, "response_tokens": 8}, "finish_reason": "stop"}
```

Change the model id to `claude-opus-5-5` or `gemini-3.8-flash` and the same code prints the same shapes.

## Call a tool

The model asks for a tool with a `tool_call.done` item. Run the tool, then send its result back with the same `tool_call_id`.

<div class="code-group">

```python
import asyncio
from mmsp import AutoLLMClient


def get_weather(location: str) -> str:
    return f"Temperature in {location}: 22 C"


TOOLS = {"get_weather": get_weather}

weather_tool = {
    "name": "get_weather",
    "description": "Gets the current weather for a given location.",
    "parameters": {
        "type": "object",
        "properties": {"location": {"type": "string", "description": "The city name"}},
        "required": ["location"],
    },
}


async def main():
    client = AutoLLMClient(model="gpt-5.5")
    config = {"tools": [weather_tool]}

    tool_call = None
    async for event in client.streaming_response_stateful(
        message={
            "role": "user",
            "content_items": [{"type": "text.done", "text": "What's the weather in London?"}],
        },
        config=config,
    ):
        for item in event["content_items"]:
            if item["type"] == "tool_call.done":
                tool_call = item

    if tool_call:
        result = TOOLS[tool_call["name"]](**tool_call["arguments"])
        async for event in client.streaming_response_stateful(
            message={
                "role": "user",
                "content_items": [
                    {
                        "type": "tool_result.done",
                        "text": result,
                        "tool_call_id": tool_call["tool_call_id"],
                    }
                ],
            },
            config=config,
        ):
            print(event)


asyncio.run(main())
```

```typescript
import { AutoLLMClient, ToolCallDoneItem } from "@prismshadow/mmsp";

const TOOLS: Record<string, (args: Record<string, any>) => string> = {
  get_weather: (args) => `Temperature in ${args.location}: 22 C`,
};

const weatherTool = {
  name: "get_weather",
  description: "Gets the current weather for a given location.",
  parameters: {
    type: "object" as const,
    properties: { location: { type: "string" as const, description: "The city name" } },
    required: ["location"],
  },
};

const client = new AutoLLMClient({ model: "gpt-5.5" });
const config = { tools: [weatherTool] };

let toolCall: ToolCallDoneItem | null = null;
for await (const event of client.streamingResponseStateful({
  message: {
    role: "user",
    content_items: [{ type: "text.done", text: "What's the weather in London?" }],
  },
  config,
})) {
  for (const item of event.content_items) {
    if (item.type === "tool_call.done") {
      toolCall = item;
    }
  }
}

if (toolCall) {
  const result = TOOLS[toolCall.name](toolCall.arguments);
  for await (const event of client.streamingResponseStateful({
    message: {
      role: "user",
      content_items: [
        { type: "tool_result.done", text: result, tool_call_id: toolCall.tool_call_id },
      ],
    },
    config,
  })) {
    console.log(event);
  }
}
```

</div>

## Rules for an agent loop

[The agent loop](/docs/agent-loop/) turns these into a complete implementation.

- Read tool calls from `tool_call.done` items. `tool_call.delta` items are fragments of the arguments, good for showing progress and nothing else.
- Send every tool result with the exact `tool_call_id` of its `tool_call.done`.
- Read the usage and the finish reason from the `stop` event. It is always the last event and arrives exactly once.
- Keep `thinking.done` items and every `fidelity` field as they arrived. The stateful call does this for you.
- When the arguments of a call do not parse, MMSP raises `ToolCallArgumentParseError` in place of the `tool_call.done`. Retry or re-prompt; never run a tool from partial arguments.
