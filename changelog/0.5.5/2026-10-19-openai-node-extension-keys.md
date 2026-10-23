# GLM and Kimi K2 extension keys reach the API from TypeScript

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `zai_official`, `moonshot_official`, `tests`
- **PR:** [#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)

[中文版](2026-10-19-openai-node-extension-keys.zh.md)

## What changed

- `ZAIOfficialClient` (TypeScript) sent `tool_stream` and `thinking` inside a literal `extra_body` key, which openai-node posts unchanged. It now sends both at the top level of the request body, as the Python client does: `ThinkingLevel.NONE` turns thinking off on the GLM generations before 5.3, and tool-call arguments stream in fragments.
- `MoonshotOfficialClient` (TypeScript) sends the Kimi K2 generation's `thinking` switch at the top level of the request body, so `ThinkingLevel.NONE` turns thinking off on `kimi-k2.6`.
- Tests: the GLM thinking-level test reads `thinking` and `tool_stream` at the top level of the TypeScript config, and a thinking-switch table in both languages covers `kimi-k2.6` and `glm-5.2`.
