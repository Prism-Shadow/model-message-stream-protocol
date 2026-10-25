# MMSP-RFC-0001 RFC 流程

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Updated by: [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: process

[English](MMSP-RFC-0001-rfc-process.md)

## Abstract

采纳 `design/`：MMSP 遵守的每项规范，以及每个修改协议或公开 API 的决定，都是一篇 RFC，一篇只记一个决定，合并它的 PR 即为采纳。现行的规范就是已采纳的 `spec` 类 RFC，索引见 [`design/README.md`](../README.zh.md)；除此之外，没有别处再陈述这些规范。

## 1. Introduction

MMSP 要遵守的规则原先写在 mmsp-dev skill 里，写法是操作指南：怎样实现一个客户端，同一条里夹着每个客户端都要保证的事。不变量和当下的做法之间没有界线，贡献者无从知道哪句话能随改动调整。

决定也没有持久的记录。变更记录只写改动做了什么，并且按规定不把理由写进仓库；理由写在 PR 描述里，后来的读者得先知道该打开哪个 PR。

项目负责人举的例子：任何客户端都不能因为思考级别而抛出异常。这是对每个调用方的承诺，不是编码技巧，而它能否成立，只取决于每个新客户端的作者有没有读到 skill 里对的那一条。项目负责人还要求，这类规则要像其他决定一样议定，一条规则一篇 RFC，而不是另写一份原则文件。

2026-10-24，项目负责人要求 RFC 规范软件里需要固定下来的一个概念、协议或算法，并像 IETF RFC 那样以名词为题（[RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200)，"Internet Protocol, Version 6 (IPv6) Specification"），而不是陈述一条规则。原话是：「RFC 应该是讨论一些软件里必须固定下来的概念、协议、定律、算法，比如 IETF RFC-8200: IPv6 Specification 的标题就是名词。」本文的形式，以及每一篇规范的形式，都依此而定。

## 2. Conventions and Terminology

本文中的关键词 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，当且仅当以全大写出现时，按 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）的定义理解。`spec` 类 RFC 中，描述代码行为的句子用 MUST 或 MUST NOT，SHOULD 与 SHOULD NOT 只用于对调用方与贡献者的要求。RFC 的中文对照把这些关键词依次写作 必须、不得、应当、不应 与 可以。

- *Spec*：固定代码遵守的一个概念、协议或算法的 RFC。
- *Change*：修改协议或公开 API 的 RFC。
- *Process*：说明这个目录如何运作的 RFC。
- *Accepted*（已采纳）：PR 已合并的 RFC 的状态。
- *Superseded*（被取代）：已采纳、后来又被另一篇 RFC 取代的 RFC 的状态，写作 `Superseded by MMSP-RFC-NNNN`。

## 3. 文档

- 目录结构：`design/README.md`（索引与流程）、`design/0000-template.md`（只有英文）与 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`；除模板外，每个文件都有 `.zh.md` 对照版本。目录中只放 Markdown，因此 CI 把对它的改动归为文档改动，不运行模型测试。
- 小节：`spec` 类 RFC 包含 Abstract、Introduction、Conventions and Terminology、以名词命名的编号正文各节，以及 Conformance，后者在文件层面列出保证它成立的模块与测试。`change` 与 `process` 类 RFC 包含 Abstract、Introduction 与 Rust RFC 的各节，全部编号。无话可说的小节直接省略。
- 语言：模板中的节名在两份文件中都保持英文；`spec` 类 RFC 正文各节的标题在中文对照中翻译，两份文件靠节号逐节对齐。
- 阅读：修改客户端之前，先读 `design/README.md` 中的索引：类别为 `spec`、状态为「已采纳」的行就是现行的规范。

## 4. 生命周期

- 发起：修改规范、消息或流的结构、公开 API、路由或凭据规则的含义，或者任何会破坏调用方的改动，都从 RFC 开始：把 [`0000-template.md`](../0000-template.md) 复制为 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`，设定它的类别，写好它和它的中文对照，向 `dev` 提交 PR。新模型、遵循既有模式的客户端、缺陷修复这类改动，仍然提普通 PR；完整的清单与步骤见 [`design/README.md`](../README.zh.md)。
- 生命周期：PR 打开即提议，合并即采纳，关闭即撤回。`design/README.md` 中的索引为每篇已采纳的 RFC 列一行，写明类别与状态，状态为「已采纳」或「被 MMSP-RFC-NNNN 取代」；这一行由 RFC 自己的 PR 添加。规范只能经由一篇 `spec` 类 RFC 修改：它完整陈述修改后的规范，并取代旧的那篇；取代旧 RFC 的 RFC，在同一个 PR 中更新旧文件的元数据与索引中旧的那一行。实现某篇 `change` 类 RFC 的 PR 加上它的 `Implementation PR` 一行。
- 优先级：代码与已采纳的 RFC 不一致时，以 RFC 为准：要么修正代码，要么先取代这篇 RFC。
- 元数据：`Feature Name`、`Start Date`、`RFC PR`、`Kind`，适用时还有 `Updated by`（`process` 类 RFC 采纳之后修改过它的 PR）、`Supersedes`、`Superseded by` 与 `Implementation PR`；PR 链接写完整 URL。
- 变更记录：RFC 的 PR 附一条 `process` 类型、Scope 为 `design` 的记录；实现 PR 附自己的记录，并链接这篇 RFC。

## 5. 编号

RFC 取目录与未关闭的 PR 都没有用过的下一个 `MMSP-RFC-NNNN`，编号永不复用。例外是 2026-10-24 的两次重新分配，都出自项目负责人的要求。[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 按项目负责人给出的标题顺序，把各条规则依次编为 MMSP-RFC-0002 到 MMSP-RFC-0013。[#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N) 随后把它们重写为九项规范 MMSP-RFC-0002 到 MMSP-RFC-0009，新增 MMSP-RFC-0010，并给每一篇一个名词标题，顺序同样出自项目负责人。内容按下表迁移：

| 0.5.5 的编号 | 第一次重编号（#298） | 内容现在所在 |
| --- | --- | --- |
| MMSP-RFC-0002 所有模型共用一套协议 | MMSP-RFC-0002 消息协议须统一 | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md)；[MMSP-RFC-0009 §6](MMSP-RFC-0009-protocol-conversion.zh.md)（顺序） |
| MMSP-RFC-0003 同一套流语法，由基类收尾 | MMSP-RFC-0003 请求须异步流式（流语法）；MMSP-RFC-0005（`IncompleteStreamError`） | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md) |
| MMSP-RFC-0004 路由是显式的 | MMSP-RFC-0006 客户端路由须显式；MMSP-RFC-0011（版本匹配） | [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md)；[MMSP-RFC-0003 §6](MMSP-RFC-0003-message-requests.zh.md) |
| MMSP-RFC-0005 凭据只发往它被指定的地方 | MMSP-RFC-0007 保护密钥安全 | [MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md) |
| MMSP-RFC-0006 每个思考级别在每个客户端上都可用 | MMSP-RFC-0010 支持全部思考等级 | [MMSP-RFC-0003 §6](MMSP-RFC-0003-message-requests.zh.md) |
| MMSP-RFC-0007 被拒绝的值抛出有类型的错误 | MMSP-RFC-0009 异常要有类型 | [MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md) |
| MMSP-RFC-0008 回传最小化，fidelity 是例外通道 | MMSP-RFC-0004 消息结构保持精简；MMSP-RFC-0005（`tool_call_id`、不带签名的思考） | [MMSP-RFC-0002 §5](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么)；[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md) |
| MMSP-RFC-0009 两个包，一份契约 | MMSP-RFC-0002 消息协议须统一 | [MMSP-RFC-0002 §6](MMSP-RFC-0002-message-protocol.zh.md#6-两个包中的同一套协议) |
| MMSP-RFC-0010 每条流都以用量和结束原因收尾 | MMSP-RFC-0005 重要字段不能丢弃 | [MMSP-RFC-0003 §5](MMSP-RFC-0003-message-requests.zh.md) |
| MMSP-RFC-0011 思考经往返转换不丢失 | MMSP-RFC-0005 重要字段不能丢弃 | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md) |
| MMSP-RFC-0012 转换直白，不带冗余 | MMSP-RFC-0013 实现代码须直观；MMSP-RFC-0004（不带冗余） | [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md)；[MMSP-RFC-0002 §5](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) |
| — | MMSP-RFC-0008 历史消息不改变 | [MMSP-RFC-0004 §6](MMSP-RFC-0004-message-fidelity.zh.md) |
| — | MMSP-RFC-0012 允许中断请求 | [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md) |
| — | — | [MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md)，新增 |

网站把前两套编号下的每个旧网址，都重定向到现在承载其内容的文档。

## 6. 指引与网站

- 指引：`AGENTS.md` 与 mmsp-dev skill 说明具体怎么做，其中服务于某篇 RFC 的规则以 `(MMSP-RFC-NNNN)` 注明。`AGENTS.md` 写明这个目录以及何时需要 RFC；mmsp-dev skill 要求修改客户端之前先读这些规范；README 链接这个目录。
- 网站：`/rfcs/` 的 RFCs 区直接用仓库中的 `design/README.md` 与每一篇 `design/rfcs/MMSP-RFC-*.md` 以两种语言渲染，因此新增一篇 RFC 就多一个页面，不必修改网站代码。

## 7. Drawbacks

改动之前要多读一处文档，而且规范分散在多个文件里，不在同一页上；要一眼看全，靠的是索引。规范可能与代码脱节：每句话写下时都对照过代码，但之后的改动可能让某句话失效，直到有人在评审时把两者对照着读。

## 8. Rationale and Alternatives

- 像 penguin-harness-design 那样，在 RFC 之外另设一份原则文件：项目负责人没有采用。那样会有两份文档陈述规范，一份作为现状，一份作为决定；一项规范一篇 RFC 时，陈述规范的文件就是做出这个决定的文件，而索引就是现状。
- 把规则写在 skill 里：不采用。skill 是操作指南，每加一个客户端都会改；规范只因决定而改变。两者分开，skill 才能引用规范。
- 另建一个设计仓库，再用软链接接入：不采用。MMSP 是一个仓库、两个包，工作树很多，每个工作树都要建一遍链接。
- 在文件里设状态字段：不采用。PR 的状态就是 RFC 的状态；索引只记录读者从文件本身看不出的那一件事，即后来有没有别的 RFC 取代了它。
- 架构决策记录（ADR）：它的简短格式（背景、决定、后果）与当初的规则 RFC 很接近；`change` 类 RFC 保留 Rust 的节次，因为原先缺的正是备选方案与先例。
- 规范性关键词：RFC 8200 本身用小写的 must 与 should；MMSP 采用 BCP 14 的大写形式，因为每一句规范性语句都要对照代码核查，大写的 MUST 能逐条核查，小写的 must 只是行文。

## 9. Prior Art

- [Rust RFC](https://github.com/rust-lang/rfcs)：模板，以及一篇只记一个决定的做法。
- [IETF RFC](https://www.ietf.org/process/rfcs/)：名词标题、Abstract、编号的小节与 BCP 14；形式上以 [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) 为范本。
- Prism-Shadow/penguin-harness-design（私有仓库）：`PRN-NNN` 原则与 `PRFC-NNNN` RFC 并列。本流程保留 RFC，不设原则文件。
- [架构决策记录](https://adr.github.io/)。
- [Python PEP](https://peps.python.org/pep-0001/)：刻意没有照搬它的状态流转。

## 10. Unresolved Questions

Conformance 小节是否保留。它列的是文件，而文件会移动；目前保留，因为它告诉读者去哪里核对一项规范。

## 11. Future Possibilities

增加一项 CI 检查，确认每个 Conformance 小节列出的路径都存在，并且每篇 `spec` 类 RFC 在索引中都有一行。
