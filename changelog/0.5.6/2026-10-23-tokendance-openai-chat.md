# TokenDance's DeepSeek V4.1 Flash on `openai-chat`

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `registry`, `tests`, `docs`, `skills`
- **PR:** [#286](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/286)

[中文版](2026-10-23-tokendance-openai-chat.zh.md)

## What changed

- `list_supported_models()` / `listSupportedModels()`: the TokenDance rows `deepseek-v4.1-flash-1017` and `deepseek-v4.1-flash` at `https://tokendance.space/gateway/v1` moved from `deepseek-official` to `openai-chat`, the gateway's `openai:chat-completions` protocol, identically in Python and TypeScript. Their prices stayed at 0.8 / 3.2 / 0.016 CNY per million tokens, the catalog's Chat Completions rate (read 2026-10-23).
- `.github/ci/models.json`: the slow TokenDance case `deepseek-v4.1-flash` moved from the `deepseek-official` group to the `openai-chat` group, with `client_type: openai-chat`.
- The models page and both `skills/*/reference/models.md` named `openai-chat` as the client for TokenDance's `deepseek-v4.1-flash` and `deepseek-v4.1-flash-1017`.
