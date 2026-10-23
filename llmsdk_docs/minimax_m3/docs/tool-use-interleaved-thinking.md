> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimax.io/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Tool Use & Interleaved Thinking

> MiniMax-M3.1-Flash is an Agentic Model with exceptional Tool Use capabilities.

MiniMax-M3.1-Flash natively supports Interleaved Thinking, enabling it to reason between each round of tool interactions. Before every Tool Use, the model reflects on the current environment and the tool outputs to decide its next action.

<img src="https://filecdn.minimax.chat/public/4f4b43c1-f0a5-416a-8770-1a4f80feeb1e.png" />

This ability allows the model to excel at long-horizon and complex tasks, achieving state-of-the-art (SOTA) results on benchmarks such as SWE, BrowseCamp, and xBench, which test both coding and agentic reasoning performance.

In the following examples, we’ll illustrate best practices for Tool Use and Interleaved Thinking with MiniMax-M3.1-Flash. The key principle is to return the model’s full response each time—especially the thinking fields (`thinking` / `reasoning_content`).

## Parameters

### Request Parameters

* `tools`: Defines the list of callable functions, including function names, descriptions, and parameter schemas

### Response Parameters

Key fields in Tool Use responses:

* `thinking` / `reasoning_content`: The model's thinking/reasoning process
* `text` / `content`: The text content output by the model
* `tool_use` / `tool_calls`: The tool calls the model has decided to make
* `name` / `function.name`: The name of the function being called
* `input` / `function.arguments`: Function call parameters (a JSON string in the OpenAI format)
* `id`: Unique identifier for the tool call

<Note>
  MiniMax-M3.1-Flash thinks on demand: for simple tool calls, the model may call the tool directly without producing thinking content, in which case that turn has no `thinking` block or `reasoning_content` field. Check whether the field exists before reading it, and always append the full returned message to the history whether or not it contains thinking.
</Note>

## Important Note

In multi-turn function call conversations, the complete model response (i.e., the assistant message) must be appended to the conversation history to maintain the continuity of the reasoning chain.

**OpenAI SDK:**

* Append the full `response_message` object (including the `reasoning_content` and `tool_calls` fields) to the message history
* The model's thinking is returned in the `reasoning_content` field and must be kept when passing the message back

**Anthropic SDK:**

* Append the full `response.content` list to the message history (includes all content blocks: thinking/text/tool\_use)

See examples below for implementation details.

## Examples

### Anthropic SDK

#### Configure Environment Variables

```bash theme={null}
export ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
export ANTHROPIC_API_KEY=${YOUR_API_KEY}
```

#### Example

```python theme={null}
import anthropic
import json

# Initialize client
client = anthropic.Anthropic()

# Define tool: weather query
tools = [
    {
        "name": "get_weather",
        "description": "Get weather of a location, the user should supply a location first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, US",
                }
            },
            "required": ["location"]
        }
    }
]

def send_messages(messages):
    params = {
        "model": "MiniMax-M3.1-Flash",
        "max_tokens": 4096,
        "messages": messages,
        "tools": tools,
    }

    response = client.messages.create(**params)
    return response

def process_response(response):
    thinking_blocks = []
    text_blocks = []
    tool_use_blocks = []

    # Iterate through all content blocks
    for block in response.content:
        if block.type == "thinking":
            thinking_blocks.append(block)
            print(f"💭 Thinking>\n{block.thinking}\n")
        elif block.type == "text":
            text_blocks.append(block)
            print(f"💬 Model>\t{block.text}")
        elif block.type == "tool_use":
            tool_use_blocks.append(block)
            print(f"🔧 Tool>\t{block.name}({json.dumps(block.input, ensure_ascii=False)})")

    return thinking_blocks, text_blocks, tool_use_blocks

# 1. User query
messages = [{"role": "user", "content": "How's the weather in San Francisco?"}]
print(f"\n👤 User>\t {messages[0]['content']}")

# 2. Model returns first response (may include tool calls)
response = send_messages(messages)
thinking_blocks, text_blocks, tool_use_blocks = process_response(response)

# 3. If tool calls exist, execute tools and continue conversation
if tool_use_blocks:
    # ⚠️ Critical: Append the assistant's complete response to message history
    # response.content contains a list of all blocks: [thinking block, text block, tool_use block]
    # Must be fully preserved, otherwise subsequent conversation will lose context
    messages.append({
        "role": "assistant",
        "content": response.content
    })

    # Execute tool and return result (simulating weather API call)
    print(f"\n🔨 Executing tool: {tool_use_blocks[0].name}")
    tool_result = "24℃, sunny"
    print(f"📊 Tool result: {tool_result}")

    # Add tool execution result
    messages.append({
        "role": "user",
        "content": [
            {
                "type": "tool_result",
                "tool_use_id": tool_use_blocks[0].id,
                "content": tool_result
            }
        ]
    })

    # 4. Get final response
    final_response = send_messages(messages)
    process_response(final_response)
```

**Output:**

```nushell theme={null}
👤 User>	 How's the weather in San Francisco?
💬 Model>	I'll check that for you.
🔧 Tool>	get_weather({"location": "San Francisco, US"})

🔨 Executing tool: get_weather
📊 Tool result: 24℃, sunny
💭 Thinking>
The user asked about the weather in San Francisco. The tool returned 24°C, sunny. Let me just report this. Simple answer.

💬 Model>	It's a pleasant day in San Francisco — currently **24°C (75°F) and sunny**. Great conditions to be outside!
```

**Response of the first request**

```json theme={null}
{
    "id": "0722aa34c63ce29f90ac9051ece69b22",
    "type": "message",
    "role": "assistant",
    "model": "MiniMax-M3.1-Flash",
    "content": [
        {
            "text": "I'll check that for you.",
            "type": "text"
        },
        {
            "type": "tool_use",
            "id": "call_function_a5g4we9cji7p_1",
            "name": "get_weather",
            "input": {
                "location": "San Francisco, US"
            }
        }
    ],
    "usage": {
        "input_tokens": 280,
        "output_tokens": 37,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 188
    },
    "stop_reason": "tool_use",
    "base_resp": {
        "status_code": 0,
        "status_msg": ""
    }
}
```

### OpenAI SDK

#### Configure Environment Variables

```bash theme={null}
export OPENAI_BASE_URL=https://api.minimax.io/v1
export OPENAI_API_KEY=${YOUR_API_KEY}
```

#### Example

When calling MiniMax-M3.1-Flash via the OpenAI SDK, the thinking content is returned in the `reasoning_content` field and can be displayed directly.

<Note>
  Important: To ensure that Interleaved Thinking works properly and the model’s chain of thought remains uninterrupted, the entire `response_message`, including `reasoning_content`, must be kept in the message history and passed back to the model in the next request. This is essential for achieving the model’s best performance.
</Note>

Pay attention to how the `send_messages` function makes the request and parses the response, and to how the history is appended with `messages.append(response_message)`:

```python theme={null}
import json

from openai import OpenAI

client = OpenAI()

# Define tool: weather query
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather of a location, the user should supply a location first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, US",
                    }
                },
                "required": ["location"],
            },
        },
    },
]


def send_messages(messages):
    """Send messages and return response"""
    response = client.chat.completions.create(
        model="MiniMax-M3.1-Flash",
        messages=messages,
        tools=tools,
    )
    return response.choices[0].message


# 1. User query
messages = [{"role": "user", "content": "How's the weather in San Francisco?"}]
print(f"👤 User>\t {messages[0]['content']}")

# 2. Model returns tool call
response_message = send_messages(messages)

if response_message.tool_calls:
    tool_call = response_message.tool_calls[0]
    function_args = json.loads(tool_call.function.arguments)
    if getattr(response_message, "reasoning_content", None):
        print(f"💭 Thinking>\t {response_message.reasoning_content}")
    print(f"💬 Model>\t {response_message.content}")
    print(f"🔧 Tool>\t {tool_call.function.name}({function_args['location']})")

    # 3. Execute tool and return result
    # ⚠️ Critical: Append the complete response_message (including reasoning_content and tool_calls)
    messages.append(response_message)
    messages.append(
        {
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": "24℃, sunny",  # In production, call a real weather API here
        }
    )

    # 4. Get final response
    final_message = send_messages(messages)
    if getattr(final_message, "reasoning_content", None):
        print(f"💭 Thinking>\t {final_message.reasoning_content}")
    print(f"💬 Model>\t {final_message.content}")
else:
    print(f"💬 Model>\t {response_message.content}")
```

**Output:**

```
👤 User>	 How's the weather in San Francisco?
💬 Model>	 I'll check that for you.
🔧 Tool>	 get_weather(San Francisco, US)
💬 Model>	 The weather in San Francisco is currently **24°C (75°F) and sunny** — a pleasant day!
```

**Response of the first request**

```json theme={null}
{
    "id": "0722aa35f6b10a17627b07ff112caa6a",
    "choices": [
        {
            "finish_reason": "tool_calls",
            "index": 0,
            "message": {
                "content": "I'll check that for you.",
                "role": "assistant",
                "name": "MiniMax AI",
                "tool_calls": [
                    {
                        "id": "call_function_y7ipauye40nx_1",
                        "type": "function",
                        "function": {
                            "name": "get_weather",
                            "arguments": "{\"location\": \"San Francisco, US\"}"
                        },
                        "index": 0
                    }
                ],
                "audio_content": ""
            }
        }
    ],
    "created": 1792243509,
    "model": "MiniMax-M3.1-Flash",
    "object": "chat.completion",
    "usage": {
        "total_tokens": 505,
        "total_characters": 0,
        "prompt_tokens": 468,
        "completion_tokens": 37,
        "prompt_tokens_details": {
            "cached_tokens": 466
        }
    },
    "input_sensitive": false,
    "output_sensitive": false,
    "input_sensitive_type": 0,
    "output_sensitive_type": 0,
    "output_sensitive_int": 0,
    "base_resp": {
        "status_code": 0,
        "status_msg": ""
    }
}
```

## Recommended Reading

<Columns cols={2}>
  <Card title="MiniMax-M3.1-Flash for AI Coding Tools" icon="book-open" href="/docs/m-plan/openclaw" arrow="true" cta="Click here">
    MiniMax-M3.1-Flash excels at code understanding, dialogue, and reasoning.
  </Card>

  <Card title="Text Generation" icon="book-open" arrow="true" href="/docs/guides/text-generation" cta="Click here">
    Supports text generation via compatible Anthropic API and OpenAI API.
  </Card>

  <Card title="Compatible Anthropic API (Recommended)" icon="book-open" href="/docs/api-reference/text-anthropic-api" arrow="true" cta="Click here">
    Use Anthropic SDK with MiniMax models
  </Card>

  <Card title="Compatible OpenAI API" icon="book-open" href="/docs/api-reference/text-openai-api" arrow="true" cta="Click here">
    Use OpenAI SDK with MiniMax models
  </Card>
</Columns>
