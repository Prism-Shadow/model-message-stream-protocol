# MMSP Python Implementation

This document demonstrates how to use `AutoLLMClient` for unified LLM interactions in MMSP.

## Building

```bash
make install  # Install dependencies
make build    # Build Python package
make lint     # Run ruff linter
make test     # Run tests
```

## AutoLLMClient Overview

`AutoLLMClient` is a stateful client that automatically routes requests to the appropriate model-specific implementation. It maintains conversation history and provides a unified interface for different LLM providers.

### Initialization

Create a client by specifying the model name:

```python
from mmsp import AutoLLMClient

# The official OpenAI client, named by the model id's family
client = AutoLLMClient(model="gpt-5.5")

# The same, spelled out, with the key given in code
client = AutoLLMClient(model="gpt-5.5", client_type="openai-official", api_key="your-openai-api-key")

# A compatible client, for any endpoint that serves OpenAI Chat Completions
client = AutoLLMClient(
    model="custom-model", client_type="openai-chat", base_url="http://127.0.0.1:8000/v1/", api_key="none"
)

# Gemini on Google Vertex AI: the google-genai client, with the service-account JSON key as the API key
client = AutoLLMClient(
    model="gemini-3.8-flash", client_type="google-genai", api_key=open("service-account.json").read()
)
```

`client_type` names one of the official clients (`openai-official`, `anthropic-official`, `gemini-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`) or one of the compatible clients (`openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `google-genai`, `mmsp`). It may be omitted for a model id that begins with a known family (`gpt-`, `text-embedding-`, `claude-`, `gemini-`, `glm-`, `kimi-`, `deepseek-`, `minimax-`), which names its official client; any other id raises and asks for one.

`gemini-official` speaks the Gemini API's Interactions endpoint. `google-genai` speaks generateContent, as the `google-genai` SDK does, for Vertex AI (a service-account JSON key as the API key), the Gemini API, and gateways that proxy it; Vertex AI's Interactions endpoint serves none of the Gemini models, so a service-account key needs `google-genai`.

`mmsp` speaks MMSP itself to an MMSP server (`python -m mmsp.integration.server --config <file>`), with the key and endpoint of `MMSP_API_KEY` and `MMSP_BASE_URL`, by default `http://127.0.0.1:25752/v1`.

## Core Methods

### streaming_response

Stateless method that requires passing the full message history on each call:

```python
import asyncio
from mmsp import AutoLLMClient


async def main():
    client = AutoLLMClient(model="gpt-5.5")

    async for event in client.streaming_response(
        messages=[{"role": "user", "content_items": [{"type": "text.done", "text": "Hello!"}]}], config={}
    ):
        print(event)


asyncio.run(main())
```

Both streaming methods yield `delta` events, each carrying exactly one content item, then exactly one `stop` event, always last, carrying `usage_metadata` and `finish_reason`. Each item streams as one or more `.delta` fragments (`text.delta`, `tool_call.delta`, …) followed by its complete `.done` item (`text.done`, `tool_call.done`, …); items never interleave.

### streaming_response_stateful

Stateful method that maintains conversation history internally:

```python
import asyncio
from mmsp import AutoLLMClient


async def main():
    client = AutoLLMClient(model="gpt-5.5")

    # First message
    async for event in client.streaming_response_stateful(
        message={"role": "user", "content_items": [{"type": "text.done", "text": "My name is Alice"}]}, config={}
    ):
        print(event)

    # Second message - history is maintained automatically
    async for event in client.streaming_response_stateful(
        message={"role": "user", "content_items": [{"type": "text.done", "text": "What's my name?"}]}, config={}
    ):
        print(event)


asyncio.run(main())
```

### get_history

Retrieve the conversation history:

```python
# Get all messages in the conversation
history = client.get_history()
print(f"Total messages: {len(history)}")

for msg in history:
    print(f"Role: {msg['role']}")
    print(f"Content: {msg['content_items']}")
```

### clear_history

Clear the conversation history:

```python
# Clear all conversation history
client.clear_history()

# Verify history is empty
assert len(client.get_history()) == 0
```

### set_history

Replace the conversation history with a copy of the provided list:

```python
# Save current history
saved_history = client.get_history()

# ... do other things, then restore
client.set_history(saved_history)

# Verify history was replaced
assert len(client.get_history()) == len(saved_history)
```

## Tool Calling

When using tools, you must handle `tool_call_id` correctly:

```python
import asyncio
import json
from mmsp import AutoLLMClient


def get_weather(location: str) -> str:
    """Mock function to get weather."""
    return f"Temperature in {location}: 22°C"


async def main():
    # Define tool
    weather_function = {
        "name": "get_weather",
        "description": "Gets the current weather for a given location.",
        "parameters": {
            "type": "object",
            "properties": {"location": {"type": "string", "description": "The city name"}},
            "required": ["location"],
        },
    }

    client = AutoLLMClient(model="gpt-5.5")
    config = {"tools": [weather_function]}

    # User asks about weather
    events = []
    async for event in client.streaming_response_stateful(
        message={"role": "user", "content_items": [{"type": "text.done", "text": "What's the weather in London?"}]},
        config=config,
    ):
        events.append(event)

    # Read the complete call from its tool_call.done item; tool_call.delta items are fragments
    tool_call = None
    for event in events:
        for item in event["content_items"]:
            if item["type"] == "tool_call.done":
                tool_call = item
                break

        if tool_call:
            break

    # Execute function and send result back with tool_call_id
    if tool_call:
        result = get_weather(**tool_call["arguments"])

        # IMPORTANT: Include tool_call_id in the tool response
        async for event in client.streaming_response_stateful(
            message={
                "role": "user",
                "content_items": [
                    {
                        "type": "tool_result.done",
                        "text": result,
                        "tool_call_id": tool_call["tool_call_id"],  # Required for tool responses
                    }
                ],
            },
            config=config,
        ):
            print(event)


asyncio.run(main())
```

## Message Format

### UniMessage Structure

```python
{
    "role": "user" | "assistant",
    "content_items": [
        {"type": "text.done", "text": "Hello"},
        {"type": "image_url.done", "image_url": "https://..."},
        {
            "type": "tool_call.done",
            "name": "get_weather",
            "arguments": {"location": "London"},
            "tool_call_id": "call_abc123",
        },
    ],
}
```

Messages hold complete items only, typed with a `.done` suffix. Item types without the suffix, saved before 0.5.0, are still accepted with a deprecation warning until 0.6.0; `normalize_legacy_messages(messages)` converts stored messages.

### Tool Response with tool_call_id

When responding to a tool call, include the `tool_call_id` in the result content item:

```python
{
    "role": "user",
    "content_items": [
        {
            "type": "tool_result.done",
            "text": "London is 22°C today.",
            "tool_call_id": "call_abc123",  # From the tool_call.done item
        }
    ],
}
```

## Configuration Options

```python
from mmsp import PromptCaching, ThinkingLevel

config = {
    "max_tokens": 500,
    "temperature": 1.0,
    "tools": [tool_definition],
    "thinking_summary": True,
    "thinking_level": ThinkingLevel.HIGH,
    "tool_choice": "auto",  # "auto", "required", "none", or ["tool_name"]
    "system_prompt": "You are a helpful assistant",
    "prompt_caching": PromptCaching.ENABLE,
    "trace_id": "agent1/conversation_001",  # Optional: save conversation trace
}
```

## Conversation Tracing

MMSP provides a built-in `Tracer` to save and browse conversation history. When you specify a `trace_id` in the config, conversations are automatically saved to both JSON and TXT formats.

### Basic Usage

```python
from mmsp import AutoLLMClient

client = AutoLLMClient(model="gpt-5.5")

# Add trace_id to config
config = {"trace_id": "agent1/conversation_001"}

async for event in client.streaming_response_stateful(
    message={"role": "user", "content_items": [{"type": "text.done", "text": "Hello"}]}, config=config
):
    pass  # Conversation is automatically saved
```

The default cache directory is `cache`, you can change it by setting `MMSP_CACHE_DIR` environment variable.

This creates two files in the `cache` directory:
- `cache/agent1/conversation_001.json` - Structured data with full history and config
- `cache/agent1/conversation_001.txt` - Human-readable conversation format

### Browsing Traces with Web Interface

Start a web server to browse and view saved conversations:

```python
from mmsp.integration.tracer import Tracer

# Start web server
Tracer("path/to/cache").start_web_server(host="127.0.0.1", port=25750)
```

Or use the CLI:

```bash
python -m mmsp.integration.tracer --cache_dir ./cache --host 127.0.0.1 --port 25750
```

Then visit `http://127.0.0.1:25750` in your browser to browse saved conversations.

### Test with Playground

Start a web server to test with the playground:

```python
from mmsp.integration.playground import start_playground_server

start_playground_server()
```

Or use the CLI:

```bash
python -m mmsp.integration.playground --host 127.0.0.1 --port 25751
```

Then visit `http://127.0.0.1:25751` in your browser to test with the playground.
The integrated tracer is available at `http://127.0.0.1:25751/tracer/`.
