---
description: UniEvent, and the one grammar every stream follows, whichever provider produced it.
---

A streamed response is a sequence of `UniEvent` objects. There are two kinds: `delta` while the response is running, and `stop` once it has finished.

```json
{"role": "assistant", "event_type": "delta", "content_items": [{"type": "text.delta", "text": "Hel"}], "usage_metadata": null, "finish_reason": null, "created_at": 1694502400000}
```

```json
{"role": "assistant", "event_type": "stop", "content_items": [], "usage_metadata": {"cached_tokens": 0, "prompt_tokens": 10, "thoughts_tokens": null, "response_tokens": 5}, "finish_reason": "stop", "created_at": 1694502400100}
```

## Fields

| Field | On a `delta` event | On the `stop` event |
| --- | --- | --- |
| `role` | `"assistant"` | `"assistant"` |
| `content_items` | Exactly one item, a `.delta` or a `.done` | Empty |
| `usage_metadata` | null | The token counts of the request |
| `finish_reason` | null | `"stop"`, `"length"`, `"tool_call"` or `"unknown"` |
| `created_at` | Unix time in milliseconds | Unix time in milliseconds |

## The grammar

```text
stream := delta_event* stop_event
items  := group*                 the items of the delta events, one per event, in order
group  := K.delta+ K.done        K = text | thinking | tool_call | inline_data | inline_thinking | embedding
```

- **One item per delta event.** Taken in order, the items form groups: one or more `K.delta` fragments, then one `K.done` holding the complete item.
- **The `.done` items are the message.** In stream order, with the usage and finish reason of the `stop` event, they are the assistant message the stateful call records.
- **Groups never interleave.** A group's `.done` arrives before the next group's first `.delta`, so every fragment belongs to the group that is open. No id is needed to attribute it.
- **`stop` is always last.** It arrives exactly once, carries no items, and always carries the usage and the finish reason. Read the usage there; do not add it up across events.
- **A stream ends with `stop` or with an exception, never both.** See [Errors](/docs/errors/).

## Delta items

| Type | Grows | Notes |
| --- | --- | --- |
| `text.delta` | `text` | |
| `thinking.delta` | `thinking` | |
| `tool_call.delta` | `arguments`, a fragment of a JSON string | `name` and `tool_call_id` are set on the first fragment of a call and empty afterwards |
| `inline_data.delta` | `data` bytes | Audio arrives in chunks of one item; every image is an item of its own |
| `inline_thinking.delta` | `data` bytes | |
| `embedding.delta` | `embedding` | One whole vector |

`image_url` and `tool_result` are written by the user only, so they have no delta form.

A `.done` item is the first fragment of its group with the growing field replaced by everything the fragments carried: the concatenated text, thinking or bytes, the parsed arguments, the vector.

## An example

A Claude turn that thinks, then calls a tool:

```text
delta  thinking.delta   thinking="Let me"
delta  thinking.delta   thinking=" check"
delta  thinking.delta   thinking=""  fidelity={"signature": "..."}
delta  thinking.done    thinking="Let me check"  fidelity={"signature": "..."}
delta  tool_call.delta  name="get_weather"  tool_call_id="toolu_1"  arguments=""
delta  tool_call.delta  name=""  tool_call_id=""  arguments="{\"location\": "
delta  tool_call.delta  name=""  tool_call_id=""  arguments="\"Paris\"}"
delta  tool_call.done   name="get_weather"  tool_call_id="toolu_1"  arguments={"location": "Paris"}
stop   usage_metadata={...}  finish_reason="tool_call"
```

The third event carries nothing but [`fidelity`](/docs/fidelity/): the signature arrived after the thinking text. Within a group at most one fragment carries fidelity, and the `.done` item carries the same value.

## Tool calls

- The first `tool_call.delta` of a call carries its `name` and `tool_call_id`. Later fragments carry only `arguments`.
- `tool_call.done` carries the `arguments` parsed into an object. Read tool calls from it, and send each result back with its `tool_call_id`.
- The arguments must parse to a JSON object. When they are malformed, cut short, or parse to something else, MMSP raises `ToolCallArgumentParseError` in place of the `tool_call.done`.
- `minimax-official` reads each call from the server's completed item, so its call streams as a single `tool_call.delta` carrying the name, the id and the whole arguments, then the `tool_call.done`.

## Embeddings

An embedding model streams one `embedding.delta` and one `embedding.done` per message you sent, in the order you sent them, then the `stop` event. The items of one message are embedded together as one vector.
