# 未发布

[English](README.md)

- [2026-10-23] 站点的 RFC 页面移至 `/rfcs/`，旧地址跳转到新地址；文档与 RFC 页面新增搜索，可用 ⌘K / Ctrl K 打开。([详情](2026-10-23-site-rfc-pages-and-search.zh.md))
- [2026-10-23] RFC 流程的索引与 RFC 中的「网站」一条改为写明站点 `/rfcs/` 的 RFCs 区，不再写文档的「设计」分组。([详情](2026-10-23-design-rfc-placement.zh.md))
- [2026-10-23] 站点顶栏改为概览、文档、RFC、模型索引、模型监测、更新日志，站点构建新增读取状态探测文件的模块。([详情](2026-10-23-site-top-bar.zh.md), [#282](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/282))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
