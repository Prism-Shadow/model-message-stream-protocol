# 网页搜索与网页抓取写入规范，MMSP-RFC-0014 至 MMSP-RFC-0017

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`
- **PR:** [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)

[English](2026-11-02-web-tools-rfcs.md)

## 变更内容

- [MMSP-RFC-0014](../../design/rfcs/MMSP-RFC-0014-message-protocol.zh.md) 消息协议取代 MMSP-RFC-0002，在封闭的内容项类型集合中加入 `webtool.done` 与 `webtool.delta`。内容项的 `webdata` 是 `WebData` 对象的列表，每个对象有 `title`、`content` 与 `url`：搜索的结果按排名顺序排列，每个结果的摘要作为它的 `content`；抓取则只有读到的那一页，它的 Markdown 作为 `content`。什么也没搜到的搜索，是一个 `webdata` 为空的内容项。
- [MMSP-RFC-0015](../../design/rfcs/MMSP-RFC-0015-message-requests.zh.md) 消息请求取代 MMSP-RFC-0003。`webdata` 加入增长字段。§3.2 规定了网页工具端点：它们用一个 JSON 作答，Jina 的事件流随着网页加载把整页重发一遍，不读取；客户端每条消息发一次请求，每个答案作为一个 `webtool` 内容项流出，`stop` 的 `finish_reason` 为 `stop`，`prompt_tokens` 是各次请求计费的 token 数之和，按请求计费时每次请求记 1；搜索只要结果的摘要，从不要网页正文。§6.1 把 `-search` 与 `-fetch` 列入模态标记，§6.3 写明不思考的模型忽略思考等级。
- [MMSP-RFC-0016](../../design/rfcs/MMSP-RFC-0016-client-routing.zh.md) 客户端路由取代 MMSP-RFC-0005。`deepseek-official` 经由 `deepseek-webtool` 服务 `deepseek-search` 与 `deepseek-fetch`，无论这个客户端是指定的还是推断出的，因此模型 id 按前缀或整个 id 匹配；端点不列出模型的客户端从 `list_models` 抛出 `UnsupportedOperationError`，`anthropic-official` 在 Bedrock 上早已如此。
- [MMSP-RFC-0017](../../design/rfcs/MMSP-RFC-0017-upstream-credentials.zh.md) 服务上游密钥取代 MMSP-RFC-0006。一行的其他默认端点 `other_base_urls` 像默认端点一样接收环境变量中的密钥，未传入 base URL 的客户端调用自己的默认端点中提供其模型的那一个。客户端拿不到密钥时抛出 `ApiKeyRequiredError` 的规则，覆盖基于 OpenAI SDK、密钥变量不是 `OPENAI_API_KEY` 的每一个客户端，兼容客户端也包括在内，开放服务端的客户端除外。
- `design/README.md` 与 `design/README.zh.md` 的索引加入这四项规范，并把 MMSP-RFC-0002、MMSP-RFC-0003、MMSP-RFC-0005 与 MMSP-RFC-0006 标为已被取代；这些文件在两种语言中都加上了 `Superseded by` 一行。`AGENTS.md`、`mmsp-dev` skill、两个包中 `UnknownEventError` 的文档字符串，以及 `design/0000-template.md` 中的引用示例都改用新编号。
