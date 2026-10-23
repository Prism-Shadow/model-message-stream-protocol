# 未发布

[English](README.md)

- [2026-10-23] 模型监测页顶部改为一张按总体状态着色的卡片，状态改用图标，每个渠道的数字和可用率与名称同处柱条上方一行，可切换 7、30、90 天并前后翻页（一年的历史及按年归档），逐日柱条可弹出当天卡片，看板铺满页面宽度，并在构建时写入探测数据、每次探测后重新构建；状态键改用 `+` 连接三元组。([详情](2026-10-23-site-status-page.zh.md), [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283))
- [2026-10-23] 站点顶栏改为概览、文档、RFC、模型索引、模型监测、更新日志，站点构建新增读取状态探测文件的模块。([详情](2026-10-23-site-top-bar.zh.md), [#282](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/282))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
