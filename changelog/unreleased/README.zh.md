# 未发布

[English](README.md)

- [2026-11-20] `ModelPricing` 去掉了 `thoughts_tokens`：每一行都按输出单价为一轮调用的思考 token 计费，`gemini-nano-banana-2.1` 与 `gemini-omni-1.2-flash` 的思考计算成本随之上升。([详情](2026-11-20-no-thinking-price.zh.md), [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360))
- [2026-11-20] 新增 `change` 类 RFC MMSP-RFC-0012 思考按输出计价，`ModelPricing` 不含思考单价，一轮调用的思考 token 按输出单价计费。([详情](2026-11-20-no-thinking-price-rfc.zh.md), [#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359))
