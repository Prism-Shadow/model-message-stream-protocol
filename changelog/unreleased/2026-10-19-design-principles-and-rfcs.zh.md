# 设计原则与 RFC 流程

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `design`, `skills`, `docs`, `site`
- **PR:** [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)

[English](2026-10-19-design-principles-and-rfcs.md)

## 变更内容

- 新增 `design/PRINCIPLES.md`，收录 MMSP 在两个包中对每个模型都遵守的不变量（PRN-001 至 PRN-008）：同一套协议，由基类收尾的同一套流语法，显式路由，凭据只发往它被指定的地方，每个思考级别都可用，被拒绝的值抛出有类型的错误，最小化回放并以 `fidelity` 作为例外通道，两个包遵守同一份契约。
- 新增 RFC 流程：`design/README.md`、`design/0000-template.md`（采用 Rust RFC 的节次，PR 链接写完整 URL）与 `design/rfcs/MRFC-0001-rfc-process.md`。MRFC-0001 采纳了前两者，并规定修改原则须经 RFC。除模板外，每个文件都有 `.zh.md` 对照版本。
- 文档侧边栏新增「设计」分组，直接从仓库文件以两种语言渲染 `design/PRINCIPLES.md` 与每一篇 `design/rfcs/MRFC-*.md`；`pages.yml` 的触发路径加入了 `design/**`。
- `AGENTS.md`、README 与 mmsp-dev skill 增加了指向 `design/` 的说明；skill 中的规则与 `AGENTS.md` 中的对应规则以 `(PRN-00x)` 标注各自所依据的原则。
