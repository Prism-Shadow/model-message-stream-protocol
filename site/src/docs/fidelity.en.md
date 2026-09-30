---
description: The wire-level data an item carries so the provider accepts it again on the next turn.
---

Providers attach data to what a model produces and expect it back: a signature on a thinking block, a phase on a message, an encrypted copy of the reasoning. Your code has no use for it, and the next request fails or degrades without it.

MMSP keeps that data in one place, the `fidelity` field of a content item.

```json
{"type": "thinking.done", "thinking": "Let me check", "fidelity": {"signature": "EuYB..."}}
```

## What it holds

| Provider | Item | Fidelity |
| --- | --- | --- |
| Anthropic | `thinking.done` | The `signature` of the thinking block, or the data of a redacted one |
| OpenAI Responses | `thinking.done` | The `channel` the reasoning arrived on, `encrypted_content`, and what else the server demands back |
| OpenAI Responses | `text.done` | The `phase` of the message |
| Chat Completions | `thinking.done` | The `reasoning_field` the server used: `reasoning_content` or `reasoning` |
| Gemini | any item | The thought `signature` |

## The rules

- **It is opaque.** `fidelity` is an arbitrary JSON object. Pass it back unchanged; never modify it and never drop it.
- **It belongs to the item.** Keep it with the item it arrived on, in the order the items arrived. The stateful call does both.
- **It appears once per item in a stream.** At most one `.delta` of a group carries it, and the `.done` item carries the same value. The fragment that brings it may be otherwise empty.

## Moving a conversation between providers

The content of a history reads the same for every provider, so a conversation can continue on another model. Fidelity is the part that does not travel: a signature means something only to the provider that issued it.

Two limits come from the providers themselves:

- **Gemini signatures are bound to the endpoint that issued them.** A history recorded with a Gemini API key cannot move to a Vertex AI key with its signatures, or the reverse.
- **Gemini expects a signed thought in a turn that called tools.** When the turn came from another provider, MMSP opens it with the placeholder signature Google documents for thoughts the model did not produce, so the request is accepted.
