---
description: 安装 MMSP，流式输出第一条响应，然后让模型调用一个工具。
---

## 安装

<div class="code-group" data-labels="Python,TypeScript">

```bash
pip install mmsp
```

```bash
npm install @prismshadow/mmsp
```

</div>

Python 包需要 Python 3.11 或更新版本。`uv add mmsp` 同样可用。

## 设置 API key

MMSP 从环境变量读取提供商的 key：`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`GEMINI_API_KEY`、`DEEPSEEK_API_KEY`、`MOONSHOT_API_KEY`、`ZAI_API_KEY` 或 `MINIMAX_API_KEY`。你也可以把 `api_key` 和 `base_url` 直接传给客户端。完整列表见[模型与端点](/zh/docs/models/)。

## 流式输出一条响应

<div class="code-group">

```python
import asyncio
from mmsp import AutoLLMClient

async def main():
    client = AutoLLMClient(model="gpt-5.6-sol")
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

const client = new AutoLLMClient({ model: "gpt-5.6-sol" });
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

这条流会打印四个片段、一段完整文本，然后是结束它的那一个事件：

```json
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "Hello"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": ","}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": " World"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.done", "text": "Hello, World!"}], "usage_metadata": null, "finish_reason": null}
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 12, "thoughts_tokens": 0, "response_tokens": 8}, "finish_reason": "stop"}
```

把模型 id 换成 `claude-opus-5` 或 `gemini-3.8-flash`，同样的代码打印出同样的形状。

## 调用一个工具

模型用一个 `tool_call.done` 项来请求工具。运行工具，然后带着同一个 `tool_call_id` 把结果送回去。

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

## agent 循环的规则

- 从 `tool_call.done` 项读取工具调用。`tool_call.delta` 项只是参数的片段，除了展示进度之外别无他用。
- 每个工具结果都要带上对应 `tool_call.done` 的那个 `tool_call_id`，一字不差。
- 从 `stop` 事件读取用量和结束原因。它永远是最后一个事件，且只出现一次。
- 保持 `thinking.done` 项和每一个 `fidelity` 字段原样不动。有状态调用会替你做到这一点。
- 当某次调用的参数无法解析时，MMSP 会在原本该出现 `tool_call.done` 的位置抛出 `ToolCallArgumentParseError`。重试或重新提示模型；绝不要用不完整的参数运行工具。
