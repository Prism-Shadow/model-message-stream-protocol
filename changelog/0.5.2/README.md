# 0.5.2

[中文版](README.zh.md)

- [2026-10-10] Playground: a chat sent to another model starts a new conversation under a divider; the server page tests a row against its upstream (first token, total, tokens out, TPS), warns while the running server has no keys, and confirms Start and Apply. ([details](2026-10-10-playground-server-ux.md), [#250](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/250))
- [2026-10-09] Support Claude Haiku 5.5: `anthropic-official` serves `claude-haiku-5-5` and `list_supported_models` lists it with OpenRouter's `anthropic/claude-haiku-5.5`; cache reads on Claude Sonnet 5.5 drop to $0.10. ([details](2026-10-09-claude-haiku-5-5.md), [#249](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/249))
- [2026-10-09] The official Gemini client is `google-official` (alias `gemini-official`), named after its vendor like the other official clients; its class is `GoogleOfficialClient`. ([details](2026-10-09-google-official.md), [#248](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/248))
- [2026-10-02] An MMSP server serves the models of a table over HTTP as MMSP streams (`python -m mmsp.integration.server --config FILE`, `npm run server -- --config FILE`); the playground's `/server/` page saves a table to a config file, starts one from it and draws its metrics over the last 60 days, and the `mmsp` client calls it; an error the server reports comes back as the new `UpstreamError`. ([details](2026-10-02-mmsp-server.md), [#247](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/247))
