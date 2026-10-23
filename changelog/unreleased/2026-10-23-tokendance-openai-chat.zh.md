# TokenDance 上的 DeepSeek V4.1 Flash 改用 `openai-chat`

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `registry`, `tests`, `docs`, `skills`

[English](2026-10-23-tokendance-openai-chat.md)

## 变更内容

- `list_supported_models()` / `listSupportedModels()`：`https://tokendance.space/gateway/v1` 上的 TokenDance 条目 `deepseek-v4.1-flash-1017` 与 `deepseek-v4.1-flash` 由 `deepseek-official` 改为 `openai-chat`，即该网关的 `openai:chat-completions` 协议，Python 与 TypeScript 保持一致。价格不变，仍为每百万 token 0.8 / 3.2 / 0.016 元，即其模型目录中的 Chat Completions 价格（2026-10-23 读取）。
- `.github/ci/models.json`：TokenDance 上的慢速用例 `deepseek-v4.1-flash` 从 `deepseek-official` 组移到 `openai-chat` 组，`client_type` 为 `openai-chat`。
- 模型文档页与两份 `skills/*/reference/models.md` 将 TokenDance 上 `deepseek-v4.1-flash` 与 `deepseek-v4.1-flash-1017` 的客户端写为 `openai-chat`。
