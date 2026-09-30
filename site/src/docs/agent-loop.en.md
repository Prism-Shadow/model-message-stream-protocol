---
description: The loop every agent runs on MMSP, and a complete implementation of it in forty lines.
---

An agent is a loop. The model reads the conversation and either answers or asks for tools; your code runs the tools, sends the results back, and the model reads again. The loop ends when a response carries no tool call.

MMSP gives the loop one shape for every provider. A tool call arrives as a `tool_call.done` item, a result goes back as a `tool_result.done` item, and the stateful client keeps the conversation in between, thinking and fidelity included.

## The loop

<div class="loop-diagram" role="img" aria-label="The agent loop: send the message, read the stream, run the tool calls, send the results back, and around again; a response without a tool call is the answer">
<div class="loop-grid">
<div class="loop-node"><span class="n">1</span><b>Send the message</b><p><code>streaming_response_stateful(message, config)</code>, with the tools in the config.</p></div>
<div class="loop-arrow"><svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h26M22 2l6 6-6 6"/></svg></div>
<div class="loop-node is-main"><span class="n">2</span><b>Read the stream</b><p><code>delta</code> events, then the <code>stop</code> event. Collect the <code>text.done</code> and <code>tool_call.done</code> items.</p></div>
<div class="loop-arrow"><span class="tag">no tool call</span><svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h26M22 2l6 6-6 6"/></svg></div>
<div class="loop-end"><b>The answer</b><p>The <code>text.done</code> items are the reply. The loop ends.</p></div>
<div class="loop-arrow v"><span class="tag">next turn</span><svg viewBox="0 0 16 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 30V4M2 10l6-6 6 6"/></svg></div>
<div></div>
<div class="loop-arrow v"><span class="tag">tool calls</span><svg viewBox="0 0 16 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v26M2 22l6 6 6-6"/></svg></div>
<div></div>
<div></div>
<div class="loop-node"><span class="n">4</span><b>Send the results</b><p>One <code>tool_result.done</code> per call, with its <code>tool_call_id</code>, in one message.</p></div>
<div class="loop-arrow"><svg viewBox="0 0 32 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M30 8H4M10 2L4 8l6 6"/></svg></div>
<div class="loop-node"><span class="n">3</span><b>Run the tools</b><p>One run per <code>tool_call.done</code>, from its parsed <code>arguments</code>. A failure is a result too.</p></div>
<div></div>
<div></div>
</div>
</div>

Every iteration is one request. The stateful call records the assistant turn before it yields the `stop` event, so the next iteration only sends the new message.

## A complete implementation

The model may ask for several tools in one turn. Run them all, and send every result in one message, each with the `tool_call_id` of its call.

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
    except Exception as error:  # the model reads the failure and decides what to do
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
    // the model reads the failure and decides what to do
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

Change the model id to `claude-opus-5`, `gemini-3.8-flash` or `deepseek-v4-pro` and the loop runs unchanged.

## What the loop relies on

- **Tool calls come complete.** `tool_call.done` carries the name, the id and the parsed arguments. The `tool_call.delta` items before it are fragments, good for showing progress and nothing else.
- **Results are matched by id.** Every `tool_result.done` carries the `tool_call_id` of its call. Several results go in one message, in any order.
- **The history is kept for you.** The stateful call records the assistant turn, thinking and `fidelity` included, so a model that thinks between tool calls continues the same turn. Keep the history yourself with `streaming_response` and the whole message list instead.
- **A failed tool is a result.** Return the error as the result text; the model reads it and retries, asks the user, or gives up. Never run a tool from partial arguments: when the arguments do not parse, MMSP raises `ToolCallArgumentParseError` in place of the `tool_call.done`.
- **The stop event closes every turn.** It arrives exactly once, last, with the usage and the finish reason. A turn that asked for tools finishes with `"tool_call"`; the loop above needs no such check, since the calls themselves decide.
- **Bound the loop.** A model can call tools forever. Cap the turns, and pass what the loop did on to the user when the cap is hit.

## Tracing the loop

Set `trace_id` in the config and every iteration is saved to disk, history and all, for the [tracer](/docs/tracing/) to show.
