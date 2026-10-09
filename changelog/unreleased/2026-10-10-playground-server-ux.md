# A chat sent to another model starts a new conversation; the server page tests rows, warns while open and confirms a start

- **Date:** 2026-10-10
- **Type:** feature
- **Scope:** `integration`
- **PR:** [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)

[中文版](2026-10-10-playground-server-ux.zh.md)

## What changed

- Chat page: a message sent to another entry (model id, client type or base URL) starts a new conversation: the page clears the session (`/api/clear`), draws a divider "New conversation with <model> · the messages above are not sent", and the composer hint says so before Enter. A key or extra-headers edit continues the conversation; `/api/chat` carries a session's history over when it rebuilds the client, so no history resets silently.
- Server page, Models: Test on an open row and Test all send one short prompt straight to the upstream through `POST /server/api/test` (`{"model": row}`, the row as typed, `$VAR` cells read from the playground's environment) and show Passed with first token, total, tokens out and TPS, or Failed with the upstream's message; three rows at a time, 60 s each.
- Server page: a banner at the top while the running server has no keys, saying anyone who can reach its URL can use the models, with Add a key.
- Server page: Start and Apply open a dialog naming the listen URL, the number of models and the keys the saved file holds, with the open-server warning when there are none; Enter or the button confirms, Escape cancels; Ctrl/Cmd+S is inert while it is open.
