---
description: 每个 agent 在 MMSP 上运行的那个循环，以及它的一份四十行的完整实现。
---

agent 就是一个循环。模型读取对话，然后要么回答，要么请求工具；你的代码运行工具，把结果送回去，模型再读一次。当某次响应不带任何工具调用时，循环结束。

MMSP 让这个循环在每家提供商上都是同一个形状。工具调用以 `tool_call.done` 项到达，结果以 `tool_result.done` 项送回，中间的对话由有状态客户端保存，思考和 fidelity 都在内。

## 循环

```text
用户消息
    │
    ▼
┌─► streaming_response_stateful(message, config)
│       delta 事件，然后是 stop 事件
│
│   响应里有 tool_call.done 项吗？
│       没有 ─► text.done 项就是回答
│       有   ─► 运行每个工具
│               message = 每个调用对应一个 tool_result.done
└───────────────┘
```

每次迭代是一次请求。有状态调用在产出 `stop` 事件之前就记录了助手轮次，所以下一次迭代只需发送新消息。

## 一份完整实现

模型可能在一个轮次里请求多个工具。全部运行，把所有结果放在一条消息里送回，每个结果带上它对应调用的 `tool_call_id`。

<div class="code-group">

```python
import asyncio
from mmsp import AutoLLMClient


def get_weather(location: str) -> str:
    return f"Temperature in {location}: 22 C"


TOOLS = {"get_weather": get_weather}
CONFIG = {
    "tools": [
        {
            "name": "get_weather",
            "description": "Gets the current weather for a given location.",
            "parameters": {
                "type": "object",
                "properties": {"location": {"type": "string", "description": "The city name"}},
                "required": ["location"],
            },
        }
    ]
}
MAX_TURNS = 10


def run_tool(call: dict) -> str:
    tool = TOOLS.get(call["name"])
    if tool is None:
        return f"Unknown tool: {call['name']}"
    try:
        return tool(**call["arguments"])
    except Exception as error:  # 模型读到失败，自己决定怎么办
        return f"Error: {error}"


async def run_agent(client: AutoLLMClient, text: str) -> str:
    message = {"role": "user", "content_items": [{"type": "text.done", "text": text}]}
    for _ in range(MAX_TURNS):
        answer, calls = [], []
        async for event in client.streaming_response_stateful(message=message, config=CONFIG):
            for item in event["content_items"]:
                if item["type"] == "text.delta":
                    print(item["text"], end="", flush=True)
                elif item["type"] == "text.done":
                    answer.append(item["text"])
                elif item["type"] == "tool_call.done":
                    calls.append(item)
        if not calls:
            return "".join(answer)
        message = {
            "role": "user",
            "content_items": [
                {"type": "tool_result.done", "text": run_tool(call), "tool_call_id": call["tool_call_id"]}
                for call in calls
            ],
        }
    raise RuntimeError(f"no answer after {MAX_TURNS} turns")


async def main():
    client = AutoLLMClient(model="gpt-5.5")
    print(await run_agent(client, "What's the weather in London and in Paris?"))


asyncio.run(main())
```

```typescript
import { AutoLLMClient, ToolCallDoneItem, UniMessage } from "@prismshadow/mmsp";

const TOOLS: Record<string, (args: Record<string, any>) => string> = {
  get_weather: (args) => `Temperature in ${args.location}: 22 C`,
};
const CONFIG = {
  tools: [
    {
      name: "get_weather",
      description: "Gets the current weather for a given location.",
      parameters: {
        type: "object" as const,
        properties: { location: { type: "string" as const, description: "The city name" } },
        required: ["location"],
      },
    },
  ],
};
const MAX_TURNS = 10;

function runTool(call: ToolCallDoneItem): string {
  const tool = TOOLS[call.name];
  if (!tool) return `Unknown tool: ${call.name}`;
  try {
    return tool(call.arguments);
  } catch (error) {
    // 模型读到失败，自己决定怎么办
    return `Error: ${error}`;
  }
}

async function runAgent(client: AutoLLMClient, text: string): Promise<string> {
  let message: UniMessage = { role: "user", content_items: [{ type: "text.done", text }] };
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const answer: string[] = [];
    const calls: ToolCallDoneItem[] = [];
    for await (const event of client.streamingResponseStateful({ message, config: CONFIG })) {
      for (const item of event.content_items) {
        if (item.type === "text.delta") process.stdout.write(item.text);
        else if (item.type === "text.done") answer.push(item.text);
        else if (item.type === "tool_call.done") calls.push(item);
      }
    }
    if (calls.length === 0) return answer.join("");
    message = {
      role: "user",
      content_items: calls.map((call) => ({
        type: "tool_result.done",
        text: runTool(call),
        tool_call_id: call.tool_call_id,
      })),
    };
  }
  throw new Error(`no answer after ${MAX_TURNS} turns`);
}

const client = new AutoLLMClient({ model: "gpt-5.5" });
console.log(await runAgent(client, "What's the weather in London and in Paris?"));
```

</div>

把模型 id 换成 `claude-opus-5`、`gemini-3.8-flash` 或 `deepseek-v4-pro`，循环一字不改照样运行。

## 循环依赖的几件事

- **工具调用是完整到达的。** `tool_call.done` 带有名字、id 和解析好的参数。它之前的 `tool_call.delta` 项只是片段，除了展示进度之外别无他用。
- **结果按 id 匹配。** 每个 `tool_result.done` 带有它对应调用的 `tool_call_id`。多个结果放在一条消息里，顺序不限。
- **历史替你保存。** 有状态调用记录助手轮次，思考和 `fidelity` 都在内，所以在工具调用之间思考的模型能接着同一个轮次继续。想自己保存历史，就用 `streaming_response` 并传完整的消息列表。
- **失败的工具也是一个结果。** 把错误作为结果文本返回；模型读到它，会重试、问用户，或者放弃。绝不要用不完整的参数运行工具：参数无法解析时，MMSP 会在原本该出现 `tool_call.done` 的位置抛出 `ToolCallArgumentParseError`。
- **stop 事件收尾每个轮次。** 它恰好出现一次，在最后，带有用量和结束原因。请求了工具的轮次以 `"tool_call"` 结束；上面的循环不需要检查它，因为调用本身就决定了走向。
- **给循环设上限。** 模型可以无止境地调用工具。限制轮数，触及上限时把循环已经做的事交给用户。

## 追踪循环

在配置里设置 `trace_id`，每次迭代都会连同历史保存到磁盘，由 [tracer](/zh/docs/tracing/) 展示。
