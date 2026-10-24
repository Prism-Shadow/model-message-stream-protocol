# 思考等级 NONE 在 5.5 之前的 Claude 模型上关闭思考

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `anthropic_official`, `types`, `tests`
- **PR:** [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293)

[English](2026-10-23-thinking-level-gaps.md)

## 变更内容

- `AnthropicOfficialClient` 在 Claude Sonnet 4.6、Opus 4.8、Sonnet 5 与 Opus 5 上为 `ThinkingLevel.NONE` 发送 `thinking: {type: "disabled"}`，`NONE` 因此在这些模型上关闭思考。此前不发送思考块，Opus 5 在这种情况下仍按自适应思考运行。
- 同时设置 `thinking_summary` 时，这些模型上的 `NONE` 发送不带 `display` 的 disabled 块；此前会为承载摘要而开启自适应思考。
- `AnthropicOfficialClient` 在 Fable 5 上把 `NONE` 作为 effort 为 `low` 的自适应思考运行，与 Fable 5.1 相同，因为 Fable 5 对 `disabled` 返回 400。
- `UniConfig` 上 `fast_mode` 的注释写明哪些客户端发送 `service_tier` 或 `speed`，哪些客户端抛出 `UnsupportedParameterError`。
- `test_thinking_level_mapping.py` 与 `thinking-level-mapping.test.ts` 新增用例：各代 Claude 的 `NONE`（`disabled`、`between_tools`、`low` 档自适应），`anthropic-official` 的 `low` 到 `high`，`ant-messages` 的每个等级，`openai-chat` 不发送 `reasoning_effort`，Kimi K3 的 `none → low` 与 `high`，MiniMax-M3 的 `none` 到 `high`，MiniMax-M3.1-Flash 的 `low` 到 `high`，`gpt-6-luna → none` 与 `gemini-4-argon`。

## 配置行为

| `anthropic-official` 上的 `thinking_level` | Claude Sonnet 4.6、Opus 4.8、Sonnet 5、Opus 5 | Fable 5 |
| --- | --- | --- |
| `none` | `thinking: {type: "disabled"}` | 自适应，effort `low` |
| `none` 且设置 `thinking_summary` | `thinking: {type: "disabled"}`，不带 `display` | 自适应，effort `low`，带 `display` |
