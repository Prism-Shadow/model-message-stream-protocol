# 流在用量或结束原因到达之前结束时抛出 IncompleteStreamError

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `errors`, `base_client`, `wire`, `openai_official`, `minimax_official`
- **PR:** [#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)

[English](2026-10-22-incomplete-stream-error.md)

## 变更内容

- 两个包的导出中新增 `IncompleteStreamError`，即 MMSP-RFC-0010（现为 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md)）所指的那个 `MMSPError`。服务商的流在用量或结束原因到达之前就结束时，基类在已经到达的条目之后、原本该出现 `stop` 事件的位置抛出它；此前抛出的是裸的 `ValueError` / `Error`。
- `IncompleteStreamError` 携带 `client`、`missing`（`usage_metadata`、`finish_reason` 或两者）以及已经到达的 `finish_reason` 和 `usage_metadata`（TypeScript 中为 `finishReason` 和 `usageMetadata`）。它的消息只列出缺少的字段，例如 `<client>'s stream ended without usage_metadata and finish_reason.`
- MMSP 服务端连同字段一起发送 `IncompleteStreamError`，`mmsp` 客户端因此抛出 `error_type` 为 `IncompleteStreamError` 的 `UpstreamError`。
- Python 的 `OpenAIOfficialClient` 只在 `response.completed` 与 `response.incomplete` 事件带有用量时读取用量，与 TypeScript 一致，因此不带用量的事件以 `IncompleteStreamError` 结束，而不是 `AttributeError`。
- `OpenAIOfficialClient`、`OpenaiResponsesClient`、`DeepSeekOfficialClient` 与 `MiniMaxOfficialClient` 不再从没有 `status` 的 `response.completed` 或 `response.incomplete` 事件中得出结束原因，这样的流以 `IncompleteStreamError` 结束；此前 Python 与 TypeScript 的 `MiniMaxOfficialClient` 把缺失的 status 映射为 `unknown`。不在映射表中的 status 在两种语言中仍以 `unknown` 结束。
- 网站的错误页与用量页，以及 `mmsp-python` 和 `mmsp-typescript` 两个 skill，记录了这个错误。
