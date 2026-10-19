# MMSP 设计

[English](README.md)

MMSP 依照这里的设计构建。代码与设计不一致时，以设计为准：要么修正代码，要么先经 RFC 修改设计。

| 文件 | 内容 |
| --- | --- |
| [`PRINCIPLES.md`](PRINCIPLES.zh.md) | 每项改动都要遵守的不变量，从 `PRN-001` 起编号 |
| [`rfcs/`](rfcs/) | 一个文件记录一个决定，`MRFC-NNNN-<slug>.md` |
| [`0000-template.md`](0000-template.md) | 新 RFC 的起点 |

除模板外，每个文件都有一份中文对照 `<name>.zh.md`，逐节对应。网站直接用这些文件渲染设计原则与每一篇 RFC，放在文档的「设计」分组中。

## 哪些改动需要 RFC

- 修改任何一条原则。
- 修改消息或流的结构：内容项的类型或字段，`UniEvent`、`UniMessage` 或 `UniConfig` 的键，`StreamItems` 的判定方式。
- 修改公开 API：`AutoLLMClient` 的方法与构造参数、包的导出、错误类。
- 改变路由表或凭据规则的含义。新增一行不算。
- 修改 MMSP 服务端的线上协议（`/v1/stream`、`/v1/models`）。
- 任何会破坏调用方的改动。

新模型或新一代模型、遵循既有模式的新厂商或新协议客户端、新增的模型族或客户端类型行、注册表条目、文档、网站、CI 与缺陷修复，提普通 PR 即可。

## 编写 RFC

1. 从 `origin/dev` 拉出 `rfc/<slug>` 分支，把 `0000-template.md` 复制为 `rfcs/MRFC-NNNN-<slug>.md`。`NNNN` 取 `ls design/rfcs/` 与未关闭的 PR（`gh pr list --search "MRFC-"`）都没有用过的下一个编号；编号永不复用。一篇 RFC 只记一个决定。
2. 在同一个 PR 中写好中文对照 `MRFC-NNNN-<slug>.zh.md`，两份文件的节名都保持英文。两份文件在元数据下方的一行互相链接：`[中文版](MRFC-NNNN-<slug>.zh.md)` 与 `[English](MRFC-NNNN-<slug>.md)`。
3. 修改原则的 RFC 在同一个 PR 中修改 `PRINCIPLES.md` 及其对照版本，在 `Principles:` 一行列出涉及的编号，并在每条被修改原则的末尾追加一行 `RFCs: [MRFC-NNNN](rfcs/MRFC-NNNN-<slug>.md)`。
4. 按 [`changelog/README.md`](../changelog/README.zh.md) 的格式添加一条 `Type: process`、`Scope: design` 的变更记录。
5. 用 `gh pr create --base dev` 提交 PR，标题为 `MRFC-NNNN: <Title>`，然后在后续提交中把 PR 链接填进 `RFC PR` 一行。

未关闭的 PR 是提议中的 RFC，合并即被采纳，关闭即被撤回，编号作废。RFC 没有状态字段。实现某篇已采纳 RFC 的 PR 在 `RFC PR` 一行之后加上 `- Implementation PR: [#N](<url>)`，并在自己的变更记录中链接这篇 RFC。取代另一篇 RFC 的 RFC，在同一个 PR 中往旧文件的元数据末尾追加 `- Superseded by: [MRFC-NNNN](MRFC-NNNN-<slug>.md)`。

## 写作规则

- 原则是不变量：一到三句规范性陈述，至多几行必要的细节，然后是 `Enforced by:`（中文版写作「实现位置：」），在文件层面列出保证它成立的模块与测试。
- 原则的每一句话都要符合代码。不符合时，要么修正代码，要么经 RFC 修改这句话。
- 数字要么是不变量，要么带有时态。不写数量，也不写当下的清单：有哪些客户端，某个客户端支持哪些模型。
- 代码标识符、文件路径与 RFC 的节名在两种语言中都保持英文。
- PR 与 issue 链接写完整 URL；指向仓库内文件的链接用相对路径。
- 不设索引文件：`ls design/rfcs/` 列出所有 RFC，`grep -l PRN-004 design/rfcs/` 找出涉及某条原则的 RFC。
