# MiniMax-M3.1-Flash

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `minimax_official`, `registry`, `tests`, `llmsdk_docs`
- **PR:** [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260)

[中文版](2026-10-19-minimax-m3-1-flash.zh.md)

## What changed

- `MiniMaxOfficialClient` served `MiniMax-M3.1-Flash` in Python and TypeScript, telling it apart from `MiniMax-M3` by the `m3.1` version in the model id. Requests for `MiniMax-M3` stayed as they were.
- Registered `MiniMax-M3.1-Flash` on MiniMax and `minimax/minimax-m3.1-flash:free` on OpenRouter.
- Replaced `MiniMax-M3` with `MiniMax-M3.1-Flash` in the shared model tests for `minimax-official`, `openai-chat`, `openai-responses` and `ant-messages`, and added its rows to the thinking-level mapping tests.
- Refreshed the MiniMax M-series documentation snapshot and added the text-generation guide.

## Configuration behavior

| `UniConfig` | `MiniMax-M3.1-Flash` on `minimax-official` |
| --- | --- |
| `thinking_level: none` | `reasoning.effort: "low"` (`"none"` is HTTP 400, code 2013) |
| `thinking_level: low` / `medium` / `high` | the same effort |
| `thinking_level: xhigh` / `max` | `"xhigh"` / `"max"` |
| `thinking_level` omitted | no `reasoning` field; the server default is `max` |
| `fast_mode: true` | `UnsupportedParameterError`; the API ignores `service_tier` on this model |
| `tool_choice: "none"` | `UnsupportedParameterError`; the API accepts it and still calls tools |
| `tool_choice: "required"` or named tools | `UnsupportedParameterError`, as for `MiniMax-M3` |
| `temperature` | 0 to 1, as for `MiniMax-M3` |

## Registry metadata

| Model | Base URL | Client | Input | Context | USD per 1M tokens (prompt / output / cached) |
| --- | --- | --- | --- | --- | --- |
| `MiniMax-M3.1-Flash` | `https://api.minimax.io/v1` | `minimax-official` | Text, Image | 1,000,000 | 0.15 / 0.60 / 0.015 |
| `minimax/minimax-m3.1-flash:free` | `https://openrouter.ai/api/v1` | `openai-responses` | Text, Image | 1,000,000 | 0 / 0 |
