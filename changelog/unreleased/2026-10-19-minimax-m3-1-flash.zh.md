# MiniMax-M3.1-Flash

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `minimax_official`, `registry`, `tests`, `llmsdk_docs`
- **PR:** [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260)

[English](2026-10-19-minimax-m3-1-flash.md)

## 变更内容

- `MiniMaxOfficialClient` 在 Python 和 TypeScript 中支持 `MiniMax-M3.1-Flash`，按模型 id 中的版本号 `m3.1` 与 `MiniMax-M3` 区分。`MiniMax-M3` 的请求保持不变。
- 注册 MiniMax 官方的 `MiniMax-M3.1-Flash` 与 OpenRouter 的 `minimax/minimax-m3.1-flash:free`。
- 在 `minimax-official`、`openai-chat`、`openai-responses` 和 `ant-messages` 的共享模型测试中用 `MiniMax-M3.1-Flash` 替换 `MiniMax-M3`，并在思考等级映射测试中加入它的用例。
- 更新 MiniMax M 系列官方文档快照，新增文本生成指南。

## 配置行为

| `UniConfig` | `minimax-official` 上的 `MiniMax-M3.1-Flash` |
| --- | --- |
| `thinking_level: none` | `reasoning.effort: "low"`（`"none"` 返回 HTTP 400，错误码 2013） |
| `thinking_level: low` / `medium` / `high` | 同名档位 |
| `thinking_level: xhigh` / `max` | `"xhigh"` / `"max"` |
| 未设置 `thinking_level` | 不发送 `reasoning` 字段，服务端默认 `max` |
| `fast_mode: true` | `UnsupportedParameterError`；该模型的 API 忽略 `service_tier` |
| `tool_choice: "none"` | `UnsupportedParameterError`；API 接受该值但仍会调用工具 |
| `tool_choice: "required"` 或指定工具 | `UnsupportedParameterError`，与 `MiniMax-M3` 相同 |
| `temperature` | 0 到 1，与 `MiniMax-M3` 相同 |

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 | 上下文 | 每百万 Token 美元价格（提示词 / 输出 / 缓存） |
| --- | --- | --- | --- | --- | --- |
| `MiniMax-M3.1-Flash` | `https://api.minimax.io/v1` | `minimax-official` | 文本、图像 | 1,000,000 | 0.15 / 0.60 / 0.015 |
| `minimax/minimax-m3.1-flash:free` | `https://openrouter.ai/api/v1` | `openai-responses` | 文本、图像 | 1,000,000 | 0 / 0 |
