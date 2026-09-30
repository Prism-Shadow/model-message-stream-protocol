---
description: 每个 agent 在 MMSP 上运行的那个循环，以及它的一份四十行的完整实现。
---

agent 就是一个循环。模型读取对话，然后要么回答，要么请求工具；你的代码运行工具，把结果送回去，模型再读一次。当某次响应不带任何工具调用时，循环结束。

MMSP 让这个循环在每家服务商上都是同一个形状。工具调用以 `tool_call.done` 项到达，结果以 `tool_result.done` 项送回，中间的对话由有状态客户端保存，思考和 fidelity 都在内。

## 循环

<figure class="flowchart"><svg class="flowchart-svg" viewBox="0 0 560 492" role="img" aria-labelledby="loop-zh-title"><title id="loop-zh-title">agent 循环流程图</title><defs><marker id="loop-zh-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" class="fc-arrowhead"/></marker></defs><rect x="120" y="8" width="200" height="44" rx="22" class="fc-terminal"/><text x="220" y="35" class="fc-title" text-anchor="middle">用户消息</text><path d="M220 52V82" class="fc-edge" marker-end="url(#loop-zh-arrow)"/><rect x="80" y="84" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="110" class="fc-title" text-anchor="middle">流式获取一次响应</text><text x="220" y="131" class="fc-text" text-anchor="middle"><tspan class="fc-code">streaming_response_stateful()</tspan></text><path d="M220 146V172" class="fc-edge" marker-end="url(#loop-zh-arrow)"/><path d="M220 174L350 236L220 298L90 236Z" class="fc-decision"/><text x="220" y="231" class="fc-title" text-anchor="middle">响应里有</text><text x="220" y="251" class="fc-title" text-anchor="middle"><tspan class="fc-code">tool_call.done</tspan> 吗？</text><path d="M350 236H408" class="fc-edge" marker-end="url(#loop-zh-arrow)"/><text x="379" y="228" class="fc-label" text-anchor="middle">没有</text><rect x="410" y="210" width="140" height="52" rx="26" class="fc-terminal"/><text x="480" y="232" class="fc-title" text-anchor="middle">回答</text><text x="480" y="250" class="fc-text" text-anchor="middle">即 <tspan class="fc-code">text.done</tspan> 项</text><path d="M220 298V328" class="fc-edge" marker-end="url(#loop-zh-arrow)"/><text x="230" y="318" class="fc-label" text-anchor="start">有</text><rect x="80" y="330" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="356" class="fc-title" text-anchor="middle">逐个运行工具</text><text x="220" y="377" class="fc-text" text-anchor="middle">参数取自解析好的 <tspan class="fc-code">arguments</tspan></text><path d="M220 392V418" class="fc-edge" marker-end="url(#loop-zh-arrow)"/><rect x="80" y="420" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="446" class="fc-title" text-anchor="middle">送回结果</text><text x="220" y="467" class="fc-text" text-anchor="middle">每个调用一个 <tspan class="fc-code">tool_result.done</tspan></text><path d="M80 451H36V115H78" class="fc-edge" fill="none" marker-end="url(#loop-zh-arrow)"/><text x="22" y="266" class="fc-label" text-anchor="middle"><tspan x="22" dy="0">下</tspan><tspan x="22" dy="16">一</tspan><tspan x="22" dy="16">轮</tspan></text></svg><ol class="flowchart-steps"><li>用 <code>streaming_response_stateful</code> 发送用户消息，工具放在配置里。</li><li>读取流：先是 <code>delta</code> 事件，最后是 <code>stop</code> 事件。</li><li>响应里没有 <code>tool_call.done</code> 时，其中的 <code>text.done</code> 项就是回答，循环结束。</li><li>否则逐个运行工具，参数取自解析好的 <code>arguments</code>。</li><li>把结果放进一条消息送回，每个调用一个 <code>tool_result.done</code>，带上它的 <code>tool_call_id</code>，然后回到第 2 步。</li></ol></figure>

每次迭代是一次请求。有状态调用在产出 `stop` 事件之前就记录了助手轮次，所以下一次迭代只需发送新消息。

## 完整实现

模型可能在一个轮次里请求多个工具。全部运行，把所有结果放在一条消息里送回，每个结果带上它对应调用的 `tool_call_id`。

<div class="code-group">

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

</div>

把模型 id 换成 `claude-opus-5-5`、`gemini-3.8-flash` 或 `deepseek-flash`，循环一字不改照样运行。

## 循环依赖的几件事

- **工具调用是完整到达的。** `tool_call.done` 带有名字、id 和解析好的参数。它之前的 `tool_call.delta` 项只是片段，除了展示进度之外别无他用。
- **结果按 id 匹配。** 每个 `tool_result.done` 带有它对应调用的 `tool_call_id`。多个结果放在一条消息里，顺序不限。
- **历史替你保存。** 有状态调用记录助手轮次，思考和 `fidelity` 都在内，所以在工具调用之间思考的模型能接着同一个轮次继续。想自己保存历史，就用 `streaming_response` 并传完整的消息列表。
- **失败的工具也是一个结果。** 把错误作为结果文本返回；模型读到它，会重试、问用户，或者放弃。绝不要用不完整的参数运行工具：参数无法解析时，MMSP 会在原本该出现 `tool_call.done` 的位置抛出 `ToolCallArgumentParseError`。
- **stop 事件收尾每个轮次。** 它恰好出现一次，在最后，带有用量和结束原因。请求了工具的轮次以 `"tool_call"` 结束；上面的循环不需要检查它，因为调用本身就决定了走向。
- **给循环设上限。** 模型可以无止境地调用工具。限制轮数，触及上限时把循环已经做的事交给用户。

## 追踪循环

在配置里设置 `trace_id`，每次迭代都会连同历史保存到磁盘，由 [tracer](/zh/docs/tracing/) 展示。
