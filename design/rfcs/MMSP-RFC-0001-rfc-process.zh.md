# MMSP-RFC-0001 RFC 流程

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: process

[English](MMSP-RFC-0001-rfc-process.md)

## Summary
[summary]: #summary

采纳 `design/`：MMSP 遵守的每条规则，以及每个修改协议或公开 API 的决定，都是一篇 RFC，一篇只记一个决定，合并它的 PR 即为采纳。现行的规则就是已采纳的规则 RFC，索引见 [`design/README.md`](../README.zh.md)；除此之外，没有别处再陈述这些规则。

## Motivation
[motivation]: #motivation

MMSP 要遵守的规则原先写在 mmsp-dev skill 里，写法是操作指南：怎样实现一个客户端，同一条里夹着每个客户端都必须保证的事。不变量和当下的做法之间没有界线，贡献者无从知道哪句话可以随改动调整。

决定也没有持久的记录。变更记录只写改动做了什么，并且按规定不把理由写进仓库；理由写在 PR 描述里，后来的读者得先知道该打开哪个 PR。

项目负责人举的例子：任何客户端都不能因为思考级别而抛出异常。这是对每个调用方的承诺，不是编码技巧，而它能否成立，只取决于每个新客户端的作者有没有读到 skill 里对的那一条。项目负责人还要求，这类规则要像其他决定一样议定，一条规则一篇 RFC，而不是另写一份原则文件。

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

修改客户端之前，先读 `design/README.md` 中的索引：类别为 `rule`、状态为「已采纳」的行就是现行的规则。每条规则都是一篇由四个简短小节组成的 RFC：一到三句话的规则本身、制定它的原因、必要的细节，以及保证它成立的文件。`AGENTS.md` 与 mmsp-dev skill 仍然说明具体怎么做；其中服务于某篇 RFC 的规则，以 `(MMSP-RFC-NNNN)` 注明。

修改规则、消息或流的结构、公开 API、路由或凭据规则的含义，或者任何会破坏调用方的改动，都从 RFC 开始：把 [`0000-template.md`](../0000-template.md) 复制为 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`，设定它的类别，写好它和它的中文对照，向 `dev` 提交 PR。规则只能经由一篇规则 RFC 修改：这篇 RFC 完整陈述修改后的规则，并取代旧的那篇。新模型、遵循既有模式的客户端、缺陷修复这类改动，仍然提普通 PR。完整的清单与步骤见 [`design/README.md`](../README.zh.md)。

代码与已采纳的 RFC 不一致时，以 RFC 为准：要么修正代码，要么先取代这篇 RFC。

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

- 目录结构：`design/README.md`（索引与流程）、`design/0000-template.md`（只有英文）与 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`；除模板外，每个文件都有 `.zh.md` 对照版本。目录中只放 Markdown，因此 CI 把对它的改动归为文档改动，不运行模型测试。
- 类别：`rule`，代码遵守的不变量；`change`，对协议或公开 API 的修改；`process`，这个目录的运作方式。规则 RFC 包含 Summary、Motivation、Rule 与 Enforced by 四节；`change` 与 `process` 类 RFC 采用 Rust RFC 的节次，从 Summary 到 Future possibilities。无话可说的小节直接省略。
- 编号：RFC 取目录与未关闭的 PR 都没有用过的下一个 `MMSP-RFC-NNNN`，编号永不复用。唯一的例外是 2026-10-24 按项目负责人的要求所做的那次重编号（[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)）：十二条规则按项目负责人给出的标题顺序，依次取 MMSP-RFC-0002 到 MMSP-RFC-0013；0.5.5 的十一条规则，其内容按下表迁移。

  | 0.5.5 的编号 | 内容现在所在 |
  | --- | --- |
  | MMSP-RFC-0002 所有模型共用一套协议 | [MMSP-RFC-0002](MMSP-RFC-0002-one-protocol.zh.md) |
  | MMSP-RFC-0003 同一套流语法，由基类收尾 | [MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.zh.md)（流语法）、[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)（`IncompleteStreamError`） |
  | MMSP-RFC-0004 路由是显式的 | [MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.zh.md)（路由）、[MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.zh.md)（版本匹配） |
  | MMSP-RFC-0005 凭据只发往它被指定的地方 | [MMSP-RFC-0007](MMSP-RFC-0007-credential-scope.zh.md) |
  | MMSP-RFC-0006 每个思考级别在每个客户端上都可用 | [MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.zh.md) |
  | MMSP-RFC-0007 被拒绝的值抛出有类型的错误 | [MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md) |
  | MMSP-RFC-0008 回传最小化，fidelity 是例外通道 | [MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)（fidelity 可以存放什么）、[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)（`tool_call_id`、不带签名的思考） |
  | MMSP-RFC-0009 两个包，一份契约 | [MMSP-RFC-0002](MMSP-RFC-0002-one-protocol.zh.md) |
  | MMSP-RFC-0010 每条流都以用量和结束原因收尾 | [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md) |
  | MMSP-RFC-0011 思考经往返转换不丢失 | [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md) |
  | MMSP-RFC-0012 转换直白，不带冗余 | [MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.zh.md)（直白）、[MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)（不带冗余） |

- 元数据：`Feature Name`、`Start Date`、`RFC PR`、`Kind`，适用时还有 `Supersedes`、`Superseded by` 与 `Implementation PR`；PR 链接写完整 URL。
- 生命周期：PR 打开即提议，合并即采纳，关闭即撤回。`design/README.md` 中的索引为每篇已采纳的 RFC 列一行，写明类别与状态，状态为「已采纳」或「被 MMSP-RFC-NNNN 取代」；这一行由 RFC 自己的 PR 添加。取代旧 RFC 的 RFC，在同一个 PR 中更新旧文件的元数据与索引中旧的那一行。实现某篇 `change` 类 RFC 的 PR 加上它的 `Implementation PR` 一行。
- 变更记录：RFC 的 PR 附一条 `process` 类型、Scope 为 `design` 的记录；实现 PR 附自己的记录，并链接这篇 RFC。
- 指引：`AGENTS.md` 写明这个目录以及何时需要 RFC；mmsp-dev skill 要求修改客户端之前先读这些规则，并给其中的规则标上 `(MMSP-RFC-NNNN)`；README 链接这个目录。
- 网站：`/rfcs/` 的 RFCs 区直接用仓库中的 `design/README.md` 与每一篇 `design/rfcs/MMSP-RFC-*.md` 以两种语言渲染，因此新增一篇 RFC 就多一个页面，不必修改网站代码。

## Drawbacks
[drawbacks]: #drawbacks

改动之前要多读一处文档，而且规则分散在多个文件里，不在同一页上；要一眼看全，靠的是索引。规则可能与代码脱节：每句话写下时都对照过代码，但之后的改动可能让某句话失效，直到有人在评审时把两者对照着读。

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- 像 penguin-harness-design 那样，在 RFC 之外另设一份原则文件：项目负责人没有采用。那样会有两份文档陈述规则，一份作为现状，一份作为决定；一条规则一篇 RFC 时，陈述规则的文件就是做出这个决定的文件，而索引就是现状。
- 把规则写在 skill 里：不采用。skill 是操作指南，每加一个客户端都会改；规则只因决定而改变。两者分开，skill 才能引用规则。
- 另建一个设计仓库，再用软链接接入：不采用。MMSP 是一个仓库、两个包，工作树很多，每个工作树都要建一遍链接。
- 在文件里设状态字段：不采用。PR 的状态就是 RFC 的状态；索引只记录读者从文件本身看不出的那一件事，即后来有没有别的 RFC 取代了它。
- 架构决策记录（ADR）：它的简短格式（背景、决定、后果）与规则 RFC 很接近；`change` 类 RFC 保留 Rust 的节次，因为原先缺的正是备选方案与先例。

## Prior art
[prior-art]: #prior-art

- [Rust RFC](https://github.com/rust-lang/rfcs)：模板，以及一篇只记一个决定的做法。
- Prism-Shadow/penguin-harness-design（私有仓库）：`PRN-NNN` 原则与 `PRFC-NNNN` RFC 并列。本流程保留 RFC，不设原则文件。
- [架构决策记录](https://adr.github.io/)。
- [Python PEP](https://peps.python.org/pep-0001/)：刻意没有照搬它的状态流转。

## Unresolved questions
[unresolved-questions]: #unresolved-questions

`Enforced by` 小节是否保留。它列的是文件，而文件会移动；目前保留，因为它告诉读者去哪里核对一条规则。

## Future possibilities
[future-possibilities]: #future-possibilities

增加一项 CI 检查，确认每个 `Enforced by` 小节列出的路径都存在，并且每篇规则 RFC 在索引中都有一行。
