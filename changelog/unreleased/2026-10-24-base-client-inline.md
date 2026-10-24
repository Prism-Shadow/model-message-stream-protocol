# The base client builds the public stream inline

- **Date:** 2026-10-24
- **Type:** refactor
- **Scope:** `base_client`

[中文版](2026-10-24-base-client-inline.zh.md)

## What changed

- Python `LLMClient.streaming_response` and TypeScript `LLMClient.streamingResponse` built the public stream in the method itself. That covered the delta event around each item `StreamItems` returned, the field-by-field merge of the usage, the `IncompleteStreamError` and `EmptyResponseError` checks and the `stop` event, which `_PublicStream` / `PublicStream` and `_delta_event` / `deltaEvent` had held.
- The Python stateful call held its client with a plain `{"signal": ...}` object, as TypeScript did, in place of `_StatefulCall`.
- The Python abort handling kept one waiter per stream and every race it covered. The task reading now was held in one variable, `reading_task`, in place of a task and a flag, and the races were described in one comment.
- The abstract methods' docstrings and JSDoc kept their contracts and lost the lines that restated their signatures.
