# MRFC-0001 设计原则与 RFC 流程

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Principles: PRN-001 to PRN-008

[English](MRFC-0001-rfc-process.md)

## Summary
[summary]: #summary

采纳 `design/`：[`PRINCIPLES.md`](../PRINCIPLES.zh.md) 收录 MMSP 在两个包中对每个模型都遵守的不变量（PRN-001 至 PRN-008），另设一套 RFC 流程，原则、协议与公开 API 都经由它修改，一篇 RFC 只记一个决定。

## Motivation
[motivation]: #motivation

MMSP 要遵守的规则原先写在 mmsp-dev skill 里，写法是操作指南：怎样实现一个客户端，同一条里夹着每个客户端都必须保证的事。不变量和当下的做法之间没有界线，贡献者无从知道哪句话可以随改动调整。

决定也没有持久的记录。变更记录只写改动做了什么，并且按规定不把理由写进仓库；理由写在 PR 描述里，后来的读者得先知道该打开哪个 PR。

项目负责人举的例子：任何客户端都不能因为思考级别而抛出异常。这是对每个调用方的承诺，不是编码技巧，而它能否成立，只取决于每个新客户端的作者有没有读到 skill 里对的那一条。

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

修改客户端之前，先读 `design/PRINCIPLES.md`。每条原则由一段简短的规范性陈述、必要的细节和保证它成立的文件组成。`AGENTS.md` 与 mmsp-dev skill 仍然说明具体怎么做；其中服务于某条原则的规则，以 `(PRN-00x)` 注明。

修改原则、消息或流的结构、公开 API、路由或凭据规则的含义，或者任何会破坏调用方的改动，都从 RFC 开始：把 [`0000-template.md`](../0000-template.md) 复制为 `design/rfcs/MRFC-NNNN-<slug>.md`，写好它和它的中文对照，向 `dev` 提交 PR。新模型、遵循既有模式的客户端、缺陷修复这类改动，仍然提普通 PR。完整的清单与步骤见 [`design/README.md`](../README.zh.md)。

代码与原则不一致时，以原则为准：要么修正代码，要么先经 RFC 修改原则。

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

- 目录结构：`design/README.md`（流程）、`design/PRINCIPLES.md`（每条原则一个 `## PRN-NNN Title` 小节）、`design/0000-template.md`（只有英文）与 `design/rfcs/MRFC-NNNN-<slug>.md`；除模板外，每个文件都有 `.zh.md` 对照版本。目录中只放 Markdown，因此 CI 把对它的改动归为文档改动，不运行模型测试。
- 编号：RFC 取目录与未关闭的 PR 都没有用过的下一个 `MRFC-NNNN`，新原则取下一个 `PRN-NNN`。编号永不复用。
- 模板：沿用 Rust RFC 的节次，从 Summary 到 Future possibilities，元数据为 `Feature Name`、`Start Date`、`RFC PR` 与 `Principles`；PR 链接写完整 URL。
- 生命周期：PR 打开即提议，合并即采纳，关闭即撤回。实现 PR 加上 `Implementation PR` 一行；取代另一篇的 RFC 在旧文件中加上 `Superseded by`。
- 原则：修改原则的 RFC 在同一个 PR 中修改 `PRINCIPLES.md` 及其对照版本，并在 `Principles:` 一行写明；被修改的原则以一行 `RFCs:` 结尾，链接修改过它的每一篇 RFC。
- 变更记录：RFC 的 PR 附一条 `process` 类型、Scope 为 `design` 的记录；实现 PR 附自己的记录，并链接这篇 RFC。
- 指引：`AGENTS.md` 写明这个目录以及何时需要 RFC；mmsp-dev skill 要求修改客户端之前先读原则，并给其中的规则标上 `(PRN-00x)`；README 链接这个目录。
- 网站：文档侧边栏有一个「设计」分组，直接用仓库中的 `PRINCIPLES.md` 与每一篇 `design/rfcs/MRFC-*.md` 以两种语言渲染，因此新增一篇 RFC 就多一个页面，不必修改网站代码。

## Drawbacks
[drawbacks]: #drawbacks

改动之前要多读一份文档。原则可能与代码脱节：每句话写下时都对照过代码，但之后的改动可能让某句话失效，直到有人在评审时把两者对照着读。

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- 把原则写在 skill 里：不采用。skill 是操作指南，每加一个客户端都会改；不变量只因决定而改变。两者分开，skill 才能引用原则。
- 像 penguin-harness-design 那样另建一个设计仓库，再用软链接接入：不采用。MMSP 是一个仓库、两个包，工作树很多，每个工作树都要建一遍链接。
- 状态字段：不采用。PR 的状态就是 RFC 的状态，另设字段只会与它脱节。
- 架构决策记录（ADR）：它的简短格式（背景、决定、后果）不要求写出备选方案与先例，而 Rust 的节次要求写，缺的正是这部分。

## Prior art
[prior-art]: #prior-art

- [Rust RFC](https://github.com/rust-lang/rfcs)：模板，以及一篇只记一个决定的做法。
- Prism-Shadow/penguin-harness-design（私有仓库）：`PRN-NNN` 原则与 `PRFC-NNNN` RFC 并列。本流程沿用这一结构，但放在同一个仓库里。
- [架构决策记录](https://adr.github.io/)。
- [Python PEP](https://peps.python.org/pep-0001/)：刻意没有照搬它的状态流转。

## Unresolved questions
[unresolved-questions]: #unresolved-questions

`Enforced by:` 一行是否保留。它列的是文件，而文件会移动；目前保留，因为它告诉读者去哪里核对一条原则。

## Future possibilities
[future-possibilities]: #future-possibilities

增加一项 CI 检查，确认每一行 `Enforced by:` 列出的路径都存在。
