---
description: The four token counts of a response, and how they add up.
---

The `stop` event, the last event of every stream, carries the token counts of the request in `usage_metadata`.

```json
{"cached_tokens": 120, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27}
```

| Field | Counts |
| --- | --- |
| `cached_tokens` | Input tokens read from the provider's cache |
| `prompt_tokens` | Input tokens that were not cached |
| `thoughts_tokens` | Output tokens spent on thinking |
| `response_tokens` | Output tokens of the answer |

## Totals

```text
input_tokens  = cached_tokens + prompt_tokens
output_tokens = thoughts_tokens + response_tokens
total_tokens  = input_tokens + output_tokens
```

A count the provider does not report is null. Treat it as zero.

## Where to read it

Read the counts from the `stop` event, once. `delta` events carry null, and nothing needs adding up across events.

The assistant message the stateful call records carries the same `usage_metadata`, so a stored history keeps the cost of every turn.

A response that raised `EmptyResponseError` still spent tokens. The error carries its `usage_metadata`.
