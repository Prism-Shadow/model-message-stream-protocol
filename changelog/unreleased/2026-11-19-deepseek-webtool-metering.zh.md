# deepseek-webtool 只计 DeepSeek 计费的请求

- **Date:** 2026-11-19
- **Type:** fix
- **Scope:** `deepseek_webtool`, `registry`, `site`
- **PR:** [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351)

[English](2026-11-19-deepseek-webtool-metering.md)

## 变更内容

- `deepseek-webtool` 的 `stop` 只对 `results` 非空的搜索与 `content` 非空的抓取（即 DeepSeek 计费的请求）记 1,000 个提示 token，两个包相同，符合 [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353) 修改后的 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) §3.2。什么也没搜到的搜索与正文为空的抓取记 0（原为 1,000），照常流出它们的 `webtool` 内容项。
- 流式文档与注册表注释写明了哪些请求计入。
