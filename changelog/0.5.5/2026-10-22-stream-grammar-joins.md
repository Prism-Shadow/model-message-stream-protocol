# The stream-grammar check joins every item kind

- **Date:** 2026-10-22
- **Type:** process
- **Scope:** `tests`
- **PR:** [#271](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/271)

[中文版](2026-10-22-stream-grammar-joins.zh.md)

## What changed

- `assert_stream_grammar` in `src_py/tests/stream_grammar.py` and `assertStreamGrammar` in `src_ts/tests/streamGrammar.ts` gained two checks: an `inline_data.done` or `inline_thinking.done` item's `data` is the bytes of its deltas joined and its `mime_type` is the first delta's; an `embedding.done` item's `embedding` is the values of its deltas joined. Text, thinking and tool calls were already checked, so with this change every `.done` item is compared with the join of its fragments, as [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-async-streaming.md) requires.
