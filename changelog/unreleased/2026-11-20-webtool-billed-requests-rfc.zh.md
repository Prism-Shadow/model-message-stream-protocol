# MMSP-RFC-0003 只计端点计费的请求

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`
- **PR:** [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353)

[English](2026-11-20-webtool-billed-requests-rfc.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改（中英文），并在引言中记下这次的情况。§3.2 规定：按请求计费的网页工具，端点计费的每次请求以 1,000、不计费的请求以 0 计入 `prompt_tokens`（原为每次请求都记 1,000）：DeepSeek 只对 `results` 非空的搜索与 `content` 非空的抓取计费。
