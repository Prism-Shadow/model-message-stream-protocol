# MMSP 设计

[English](README.md)

MMSP 遵守的每项**规范**，以及每个修改**协议或公开 API 的决定**，都记录为一篇 RFC。**优先级**：代码与已采纳的 RFC 不一致时，以 RFC 为准——要么修正代码，要么先修改 RFC。

## 全部 RFC

| RFC | 标题 | 类别 | 状态 |
| --- | --- | --- | --- |
| [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.zh.md) | RFC 流程 | process | 已采纳 |
| [MMSP-RFC-0002](rfcs/MMSP-RFC-0002-message-protocol.zh.md) | 消息协议 | spec | 已采纳 |
| [MMSP-RFC-0003](rfcs/MMSP-RFC-0003-message-requests.zh.md) | 消息请求 | spec | 已采纳 |
| [MMSP-RFC-0004](rfcs/MMSP-RFC-0004-message-fidelity.zh.md) | 消息保真 | spec | 已采纳 |
| [MMSP-RFC-0005](rfcs/MMSP-RFC-0005-client-routing.zh.md) | 客户端路由 | spec | 已采纳 |
| [MMSP-RFC-0006](rfcs/MMSP-RFC-0006-upstream-credentials.zh.md) | 服务上游密钥 | spec | 已采纳 |
| [MMSP-RFC-0007](rfcs/MMSP-RFC-0007-error-types.zh.md) | 异常类型 | spec | 已采纳 |
| [MMSP-RFC-0008](rfcs/MMSP-RFC-0008-request-interruption.zh.md) | 请求中断 | spec | 已采纳 |
| [MMSP-RFC-0009](rfcs/MMSP-RFC-0009-protocol-conversion.zh.md) | 协议转换 | spec | 已采纳 |
| [MMSP-RFC-0010](rfcs/MMSP-RFC-0010-trace-recording.zh.md) | 轨迹记录 | spec | 已采纳 |
| [MMSP-RFC-0011](rfcs/MMSP-RFC-0011-prompt-cache-sessions.zh.md) | 提示缓存会话 | change | 已采纳 |
| [MMSP-RFC-0012](rfcs/MMSP-RFC-0012-thinking-priced-as-output.zh.md) | 思考按输出计价 | change | 被 MMSP-RFC-0013 取代 |
| [MMSP-RFC-0013](rfcs/MMSP-RFC-0013-output-priced-by-modality.zh.md) | 输出按模态计价 | change | 已采纳 |

- **类别**：`spec` 固定代码遵守的概念、协议或算法；`change` 修改协议或公开 API；`process` 定义本目录的运作方式。
- **状态**：取值为「已采纳」或「被 MMSP-RFC-NNNN 取代」。现行规范即状态为「已采纳」的 `spec` 行。
- **未合入的 RFC**：提议中的 RFC 是未关闭的 PR（`gh pr list --search "MMSP-RFC-"`），撤回的 RFC 是已关闭的 PR；两者均不列入上表。
- **历史重编号**：RFC 曾于 2026-10-24 按项目负责人要求重编号两次，MMSP-RFC-0014 又于 2026-11-18 重编号为 MMSP-RFC-0011；各次编号的对应关系见 [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.zh.md#5-编号) §5。

| 文件 | 内容 |
| --- | --- |
| [`rfcs/`](rfcs/) | 一个文件记录一个决定（`MMSP-RFC-NNNN-<slug>.md`）及其中文对照 `.zh.md` |
| [`0000-template.md`](0000-template.md) | 新 RFC 的英文模板起点 |

- **双语对齐**：除 `0000-template.md` 外，每个文件都有逐节对应的 `<name>.zh.md`，由网站直接渲染于 `/rfcs/`。

## 哪些改动需要 RFC

- **修改规范**：修改任何现有规范。
- **消息或流结构**：修改内容项类型或字段、`UniEvent` / `UniMessage` / `UniConfig` 的键，或 `StreamItems` 的判定方式。
- **公开 API**：修改 `AutoLLMClient` 的方法与构造参数、包导出项或错误类。
- **路由或凭据规则**：改变路由表或凭据规则的语义（仅新增一行无需 RFC）。
- **线上协议**：修改 MMSP 服务端接口（`/v1/stream`、`/v1/models`）。
- **破坏性变更**：任何会破坏现有调用方的改动。

**仅需普通 PR**（无需 RFC）：新增模型、遵循既有模式的新厂商或新协议客户端、新增模型族或客户端类型行、注册表条目、文档、网站、CI 及缺陷修复。

## 编写 RFC

1. **创建文件与编号**：从 `origin/dev` 拉出 `rfc/<slug>` 分支，把 `0000-template.md` 复制为 `rfcs/MMSP-RFC-NNNN-<slug>.md`（一篇只记一个决定）。`NNNN` 取 `design/rfcs/` 与未关闭 PR（`gh pr list --search "MMSP-RFC-"`）中最大编号之后的下一个连续编号。
2. **设置类别与小节**：将 `Kind` 设为 `spec`（含 Abstract、Introduction、Conventions and Terminology、编号正文各节、Conformance）或 `change` / `process`（含 Abstract、Introduction 与编号的 Rust RFC 各节）。删去空白小节。
3. **编写中文对照**：在同一 PR 中添加 `MMSP-RFC-NNNN-<slug>.zh.md`。模板节名保持英文，`spec` 正文标题翻译为中文并靠节号对齐，元数据下方互链 `[中文版](MMSP-RFC-NNNN-<slug>.zh.md)` 与 `[English](MMSP-RFC-NNNN-<slug>.md)`。
4. **更新索引与变更记录**：在上表新增一行（状态设为「已采纳」，随 PR 合并生效），并按 [`changelog/README.md`](../changelog/README.zh.md) 添加 `Type: process`、`Scope: design` 记录。
5. **提交 PR**：运行 `gh pr create --base dev`（标题 `MMSP-RFC-NNNN: <Title>`），随后将 PR 链接填入 `RFC PR`。

## 修改已采纳的 RFC

已采纳的 RFC（含规范）一律**原地修改**：

1. **双语原地修改**：从 `origin/dev` 拉出 `rfc/<slug>` 分支，同时修改中英文文件（保留编号、标题、索引行及完整现行规范）。
2. **记录背景与 PR**：在 `Introduction` 补充本次修改的具体情形与 PR 链接，并在两份文件的 `- Updated by:` 末尾追加该 PR 链接（若无则加在 `RFC PR` 之后）。
3. **提交 PR**：添加 `Type: process`、`Scope: design` 变更记录，运行 `gh pr create --base dev`（标题 `MMSP-RFC-NNNN: <改了什么>`）。

- **整篇取代旧规范**：新建一篇 RFC 并在 `Supersedes:` 写明旧编号；其 PR 在中英文旧文件元数据末尾追加 `- Superseded by: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md)` 并更新上表旧行状态。
- **PR 状态与实现关联**：PR 打开即提议，合并即采纳，关闭即撤回。实现 `change` 类 RFC 的 PR 在 `RFC PR` 后添加 `- Implementation PR: [#N](<url>)`，并在其变更记录中链接该 RFC。

## 写作规则

- **视觉层级优先**：使用短句、列表项**加粗引导词**与表格代替密集长段落，让读者一眼抓住重点。
- **规范结构**：`Abstract` 用 1–2 句话写明固定了什么，正文分编号小节陈述，最后在 `Conformance` 列出文件级的实现模块与测试。
- **规范性关键词（BCP 14）**：描述代码行为用 `MUST` / `MUST NOT`（`必须` / `不得`），对调用方与贡献者的要求用 `SHOULD` / `SHOULD NOT` / `MAY`（`应当` / `不应` / `可以`）。每句规范性语句必须与代码一致。
- **数字只写不变量**：数字要么是不变量，要么带明确历史时间，不写当前客户端或模型的数量与清单。
- **格式与链接**：代码标识符、文件路径与模板节名在中英文中均保持英文；PR / issue 用完整 URL，仓库内文件用相对路径。
- **唯一索引**：上表是唯一索引，可用 `grep -l MMSP-RFC-0004 design/rfcs/` 查找引用某项规范的 RFC。
