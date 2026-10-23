# Playground 回复头只显示模型与时间

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `integration`
- **PR:** [#281](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/281)

[English](2026-10-23-playground-reply-head.md)

## 变更内容

- 助手回复的头部原先显示模型、耗时与时刻；耗时从头部移除，因为回复下方的用量行已写有 `Took N s`。
- 页面脚本中的 `addMessageCard` 去掉了 `tookMs` 参数，它只用于填写头部的耗时。
