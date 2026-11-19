# 未发布

[English](README.md)

- [2026-11-20] MMSP-RFC-0003 消息请求在原文上修改，按请求计费的端点计费的每次请求记 1,000 个提示 token，不计费的请求记 0（原为每次请求都记 1,000）。([详情](2026-11-20-webtool-billed-requests-rfc.zh.md), [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353))
- [2026-11-19] `deepseek-webtool` 只对 DeepSeek 计费的请求，即搜到结果的搜索与返回网页 Markdown 的抓取，记 1,000 个提示 token，其余记 0。([详情](2026-11-19-deepseek-webtool-metering.zh.md), [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351))
