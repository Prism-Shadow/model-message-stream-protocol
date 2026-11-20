# 思考按输出单价计费

- **Date:** 2026-11-20
- **Type:** feature
- **Scope:** `registry`, `tests`, `site`, `skills`, `.github`
- **PR:** [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360)
- **Breaking:** yes — `ModelPricing` 去掉了 `thoughts_tokens`；一轮调用的思考 token 按 `response_tokens` 计费

[English](2026-11-20-no-thinking-price.md)

## 变更内容

- 两个包的 `ModelPricing` 都去掉了 `thoughts_tokens`，依据 [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.zh.md)。`list_supported_models` / `listSupportedModels` 在 USD 与 CNY 下都只返回 `currency`、`prompt_tokens`、`response_tokens` 和可选的 `cached_tokens`，一轮调用的 `thoughts_tokens` 计为输出，按 `response_tokens` 计费。`usage_metadata` 中的 `thoughts_tokens` 计数不变。
- 注册表的 `usd` / `_usd` 辅助函数不再接受思考单价。此前对思考单独定价的两行，`google-official` 上的 `gemini-nano-banana-2.1` 与 `gemini-omni-1.2-flash`，改按各自的输出单价为思考计价，其思考的计算成本随之上升（见下表）。
- `/models.json` 不再在任何一行写出 `thoughts_tokens` 单价，其 `pricing` 说明改为思考按输出单价计费。
- 状态探测按输出单价计算样本的思考 token。
- 用量文档与两个 Skill 把一轮调用的输出成本写为 `(thoughts_tokens + response_tokens) * pricing.response_tokens`。

## 注册表元数据

| 模型 | 客户端 | 此前的思考单价（每 1M token） | 现在 | 变化 |
| --- | --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | `google-official` | $7.50 | $30.00 | +$22.50 |
| `gemini-omni-1.2-flash` | `google-official` | $9.00 | $12.00 | +$3.00 |

其余各行此前已按输出单价为思考计价，计算成本不变。

## 兼容性

- 读取 `pricing.thoughts_tokens`（Python 中为 `pricing["thoughts_tokens"]`）的调用方改用 `pricing.response_tokens` 为思考计价：一轮调用的输出成本为每百万 `(thoughts_tokens + response_tokens) * pricing.response_tokens`。
- 已按旧思考单价为 `gemini-nano-banana-2.1` 或 `gemini-omni-1.2-flash` 算出并记录的成本保持不变；用本版本的注册表重新计算，会得到上表中更高的数值。
