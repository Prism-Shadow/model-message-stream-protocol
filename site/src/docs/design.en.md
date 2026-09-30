---
description: "Why MMSP: every stream is marked at two levels, so your code always knows what is arriving and when it is finished."
---

Every model API streams. None of them agrees with the others on how a program learns what is arriving and when it is finished, and that gap is where agent code breaks: a tool call parsed from half its arguments, a turn cut short that looks complete, a loop rewritten for every provider. MMSP closes the gap with one decision, made once for every provider: **every stream carries two layers of state.** Build on that and the rest of your agent gets simple.

## Two layers of state

Here is one real response, a thought followed by a tool call, as MMSP streams it:

```text
event_type  item
delta       thinking.delta   "The user wants"
delta       thinking.delta   " the weather in Paris."
delta       thinking.done    "The user wants the weather in Paris."
delta       tool_call.delta  get_weather
delta       tool_call.delta  {"city":
delta       tool_call.delta  "Paris"}
delta       tool_call.done   get_weather {"city": "Paris"}
stop        tool_call        usage_metadata {"prompt_tokens": 412, ...}
```

**The inner layer marks an item.** Tokens of one kind (text, thinking, a tool call, an image, audio, an embedding) stream as `.delta` fragments, and exactly one `.done` item closes them with the whole thing: the full text, the parsed arguments, the joined bytes. `text.delta` means "more of this text is coming"; `text.done` means "this text is finished, and here it is."

**The outer layer marks the message.** Every event is `delta` until exactly one `stop` event ends the stream, carrying the finish reason and the token usage. `delta` means "the assistant is still answering"; `stop` means "the message is complete, and this is how and why it ended."

Two questions, two layers, and neither is ever left to guesswork.

## What the two layers buy you

- **Show the stream, act on complete items.** A UI renders every `.delta` as it lands. Agent logic reads only `.done`. You never parse half a JSON argument, and you never wonder whether a tool call has finished.
- **One loop for every provider.** Anthropic ends content blocks, OpenAI ends output items, Gemini ends steps, and Chat Completions sends chunks that end nothing at all. MMSP turns each of them into the same two layers, so the loop you write for one model runs on all of them. Changing models is changing the model id.
- **An unfinished answer looks unfinished.** A stream without its `stop` event did not complete, whatever it managed to say. Truncation is never silent.
- **The message assembles itself.** The `.done` items, in order, are the assistant message, with thinking signatures and other [fidelity](/docs/fidelity/) attached, ready to go back to the provider on the next turn.

## Why not something else

- **Each provider's own SDK** gives you its own event model: a different vocabulary, different end markers, different places the tool arguments live. Supporting three providers means three parsers and three sets of bugs.
- **Chat Completions as a common format** has no item boundaries and no end-of-item signal. Thinking, signatures, images and parallel tool calls are bolted on differently by every gateway, or dropped.
- **Layers that hand back a finished message** give up the stream, or leave its assembly to you.

MMSP keeps the full stream, marks it the same way for every provider, and hands you complete items. That is the whole point, and it is why we build our own agents on it.

## Observe everything, then improve it

The same structure makes every turn easy to record. Add a `trace_id` to the config and MMSP saves each conversation as it happened: the config, every complete item, the finish reasons, the token usage and the timing. The local [tracer](/docs/tracing/) reads it back round by round, so a wrong tool argument or a runaway thought is found in seconds, not reconstructed from logs.

Those traces are also data an agent can read. An agent harness that reviews its own traces can see where it failed, change its prompts, tools or code, and run again: the loop of recursive self-improvement (RSI). MMSP gives that loop one uniform record across every model the harness runs on, which makes it the infrastructure layer for agents that improve themselves. [PenguinHarness](https://penguin.ooo/), a self-improving harness, talks to its models through MMSP.

## Start building

- [Quickstart](/docs/quickstart/) streams a first response and runs a tool call.
- [Streaming](/docs/streaming/) has every rule of the two layers.
- [Tracer and playground](/docs/tracing/) records and replays your runs.
