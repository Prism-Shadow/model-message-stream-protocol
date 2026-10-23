# Playground reply head names the model and the time only

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `integration`

[中文版](2026-10-23-playground-reply-head.zh.md)

## What changed

- The assistant reply head showed the model, the elapsed time and the clock; the elapsed time left it, since the usage line under the reply already says `Took N s`.
- `addMessageCard` in the page script dropped its `tookMs` parameter, which only filled the head's elapsed time.
