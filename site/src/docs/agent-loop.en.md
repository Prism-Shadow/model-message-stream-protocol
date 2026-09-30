---
description: The loop every agent runs on MMSP, and a complete implementation of it in forty lines.
---

An agent is a loop. The model reads the conversation and either answers or asks for tools; your code runs the tools, sends the results back, and the model reads again. The loop ends when a response carries no tool call.

MMSP gives the loop one shape for every provider. A tool call arrives as a `tool_call.done` item, a result goes back as a `tool_result.done` item, and the stateful client keeps the conversation in between, thinking and fidelity included.

## The loop

<figure class="flowchart"><svg class="flowchart-svg" viewBox="0 0 560 492" role="img" aria-labelledby="loop-en-title"><title id="loop-en-title">The agent loop as a flowchart</title><defs><marker id="loop-en-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" class="fc-arrowhead"/></marker></defs><rect x="120" y="8" width="200" height="44" rx="22" class="fc-terminal"/><text x="220" y="35" class="fc-title" text-anchor="middle">User message</text><path d="M220 52V82" class="fc-edge" marker-end="url(#loop-en-arrow)"/><rect x="80" y="84" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="110" class="fc-title" text-anchor="middle">Stream a response</text><text x="220" y="131" class="fc-text" text-anchor="middle"><tspan class="fc-code">streaming_response_stateful()</tspan></text><path d="M220 146V172" class="fc-edge" marker-end="url(#loop-en-arrow)"/><path d="M220 174L350 236L220 298L90 236Z" class="fc-decision"/><text x="220" y="231" class="fc-title" text-anchor="middle">Any <tspan class="fc-code">tool_call.done</tspan></text><text x="220" y="251" class="fc-title" text-anchor="middle">in the response?</text><path d="M350 236H408" class="fc-edge" marker-end="url(#loop-en-arrow)"/><text x="379" y="228" class="fc-label" text-anchor="middle">No</text><rect x="410" y="210" width="140" height="52" rx="26" class="fc-terminal"/><text x="480" y="232" class="fc-title" text-anchor="middle">Answer</text><text x="480" y="250" class="fc-text" text-anchor="middle">the <tspan class="fc-code">text.done</tspan> items</text><path d="M220 298V328" class="fc-edge" marker-end="url(#loop-en-arrow)"/><text x="230" y="318" class="fc-label" text-anchor="start">Yes</text><rect x="80" y="330" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="356" class="fc-title" text-anchor="middle">Run each tool</text><text x="220" y="377" class="fc-text" text-anchor="middle">from its parsed <tspan class="fc-code">arguments</tspan></text><path d="M220 392V418" class="fc-edge" marker-end="url(#loop-en-arrow)"/><rect x="80" y="420" width="280" height="62" rx="6" class="fc-process"/><text x="220" y="446" class="fc-title" text-anchor="middle">Send the results</text><text x="220" y="467" class="fc-text" text-anchor="middle">one <tspan class="fc-code">tool_result.done</tspan> per call</text><path d="M80 451H36V115H78" class="fc-edge" fill="none" marker-end="url(#loop-en-arrow)"/><text x="28" y="283" class="fc-label" text-anchor="middle" transform="rotate(-90 28 283)">next turn</text></svg><ol class="flowchart-steps"><li>Send the user message with <code>streaming_response_stateful</code>, the tools in the config.</li><li>Read the stream: <code>delta</code> events, then the <code>stop</code> event.</li><li>If the response holds no <code>tool_call.done</code>, its <code>text.done</code> items are the answer, and the loop ends.</li><li>Otherwise run each tool from its parsed <code>arguments</code>.</li><li>Send the results in one message, one <code>tool_result.done</code> per call with its <code>tool_call_id</code>, and go back to step 2.</li></ol></figure>

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

Change the model id to `claude-opus-5-5`, `gemini-3.8-flash` or `deepseek-flash` and the loop runs unchanged.

## What the loop relies on

- **Tool calls come complete.** `tool_call.done` carries the name, the id and the parsed arguments. The `tool_call.delta` items before it are fragments, good for showing progress and nothing else.
- **Results are matched by id.** Every `tool_result.done` carries the `tool_call_id` of its call. Several results go in one message, in any order.
- **The history is kept for you.** The stateful call records the assistant turn, thinking and `fidelity` included, so a model that thinks between tool calls continues the same turn. Keep the history yourself with `streaming_response` and the whole message list instead.
- **A failed tool is a result.** Return the error as the result text; the model reads it and retries, asks the user, or gives up. Never run a tool from partial arguments: when the arguments do not parse, MMSP raises `ToolCallArgumentParseError` in place of the `tool_call.done`.
- **The stop event closes every turn.** It arrives exactly once, last, with the usage and the finish reason. A turn that asked for tools finishes with `"tool_call"`; the loop above needs no such check, since the calls themselves decide.
- **Bound the loop.** A model can call tools forever. Cap the turns, and pass what the loop did on to the user when the cap is hit.

## Tracing the loop

Set `trace_id` in the config and every iteration is saved to disk, history and all, for the [tracer](/docs/tracing/) to show.
