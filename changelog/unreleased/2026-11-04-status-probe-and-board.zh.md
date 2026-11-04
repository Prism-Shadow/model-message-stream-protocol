# 状态探测在思考耗尽 max_tokens 时重试一次，新增四个监测渠道，每日卡片可以移入

- **Date:** 2026-11-04
- **Type:** process
- **Scope:** `status`, `site`
- **PR:** [#315](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/315)

[English](2026-11-04-status-probe-and-board.md)

## What changed

- `probe.py`：回答只有思考内容、且因 `max_tokens` 停止（`EmptyResponseError`，finish reason 为 `length`）时，这次采样不再算失败。探测会把 `max_tokens` 加倍再问一次，以第二次回答为准。采样的用量是两次之和，运行文件中的 `retried` 保留第一次的错误。2026-11-03 TokenDance `deepseek-v4.1-flash` 被标为 degraded 就是这个原因：三次回答中有一次把 2,048 个 token 全部用在了思考上。因其他原因停止的纯思考回答仍算失败。
- `targets.json`：每日探测从三个渠道增加到七个。新增 TokenDance 的 `glm-5.3-flash`（`zai-official`）、`qwen3.8-flash` 与 `mimo-v2.6-flash`（`openai-responses`），以及 Bedrock 的 `global.anthropic.claude-sonnet-4-6`（`anthropic-official`）。三个 TokenDance 渠道已于 2026-11-04 实测可用。测试机上没有 Bedrock 密钥，不过这个渠道 CI 的模型目录一直在测。定时任务从 `main` 启动，所以新渠道和重试要等 `dev` 合入 `main` 后才生效。
- `/status/`：每日卡片可以接收指针。指针从柱子移到卡片上时卡片保持打开，可以选中并复制其中的日期、指标和错误信息；指针离开柱子和卡片 200 毫秒后卡片才关闭。点进卡片也不会再让它关闭。卡片会显示完整的错误信息（最多 200 个字符），不再截成三行。
- `/status/`：柱状条现在止于最近一次有探测的那天：当天的探测完成后显示到今天，完成前只显示到昨天。一整天都没有探测的日子，在这天过完后仍会补上一根灰色柱子。此前从 UTC 零点到 04:30 的探测之间，当天会先显示一根灰色柱子。
- `/status/`：窗口之前没有更早的日期时，‹ 按钮置灰。此前它要等分支上的文件读完才会变灰，在那之前点击没有任何反应。
