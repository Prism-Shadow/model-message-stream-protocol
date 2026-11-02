# 规范改为在原文上修改；网页搜索与网页抓取写入规范

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`, `agents`
- **PR:** [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)

[English](2026-11-02-web-tools-rfcs.md)

## 变更内容

- [MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.zh.md) 与 `design/README.md`：已采纳的 RFC，包括规范，都在原文上修改。修改它的 PR 同时改两种语言，保留编号与索引中的行，在 Introduction 中加一段，并在 `Updated by` 一行追加自己的链接。`Supersedes` 只用于整篇取代另一项规范的规范。`AGENTS.md` 同步了这条规则。
- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) 消息协议：§3.4 加入 `webtool.done` 与 `webtool.delta`。内容项的 `webdata` 是 `WebData` 对象的列表，每个对象有 `title`、`content` 与 `url`：搜索按排名列出结果，每条结果的 `content` 是摘要；抓取只列出读到的那一页，`content` 是它的 Markdown。没有搜到结果时，`webdata` 为空。
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求：增长字段加入 `webdata`。§3.2 规定了网页工具端点：它们用一个 JSON 作答；Jina 的事件流随页面加载反复发送整页内容，客户端不读它；每条消息一次请求，每个回答作为一个 `webtool` 内容项发出，`stop` 带 `finish_reason` `stop`，并以 `prompt_tokens` 记录计费量：端点报告的 token 数，或按次计费时每次请求记 1，多次请求相加；搜索只请求结果的摘要，不请求页面正文。§6.1 把 `-search` 与 `-fetch` 列为模态标记，§6.3 规定不思考的模型忽略思考等级。
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md) 客户端路由：`deepseek-official` 通过 `deepseek-webtool` 服务 `deepseek-search` 与 `deepseek-fetch`，显式指定或按 ID 推断都是如此，因此模型 ID 按前缀或整个 ID 匹配；端点不列出模型的客户端，`list_models` 抛出 `UnsupportedOperationError`，与 `anthropic-official` 在 Bedrock 上的做法相同。
- [MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.zh.md) 服务上游密钥：一行的其他默认端点 `other_base_urls` 与默认端点一样读取环境变量中的密钥；未传入 base URL 的客户端调用自己的默认端点中提供其模型的那一个。客户端未拿到密钥时抛出 `ApiKeyRequiredError` 的规则，适用于每一个基于 OpenAI SDK、密钥变量不是 `OPENAI_API_KEY` 的客户端，兼容客户端也包括在内，开放服务端的客户端除外。
