# DeepSeek 网页工具的一次请求记为 1,000 个提示 token

- **Date:** 2026-11-17
- **Type:** feature
- **Scope:** `deepseek_webtool`, `registry`
- **PR:** [#337](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/337)
- **Breaking:** yes — `deepseek-webtool` 每次请求上报 1,000 个提示 token，原为 1

[English](2026-11-17-webtool-request-tokens.md)

## 变更内容

- 两个包的 `deepseek-webtool` 在 `stop` 中把 DeepSeek 计费的每次请求上报为 1,000 个提示 token（原为 1），遵循 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) §3.2。
- 注册表中 DeepSeek 与 TokenDance 上的 `deepseek-search` 和 `deepseek-fetch` 定价为每百万提示 token ¥5（原为 ¥5,000），即按每 1,000 次 ¥5 计的 1,000 次请求的价格。
- 流式文档写明 DeepSeek 的一次请求记 1,000。

## 兼容性

- 根据 `prompt_tokens` 统计 DeepSeek 网页工具请求次数的调用方需除以 1,000。以 `prompt_tokens` 乘以注册表价格算出的费用不变，每次请求 ¥0.005。
