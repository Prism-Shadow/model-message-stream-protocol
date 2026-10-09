# Gemini 官方客户端改名为 `google-official`，以厂商命名

- **Date:** 2026-10-09
- **Type:** refactor
- **Scope:** `auto_client`, `google_official`
- **PR:** [#248](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/248)

[English](2026-10-09-google-official.md)

## 变更内容

- `google-official`（原 `gemini-official`）：Gemini 模型的官方客户端改用厂商名命名，与 `openai-official`、`anthropic-official` 一致。目录与类改为 `google_official/GoogleOfficialClient`（原 `gemini_official/GeminiOfficialClient`），不传 client type 的 `gemini-` 模型 id 路由到它。
- `gemini-official` 仍可使用，作为 `google-official` 的别名；`OFFICIAL_CLIENT_TYPES` 只列出 `google-official`。
- 注册表中的 Gemini 条目、Playground、README、站点与 skills 改用 `google-official`；错误信息中的类名改为 `GoogleOfficialClient`。`GEMINI_API_KEY` 与 `GEMINI_BASE_URL` 不变。
