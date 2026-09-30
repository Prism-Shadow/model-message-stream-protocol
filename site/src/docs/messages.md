---
description: UniMessage, the message every provider reads and writes, and the content items it holds.
---

A `UniMessage` is one message of a conversation. It is what you send, what the stateful client keeps in its history, and what a finished stream adds up to.

```json
{
  "role": "assistant",
  "content_items": [
    {"type": "thinking.done", "thinking": "The user wants the weather.", "fidelity": {"signature": "EuYB..."}},
    {"type": "text.done", "text": "Let me check."},
    {"type": "tool_call.done", "name": "get_weather", "arguments": {"location": "Paris"}, "tool_call_id": "call_1"}
  ],
  "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27},
  "finish_reason": "tool_call",
  "created_at": 1694502400000
}
```

## Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `role` | `"user"` or `"assistant"` | Who wrote the message. Tool results are sent in a `user` message. |
| `content_items` | list of content items | The payload, in the order it was produced. |
| `usage_metadata` | object or null | Token counts, on an assistant message a stream produced. See [Token usage](/docs/usage/). |
| `finish_reason` | `"stop"`, `"length"`, `"tool_call"`, `"unknown"` or null | Why the response ended. |
| `created_at` | integer | Unix time in milliseconds. MMSP stamps messages that have none. |

Only `role` and `content_items` are required on the messages you write.

## Content items

Every item in a message is complete, and its type ends in `.done`.

| Type | Fields | Written by |
| --- | --- | --- |
| `text.done` | `text` | User and assistant |
| `image_url.done` | `image_url`, a URL or a data URI | User |
| `inline_data.done` | `data` bytes, `mime_type` | User and assistant: images, audio |
| `thinking.done` | `thinking` | Assistant |
| `inline_thinking.done` | `data` bytes, `mime_type` | Assistant: images an image generation model thinks with |
| `tool_call.done` | `name`, `arguments` as an object, `tool_call_id` | Assistant |
| `tool_result.done` | `text`, optional `images`, `tool_call_id` | User |
| `embedding.done` | `embedding`, a list of numbers | Assistant |

Any item the assistant wrote may carry [`fidelity`](/docs/fidelity/): what the provider needs back to accept the item on the next turn.

In Python `data` is `bytes`; in TypeScript it is a `Buffer`.

## Order matters

Items stay in the order the model produced them: thinking, then text, then a tool call. MMSP sends them back in that order, which is what lets a model continue a turn that interleaves thinking with tool calls.

## Messages saved before 0.5.0

Before 0.5.0 the item types had no suffix: `text`, `tool_call`, and so on. MMSP still accepts them until 0.6.0. It converts them to the `.done` types, drops stray `partial_tool_call` items, and warns once per process.

The conversion runs on request messages, on the message given to the stateful call, in `set_history`, and on trace files the tracer loads. To convert stored data yourself, call `normalize_legacy_messages` in Python or `normalizeLegacyMessages` in TypeScript.
