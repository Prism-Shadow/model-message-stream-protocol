# MMSP-RFC-0001 RFC 流程

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Updated by: [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301), [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#341](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/341)
- Kind: process

[English](MMSP-RFC-0001-rfc-process.md)

## Abstract

启用 `design/` 目录，将 MMSP 遵守的每项**规范**及每个**修改协议或公开 API 的决定**记录为独立的 RFC（合并 PR 即为采纳）。现行规范即 [`design/README.md`](../README.zh.md) 索引中已采纳的 `spec` 类 RFC。

## 1. Introduction

- **不变量埋没在操作指南中**：核心承诺（例如“任何客户端都不得因思考级别抛出异常”）原本混在 `mmsp-dev` skill 的编码步骤里，贡献者无法区分不可妥协的契约与权宜做法。
- **决策理由散落在 PR 中**：变更记录按规定只写改动内容，设计理由留在 PR 描述里，事后难以检索。
- **流程演进时间线**：
  - **2026-10-19（[#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)）**：确立“一项决定一篇 RFC”，不另设原则文件。
  - **2026-10-24（[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)）**：按项目负责人要求（「RFC 应该是讨论一些软件里必须固定下来的概念、协议、定律、算法，比如 IETF RFC-8200: IPv6 Specification 的标题就是名词」），以 IETF [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) 为范本，将 RFC 定型为以名词为题的概念、协议或算法规范。
  - **2026-11-02（[#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)）**：在网页搜索与抓取功能被迫重写四篇双语规范后，按项目负责人决定改为**原地修改**（「原地修改吧」）。
  - **2026-11-18（[#341](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/341)）**：按项目负责人要求（「RFC 太啰嗦了，没有主次分明，优化一下，让阅读障碍的人也能看懂」）确立**视觉层级优先**规范——1–3 句精炼摘要、`Introduction` 中分离核心动机与按 PR 排列的修订表、`Conventions and Terminology` 每条术语独立成项，并以粗体引导列表或速查表格替代大段密集正文。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，仅在这一含义上使用。`spec` 类 RFC 中，描述代码行为用 MUST 或 MUST NOT（必须、不得），对调用方与贡献者的要求用 SHOULD、SHOULD NOT 或 MAY（应当、不应、可以）。

- **Spec**：固定代码遵守的一个概念、协议或算法的 RFC。
- **Change**：修改协议或公开 API 的 RFC。
- **Process**：定义 `design/` 目录如何运作的 RFC。
- **Accepted（已采纳）**：PR 已合并的 RFC 状态。
- **Superseded（被取代）**：已采纳后被另一篇新 RFC 整篇取代的状态（写作 `Superseded by MMSP-RFC-NNNN`）。

## 3. 文档

- **目录结构**：包含 `design/README.md`（索引与流程）、`design/0000-template.md`（仅英文）与 `design/rfcs/MMSP-RFC-NNNN-<slug>.md` 及 `.zh.md` 对照版本。因目录仅含 Markdown，CI 将其归为文档改动，不运行模型测试。
- **小节结构**：
  - **`spec` 类 RFC**：含 `Abstract`、`Introduction`、`Conventions and Terminology`、名词标题的编号正文各节，以及列出文件级模块与测试的 `Conformance`。
  - **`change` 与 `process` 类 RFC**：含 `Abstract`、`Introduction` 与编号的 Rust RFC 各节；空白小节直接省略。
- **双语对齐**：模板节名在中英文文件中均保持英文；`spec` 正文标题在 `.zh.md` 中翻译为中文，靠节号逐节对齐。
- **改动前必读**：修改客户端前先读 `design/README.md` 索引，其中状态为「已采纳」的 `spec` 行即为现行规范。

## 4. 生命周期

- **发起 RFC**：修改规范、消息或流结构、公开 API、路由或凭据规则语义，或任何破坏调用方的改动，均须先提 RFC：将 [`0000-template.md`](../0000-template.md) 复制为 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`，写好中英文版本并向 `dev` 提 PR（新增模型、常规客户端与缺陷修复仍提普通 PR，详见 [`design/README.md`](../README.zh.md)）。
- **状态流转**：PR 打开即提议，合并即采纳，关闭即撤回。RFC 自身的 PR 负责在 `design/README.md` 索引中添加对应行（状态为「已采纳」或「被 MMSP-RFC-NNNN 取代」）。
- **原地修改与整篇取代**：
  - **原地修改**：已采纳的 RFC（含规范）在中英文原文上直接修改，保留编号与索引行，并在 `Updated by` 追加 PR 链接。
  - **整篇取代**：整篇替换旧规范时新建 RFC 并填写 `Supersedes:`，同时更新旧文件元数据（`Superseded by`）与索引行状态。
  - **实现关联**：实现 `change` 类 RFC 的 PR 在该 RFC 元数据中添加 `Implementation PR`。
- **优先级**：代码与已采纳的 RFC 不一致时，以 RFC 为准——要么修正代码，要么先修改 RFC。
- **元数据字段**：必含 `Feature Name`、`Start Date`、`RFC PR`、`Kind`，按需包含 `Updated by`、`Supersedes`、`Superseded by` 与 `Implementation PR`（PR 链接一律写完整 URL）。
- **变更记录**：RFC PR 附一条 `Type: process`、`Scope: design` 记录；实现 PR 附各自记录并链接该 RFC。

## 5. 编号

每篇 RFC 取目录与未关闭 PR 均未用过的下一个 `MMSP-RFC-NNNN`，编号永不复用。唯一例外是 2026-10-24 按项目负责人要求执行的两次重编号：[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 将规则编为 `0002`–`0013`，[#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301) 随后将其重写为名词标题的九项规范 `0002`–`0009` 并新增 `0010`：

| 0.5.5 的编号 | 第一次重编号（#298） | 内容现在所在 |
| --- | --- | --- |
| MMSP-RFC-0002 所有模型共用一套协议 | MMSP-RFC-0002 消息协议须统一 | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md)；[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#6-顺序) §6（顺序） |
| MMSP-RFC-0003 同一套流语法，由基类收尾 | MMSP-RFC-0003 请求须异步流式（流语法）；MMSP-RFC-0005（`IncompleteStreamError`） | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md) |
| MMSP-RFC-0004 路由是显式的 | MMSP-RFC-0006 客户端路由须显式；MMSP-RFC-0011（版本匹配） | [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md)；[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#6-请求参数) §6 |
| MMSP-RFC-0005 凭据只发往它被指定的地方 | MMSP-RFC-0007 保护密钥安全 | [MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md) |
| MMSP-RFC-0006 每个思考级别在每个客户端上都可用 | MMSP-RFC-0010 支持全部思考等级 | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#6-请求参数) §6 |
| MMSP-RFC-0007 被拒绝的值抛出有类型的错误 | MMSP-RFC-0009 异常要有类型 | [MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md) |
| MMSP-RFC-0008 回传最小化，fidelity 是例外通道 | MMSP-RFC-0004 消息结构保持精简；MMSP-RFC-0005（`tool_call_id`、不带签名的思考） | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5；[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md) |
| MMSP-RFC-0009 两个包，一份契约 | MMSP-RFC-0002 消息协议须统一 | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#6-两个包中的同一套协议) §6 |
| MMSP-RFC-0010 每条流都以用量和结束原因收尾 | MMSP-RFC-0005 重要字段不能丢弃 | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5 |
| MMSP-RFC-0011 思考经往返转换不丢失 | MMSP-RFC-0005 重要字段不能丢弃 | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md) |
| MMSP-RFC-0012 转换直白，不带冗余 | MMSP-RFC-0013 实现代码须直观；MMSP-RFC-0004（不带冗余） | [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md)；[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5 |
| — | MMSP-RFC-0008 历史消息不改变 | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#6-相同的前缀) §6 |
| — | MMSP-RFC-0012 允许中断请求 | [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md) |
| — | — | [MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md)，新增 |

- **旧网址重定向**：网站将前两套编号下的所有旧网址重定向至当前承载其内容的文档。

## 6. 指引与网站

- **开发指引**：`AGENTS.md` 与 `mmsp-dev` skill 以 `(MMSP-RFC-NNNN)` 标注所依据的 RFC，要求修改客户端前先读规范；根 README 链接 `design/` 目录。
- **网站自动渲染**：网站 `/rfcs/` 直接渲染 `design/README.md` 与每篇 `design/rfcs/MMSP-RFC-*.md` 的中英文版本，新增 RFC 无需修改网站代码。

## 7. Drawbacks

- **跨文件阅读**：规范分散在多份文件中，需依赖索引全局浏览。
- **代码脱节风险**：后续改动可能使某句规范暂时失真，需靠代码评审对照修正。

## 8. Rationale and Alternatives

- **另设原则文件（`penguin-harness-design` 模式）**：项目负责人未采用，以免“现状”与“决定”重复维护；每篇 `spec` RFC 本身既是决定也是现行规范，由索引汇总现状。
- **将规则留在 `mmsp-dev` skill 中**：未采用；skill 是随每个客户端更新的操作指南，而规范只随正式决定改变，分离后 skill 可直接引用规范。
- **独立设计仓库加软链接**：未采用；MMSP 含两个包且常用多个 git worktree，逐个维护软链接成本过高。
- **文件内设状态字段**：未采用；PR 状态即代表提议、采纳或撤回，索引表仅额外记录文件自身看不出的“是否被取代”。
- **每次修改都新建完整 `spec` RFC（2026-11-02 前规则）**：改为原地修改，避免因改动一两句话而重述整篇规范并破坏编号与引用；历史交由 `Updated by` 与 `git log` 记录。
- **架构决策记录（ADR）**：ADR 的简短结构接近早期规则 RFC，但 `change` 类 RFC 保留了 Rust RFC 节次以完整记录备选方案与先例。
- **大写 BCP 14 关键词**：未采用 RFC 8200 的小写 `must`/`should`，以便将每句大写 `MUST`（必须）与代码逐条核对。

## 9. Prior Art

- **[Rust RFC](https://github.com/rust-lang/rfcs)**：采用其模板结构与“一篇文件一个决定”的做法。
- **[IETF RFC](https://www.ietf.org/process/rfcs/)**：采用其名词标题、`Abstract`、编号小节、BCP 14 关键词及 [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) 的体例。
- **`Prism-Shadow/penguin-harness-design`（私有仓库）**：保留其 RFC（`PRFC-NNNN`）机制，省去独立的原则文件（`PRN-NNN`）。
- **[架构决策记录](https://adr.github.io/)**：轻量级决策记录格式参考。
- **[Python PEP](https://peps.python.org/pep-0001/)**：参考其先例，但刻意不照搬其文件内状态流转。

## 10. Unresolved Questions

- **`Conformance` 小节的去留**：尽管文件可能移动，目前仍予保留，以便读者快速定位核验规范的代码与测试文件。

## 11. Future Possibilities

- **CI 自动校验**：检查每个 `Conformance` 小节列出的文件路径是否存在，以及每篇 `spec` 类 RFC 是否均已列入索引。
