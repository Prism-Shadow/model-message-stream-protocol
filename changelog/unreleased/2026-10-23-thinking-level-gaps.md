# Thinking level NONE turned thinking off on the Claude models before 5.5

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `anthropic_official`, `types`, `tests`
- **PR:** [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293)

[中文版](2026-10-23-thinking-level-gaps.zh.md)

## What changed

- `AnthropicOfficialClient` sent `thinking: {type: "disabled"}` for `ThinkingLevel.NONE` on Claude Sonnet 4.6, Opus 4.8, Sonnet 5 and Opus 5, so `NONE` turned thinking off on them. It had sent no thinking block, on which Opus 5 still ran adaptive thinking.
- With `thinking_summary` also set, `NONE` on those models sent the disabled block without `display`, where it had turned adaptive thinking on to carry the summary.
- `AnthropicOfficialClient` ran `NONE` on Fable 5 as adaptive thinking at effort `low`, as on Fable 5.1, because Fable 5 returns 400 for `disabled`.
- The `fast_mode` comment on `UniConfig` named the clients that send `service_tier` or `speed` and the clients that raise `UnsupportedParameterError`.
- `test_thinking_level_mapping.py` and `thinking-level-mapping.test.ts` gained rows for `NONE` on each Claude generation (`disabled`, `between_tools`, adaptive at `low`), the `anthropic-official` efforts `low` to `high`, every `ant-messages` level, `openai-chat` sending no `reasoning_effort`, Kimi K3 `none → low` and `high`, MiniMax-M3 `none` to `high`, MiniMax-M3.1-Flash `low` to `high`, `gpt-6-luna → none` and `gemini-4-argon`.

## Configuration behavior

| `thinking_level` on `anthropic-official` | Claude Sonnet 4.6, Opus 4.8, Sonnet 5, Opus 5 | Fable 5 |
| --- | --- | --- |
| `none` | `thinking: {type: "disabled"}` | adaptive, effort `low` |
| `none` with `thinking_summary` | `thinking: {type: "disabled"}`, no `display` | adaptive, effort `low`, with `display` |
