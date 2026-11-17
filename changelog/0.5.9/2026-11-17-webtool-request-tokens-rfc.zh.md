# MMSP-RFC-0003 把按请求计费的请求记为 1,000 个 token

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `design`
- **PR:** [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)

[English](2026-11-17-webtool-request-tokens-rfc.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改（中英文），并在引言中记下这次的情况。§3.2 规定：端点按请求计费时，网页工具的 `stop` 以每次请求 1,000（原为 1）作为 `prompt_tokens` 上报，这样此类模型每百万 token 的价格就是 1,000 次请求的价格。
