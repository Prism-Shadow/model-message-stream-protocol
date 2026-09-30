---
description: 安装 MMSP，流式输出第一条响应，然后让模型调用一个工具。
---

## 安装

<div class="code-group" data-labels="TypeScript,Python">

```bash
npm install @prismshadow/mmsp
```

```bash
pip install mmsp
```

</div>

<div data-code-lang="TypeScript">

TypeScript 包需要 Node.js 20 或更高版本。

</div>

<div data-code-lang="Python">

Python 包需要 Python 3.11 或更高版本。`uv add mmsp` 同样可用。

</div>

## 设置 API key

MMSP 从环境变量读取服务商的 API key，支持 `ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY`、`DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY`、`ZAI_API_KEY` 和 `MINIMAX_API_KEY`。你也可以在创建客户端时直接传入 `api_key` 和 `base_url`。下面的例子用的模型 id 能自行选出官方客户端；所有客户端和模型见[模型与端点](/zh/docs/models/)。

## 流式输出响应

<div class="code-group">

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

</div>

流式输出会依次打印四个文本片段、一个完整文本，最后是一个结束事件：

```json
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "Hello"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": ","}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": " World"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.done", "text": "Hello, World!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 12, "thoughts_tokens": 0, "response_tokens": 8}, "finish_reason": "stop"}
```

将模型 id 改为 `claude-opus-5-5` 或 `gemini-3.8-flash`，同样的代码会输出相同结构的事件。

## 调用工具

模型通过 `tool_call.done` 内容项请求工具。你需要运行该工具，并使用相同的 `tool_call_id` 将结果返回。

<div class="code-group">

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

</div>

## Agent 循环规则

[Agent 循环](/zh/docs/agent-loop/)文档将这些规则整合为一份完整实现。

- 从 `tool_call.done` 项读取工具调用。`tool_call.delta` 项只是参数的片段，仅用于展示进度。
- 返回工具结果时，必须使用对应 `tool_call.done` 中完全相同的 `tool_call_id`。
- 用量和结束原因从 `stop` 事件读取。该事件总是最后一个，且只出现一次。
- 保持 `thinking.done` 项和所有 `fidelity` 字段不变。有状态调用会自动处理。
- 当工具调用的参数无法解析时，MMSP 会抛出 `ToolCallArgumentParseError` 而非返回 `tool_call.done`。此时应重试或重新提示，切勿使用不完整的参数运行工具。
