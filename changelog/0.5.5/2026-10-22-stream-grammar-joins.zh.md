# 流语法检查覆盖每一种内容项的拼接

- **Date:** 2026-10-22
- **Type:** process
- **Scope:** `tests`
- **PR:** [#271](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/271)

[English](2026-10-22-stream-grammar-joins.md)

## 变更内容

- `src_py/tests/stream_grammar.py` 中的 `assert_stream_grammar` 与 `src_ts/tests/streamGrammar.ts` 中的 `assertStreamGrammar` 新增两项检查：`inline_data.done` 与 `inline_thinking.done` 内容项的 `data` 等于其各 delta 字节的拼接，`mime_type` 等于第一个 delta 的；`embedding.done` 内容项的 `embedding` 等于其各 delta 数值的拼接。文本、思考和工具调用原本就已检查，因此这次改动之后，每个 `.done` 内容项都会与其片段的拼接比对，符合 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 的要求。
