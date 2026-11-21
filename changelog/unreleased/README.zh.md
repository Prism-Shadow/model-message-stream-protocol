# 未发布

[English](README.md)

- [2026-11-21] MMSP-RFC-0002 消息协议在原文上修改，规定 `.github/ci/models.json` 在每个官方端点只测一个文本模型，即厂商最新一代中最小的模型；其他每种模态保留各自的用例，Amazon Bedrock 保留其 key 唯一能访问的 Claude 模型。([详情](2026-11-21-ci-smallest-model-rfc.zh.md), [#364](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/364))
- [2026-11-20] `ModelPricing` 去掉了 `thoughts_tokens`：每一行都按输出单价为一轮调用的思考 token 计费，`gemini-nano-banana-2.1` 与 `gemini-omni-1.2-flash` 的思考计算成本随之上升。([详情](2026-11-20-no-thinking-price.zh.md), [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360))
- [2026-11-20] 新增 `change` 类 RFC MMSP-RFC-0012 思考按输出计价，`ModelPricing` 不含思考单价，一轮调用的思考 token 按输出单价计费。([详情](2026-11-20-no-thinking-price-rfc.zh.md), [#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359))
