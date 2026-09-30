---
description: What MMSP is, the three objects it is made of, and how a request travels through it.
---

MMSP, the Model Message Stream Protocol, is one message format and one streaming grammar for every model provider. It ships as a Python package and a TypeScript package that behave the same way.

Model APIs agree on the building blocks: messages, thinking, tool calls, streaming. They disagree on the encoding. Anthropic streams content blocks, OpenAI streams output items, Gemini streams steps, and Chat Completions streams chunks that name nothing. MMSP reads each of them on its own terms and hands your code one shape.

## Three objects

Everything you send and receive is one of three plain objects:

| Object | What it is |
| --- | --- |
| [`UniConfig`](/docs/configuration/) | The options of a request: tools, thinking level, system prompt, and the rest. |
| [`UniMessage`](/docs/messages/) | One message of the conversation, from the user or the assistant. It holds complete content items. |
| [`UniEvent`](/docs/streaming/) | One event of a streamed response. A stream is `delta` events closed by one `stop` event. |

They are dictionaries in Python and typed objects in TypeScript, with the same field names in both.

## How a request travels

1. You create an [`AutoLLMClient`](/docs/client/) with a model id. It picks the client that speaks that model's wire protocol.
2. You call a streaming method with messages and a config. The client translates both into the provider's request.
3. The provider streams its own events. The client turns each one into `UniEvent` fragments, and MMSP closes every item with its complete form.
4. The complete items, in order, are the assistant message. The stateful call records it in the client's history before it yields the last event.

Whatever the provider sent that your code does not need but the provider wants back, such as a thinking signature, travels with the item as [`fidelity`](/docs/fidelity/).

## Stateful or stateless

`streaming_response_stateful` takes the new message and keeps the history in the client. It is the one to use for agent loops: thinking and tool calls of earlier turns go back to the model exactly as they arrived.

`streaming_response` takes the whole message list every time and keeps nothing. Use it when you store the conversation yourself.

## Where to go next

- [Quickstart](/docs/quickstart/) streams a first response and runs a tool call.
- [The agent loop](/docs/agent-loop/) is a complete agent in forty lines.
- [Streaming](/docs/streaming/) has the grammar every stream follows.
- [Models and endpoints](/docs/models/) lists what MMSP talks to.
