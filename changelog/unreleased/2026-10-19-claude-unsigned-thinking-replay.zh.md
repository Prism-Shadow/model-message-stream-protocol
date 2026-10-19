# Claude 回放时省略不带签名的思考条目

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `anthropic_official`, `tests`

[English](2026-10-19-claude-unsigned-thinking-replay.md)

## 变更内容

- `anthropic-official` 回放时不再发送 `fidelity` 中没有 `signature` 的 `thinking.done` 条目（例如其他服务商产生的思考条目），该轮其余内容照常回放。此前 Python 遇到这种条目会抛出 `KeyError`，TypeScript 则发送不带 `signature` 的 `thinking` 块，被 API 以 400（`thinking.signature: Field required`）拒绝。
- 带签名的 `thinking.done` 条目（包括 redacted thinking）照旧回放。
- 新增 Python 与 TypeScript 离线测试：工具调用前不带签名的思考条目被省略，后续轮次中带签名的思考条目保留。
