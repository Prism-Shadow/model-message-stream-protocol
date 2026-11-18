# DeepSeek 搜索与网页读取按有效结果计量

- **Date:** 2026-11-19
- **Type:** fix
- **Scope:** `deepseek-webtool`
- **PR:** [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351)

[English](2026-11-19-deepseek-webtool-metering.md)

## 变更内容

搜索无匹配结果或网页正文为空时，计量为零。一次请求返回有效结果计 1,000 个输入单位，搜索返回多条结果也只计一次。两个 SDK 都会照常返回空结果对应的网页条目。
