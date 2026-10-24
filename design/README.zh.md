# MMSP 设计

[English](README.md)

MMSP 遵守的规则，以及改变过它的决定，每一项都是一篇 RFC。代码与已采纳的 RFC 不一致时，以 RFC 为准：要么修正代码，要么先经另一篇 RFC 取代它。

## 全部 RFC

| RFC | 标题 | 类别 | 状态 |
| --- | --- | --- | --- |
| [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.zh.md) | RFC 流程 | process | 已采纳 |
| [MMSP-RFC-0002](rfcs/MMSP-RFC-0002-one-protocol.zh.md) | 消息协议须统一 | rule | 已采纳 |
| [MMSP-RFC-0003](rfcs/MMSP-RFC-0003-async-streaming.zh.md) | 请求须异步流式 | rule | 已采纳 |
| [MMSP-RFC-0004](rfcs/MMSP-RFC-0004-lean-messages.zh.md) | 消息结构保持精简 | rule | 已采纳 |
| [MMSP-RFC-0005](rfcs/MMSP-RFC-0005-essential-fields.zh.md) | 重要字段不能丢弃 | rule | 已采纳 |
| [MMSP-RFC-0006](rfcs/MMSP-RFC-0006-explicit-routing.zh.md) | 客户端路由须显式 | rule | 已采纳 |
| [MMSP-RFC-0007](rfcs/MMSP-RFC-0007-credential-scope.zh.md) | 保护密钥安全 | rule | 已采纳 |
| [MMSP-RFC-0008](rfcs/MMSP-RFC-0008-immutable-history.zh.md) | 历史消息不改变 | rule | 已采纳 |
| [MMSP-RFC-0009](rfcs/MMSP-RFC-0009-typed-errors.zh.md) | 异常要有类型 | rule | 已采纳 |
| [MMSP-RFC-0010](rfcs/MMSP-RFC-0010-thinking-levels-usable.zh.md) | 支持全部思考等级 | rule | 已采纳 |
| [MMSP-RFC-0011](rfcs/MMSP-RFC-0011-explicit-parameters.zh.md) | 模型请求参数不模糊匹配 | rule | 已采纳 |
| [MMSP-RFC-0012](rfcs/MMSP-RFC-0012-interruptible-requests.zh.md) | 允许中断请求 | rule | 已采纳 |
| [MMSP-RFC-0013](rfcs/MMSP-RFC-0013-direct-implementation.zh.md) | 实现代码须直观 | rule | 已采纳 |

`rule` 是代码遵守的不变量；`change` 修改协议或公开 API；`process` 是这个目录的运作方式。状态为「已采纳」或「被 MMSP-RFC-NNNN 取代」，因此现行的规则就是状态为「已采纳」的 `rule` 行。提议中的 RFC 是一个未关闭的 PR（`gh pr list --search "MMSP-RFC-"`），撤回的 RFC 是一个已关闭的 PR；两者在表中都没有行。

规则 RFC 曾于 2026-10-24 按项目负责人的要求重编号一次；[MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.zh.md) 列出 0.5.5 的编号与现在编号的对应关系。

| 文件 | 内容 |
| --- | --- |
| [`rfcs/`](rfcs/) | 一个文件记录一个决定，`MMSP-RFC-NNNN-<slug>.md` |
| [`0000-template.md`](0000-template.md) | 新 RFC 的起点 |

除模板外，每个文件都有一份中文对照 `<name>.zh.md`，逐节对应。网站直接用这些文件在 `/rfcs/` 渲染这份索引与每一篇 RFC。

## 哪些改动需要 RFC

- 修改任何一条规则。
- 修改消息或流的结构：内容项的类型或字段，`UniEvent`、`UniMessage` 或 `UniConfig` 的键，`StreamItems` 的判定方式。
- 修改公开 API：`AutoLLMClient` 的方法与构造参数、包的导出、错误类。
- 改变路由表或凭据规则的含义。新增一行不算。
- 修改 MMSP 服务端的线上协议（`/v1/stream`、`/v1/models`）。
- 任何会破坏调用方的改动。

新模型或新一代模型、遵循既有模式的新厂商或新协议客户端、新增的模型族或客户端类型行、注册表条目、文档、网站、CI 与缺陷修复，提普通 PR 即可。

## 编写 RFC

1. 从 `origin/dev` 拉出 `rfc/<slug>` 分支，把 `0000-template.md` 复制为 `rfcs/MMSP-RFC-NNNN-<slug>.md`。`NNNN` 取 `ls design/rfcs/` 与未关闭的 PR（`gh pr list --search "MMSP-RFC-"`）都没有用过的下一个编号；编号永不复用。一篇 RFC 只记一个决定。把 `Kind` 设为 `rule`、`change` 或 `process`：规则 RFC 保留 Summary、Motivation、Rule 与 Enforced by 四节；`change` 与 `process` 类 RFC 保留 Summary、Motivation 与 Rust RFC 的各节。无话可说的小节直接删去。
2. 在同一个 PR 中写好中文对照 `MMSP-RFC-NNNN-<slug>.zh.md`，两份文件的节名都保持英文。两份文件在元数据下方的一行互相链接：`[中文版](MMSP-RFC-NNNN-<slug>.zh.md)` 与 `[English](MMSP-RFC-NNNN-<slug>.md)`。
3. 规则只能经由一篇规则 RFC 修改：它完整陈述修改后的规则，并在 `Supersedes:` 一行写明旧的那篇。在同一个 PR 中，往旧文件的元数据末尾追加 `- Superseded by: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md)`，两种语言都要加，并在上表中更新旧行的状态。
4. 在上表中添加这篇 RFC 的一行，状态为「已采纳」：这一行随 PR 合并落地，而合并正是采纳这篇 RFC 的方式。
5. 按 [`changelog/README.md`](../changelog/README.zh.md) 的格式添加一条 `Type: process`、`Scope: design` 的变更记录。
6. 用 `gh pr create --base dev` 提交 PR，标题为 `MMSP-RFC-NNNN: <Title>`，然后在后续提交中把 PR 链接填进 `RFC PR` 一行。

未关闭的 PR 是提议中的 RFC，合并即被采纳，关闭即被撤回，编号作废。RFC 文件没有状态字段；它是「已采纳」还是「被取代」，由上表记录。实现某篇已采纳的 `change` 类 RFC 的 PR 在 `RFC PR` 一行之后加上 `- Implementation PR: [#N](<url>)`，并在自己的变更记录中链接这篇 RFC。

## 写作规则

- 规则的 Summary 是一到三句规范性陈述；Rule 一节至多几行必要的细节；Enforced by 一节在文件层面列出保证它成立的模块与测试。
- 规则的每一句话都要符合代码。不符合时，要么修正代码，要么取代这条规则。
- 数字要么是不变量，要么带有时态。不写数量，也不写当下的清单：有哪些客户端，某个客户端支持哪些模型。
- 代码标识符、文件路径与 RFC 的节名在两种语言中都保持英文。
- PR 与 issue 链接写完整 URL；指向仓库内文件的链接用相对路径。
- 上表是唯一的索引。`grep -l MMSP-RFC-0004 design/rfcs/` 找出引用某条规则的 RFC。
