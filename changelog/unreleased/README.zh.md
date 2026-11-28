# 未发布

[English](README.md)

- [2026-11-28] 新增 `change` 类 RFC MMSP-RFC-0013 输出按模态计价，取代 MMSP-RFC-0012：注册表每一行有四档价格（缓存、输入、推理、输出）与同一个费用公式，按模态拆分输出的响应把思考与文本计入 `thoughts_tokens`、把图像、视频或音频 token 单独计入 `response_tokens`，每一项计费数量都计入用量；MMSP-RFC-0003 在原文上修改，把图像生成消息中的图像项作为参考图发送。([详情](2026-11-28-modality-prices-rfc.zh.md), [#365](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/365))
- [2026-11-21] MMSP-RFC-0002 消息协议在原文上修改，规定 `.github/ci/models.json` 在每个官方端点只测一个文本模型，即厂商最新一代中最小的模型；其他每种模态保留各自的用例，Amazon Bedrock 保留其 key 唯一能访问的 Claude 模型。([详情](2026-11-21-ci-smallest-model-rfc.zh.md), [#364](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/364))
- [2026-11-21] 实况测试在每个官方端点只跑一个文本模型，即该厂商最新一代中最小的模型：`gpt-6.2-sol`、`gpt-6.1-terra` 与 `claude-sonnet-5-5` 移出了 `.github/ci/models.json`，其他模态与 Bedrock 的 `global.anthropic.claude-sonnet-4-6` 保留各自的用例。([详情](2026-11-21-ci-smallest-model.zh.md), [#363](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/363))
- [2026-11-20] `ModelPricing` 去掉了 `thoughts_tokens`：每一行都按输出单价为一轮调用的思考 token 计费，`gemini-nano-banana-2.1` 与 `gemini-omni-1.2-flash` 的思考计算成本随之上升。([详情](2026-11-20-no-thinking-price.zh.md), [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360))
- [2026-11-20] 新增 `change` 类 RFC MMSP-RFC-0012 思考按输出计价，`ModelPricing` 不含思考单价，一轮调用的思考 token 按输出单价计费。([详情](2026-11-20-no-thinking-price-rfc.zh.md), [#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359))
