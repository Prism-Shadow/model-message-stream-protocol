# 未发布

[English](README.md)

- [2026-10-23] 历史记录保存深拷贝；一个有状态调用尚未结束时再发起有状态调用会抛出 `ConcurrentCallError`；客户端没有任何可发送内容的消息抛出 `InvalidMessageError`，不再被丢弃或以空内容发送；嵌入向量按 `index` 与输入配对；`mmsp` 客户端补上 `created_at`，并在流于 `stop` 事件之前结束时抛出 `IncompleteStreamError`。([详情](2026-10-23-history-copies-and-empty-messages.zh.md), [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291))
- [2026-10-23] 新增 `RoutingError`、`InvalidMessageError`、`UnsupportedContentError`、`UnknownEventError`、`ProviderStreamError` 与 `ConcurrentCallError`，每个都是它所取代的内置错误的子类；每个 MMSP 错误都连同字段经 MMSP 服务端转发。([详情](2026-10-23-typed-error-classes.zh.md), [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288))
- [2026-10-23] 配置页按每个 `UniConfig` 字段给出每个客户端发送、忽略或抛错的情况。([详情](2026-10-23-configuration-docs.zh.md), [#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289))
- [2026-10-23] `anthropic-official` 在 Claude Sonnet 4.6、Opus 4.8、Sonnet 5 与 Opus 5 上为 `ThinkingLevel.NONE` 关闭思考，无论是否设置思考摘要；在 Fable 5 上以最低 effort 运行。([详情](2026-10-23-thinking-level-gaps.zh.md), [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293))
- [2026-10-23] 模型索引显示各条目的延迟与吞吐（构建时由状态探测数据写入页面，单位在列标题中），改由每行末尾的按钮打开集成代码（可复制代码或复制给 Agent），并显示了小米标志。([详情](2026-10-23-site-model-index.zh.md), [#284](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/284))
- [2026-10-23] 模型监测页顶部改为一张按总体状态着色的卡片，状态改用图标，每个渠道的数字和可用率与名称同处柱条上方一行，可切换 7、30、90 天并前后翻页（一年的历史及按年归档），逐日柱条可弹出当天卡片，看板铺满页面宽度，并在构建时写入探测数据、每次探测后重新构建；状态键改用 `+` 连接三元组。([详情](2026-10-23-site-status-page.zh.md), [#283](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/283))
- [2026-10-23] TokenDance 上 DeepSeek V4.1 Flash 的注册表条目及其 CI 用例由 `deepseek-official` 改为 `openai-chat`，即该网关的 Chat Completions 协议。([详情](2026-10-23-tokendance-openai-chat.zh.md), [#286](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/286))
- [2026-10-23] Chat Completions 客户端把网关的加密推理块记录为 `encrypted_content`、`format` 与 `reasoning_id`，并在回传时重建该块，不再原样保存整个块。([详情](2026-10-23-openai-chat-generic-fidelity.zh.md), [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287))
- [2026-10-23] Playground 回复头只显示模型与时刻；耗时留在回复下方的用量行。([详情](2026-10-23-playground-reply-head.zh.md), [#281](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/281))
- [2026-10-23] 站点的 RFC 页面移至 `/rfcs/`，旧地址跳转到新地址；文档与 RFC 页面新增搜索，可用 ⌘K / Ctrl K 打开。([详情](2026-10-23-site-rfc-pages-and-search.zh.md), [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285))
- [2026-10-23] RFC 流程的索引与 RFC 中的「网站」一条改为写明站点 `/rfcs/` 的 RFCs 区，不再写文档的「设计」分组。([详情](2026-10-23-design-rfc-placement.zh.md), [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285))
- [2026-10-23] 站点顶栏改为概览、文档、RFC、模型索引、模型监测、更新日志，站点构建新增读取状态探测文件的模块。([详情](2026-10-23-site-top-bar.zh.md), [#282](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/282))
- [2026-10-23] 两个包都把值为 0 的 token 计数保留为 0，不再变成 null；兼容 Responses 协议的客户端把服务端未给出的计数报告为 null，不再报告为 0。([详情](2026-10-23-usage-zero-counts.zh.md), [#279](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/279))
- [2026-10-23] 实况 E2E 测试像重试限流一样重试 `IncompleteStreamError`。([详情](2026-10-23-e2e-retry-incomplete-stream.zh.md), [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280))
