# 基类客户端直接在方法内构建公开的流

- **Date:** 2026-10-24
- **Type:** refactor
- **Scope:** `base_client`

[English](2026-10-24-base-client-inline.md)

## 变更内容

- 公开的流改为直接在方法内构建：Python 是 `LLMClient.streaming_response`，TypeScript 是 `LLMClient.streamingResponse`。具体包括：为 `StreamItems` 返回的每一项包一个 delta 事件、逐字段合并用量、检查 `IncompleteStreamError` 和 `EmptyResponseError`、生成 `stop` 事件。这些逻辑原先放在 `_PublicStream` / `PublicStream` 和 `_delta_event` / `deltaEvent` 里。
- Python 的有状态调用不再用 `_StatefulCall`，改为和 TypeScript 一样，用一个普通的 `{"signal": ...}` 对象占用客户端。
- Python 的中止处理仍然每个流只有一个等待者，原先覆盖的每种竞态都保留。当前正在读取的任务原先由一个任务加一个标志表示，现在只用一个变量 `reading_task`；这些竞态集中写在一段注释里说明。
- 抽象方法的 docstring 和 JSDoc 保留了接口约定，删掉了只是复述函数签名的部分。
