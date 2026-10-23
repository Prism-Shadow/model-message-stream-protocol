# RFC 流程与 MMSP 遵守的规则

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `design`, `skills`, `docs`, `site`
- **PR:** [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)

[English](2026-10-19-rfc-process-and-rules.md)

## 变更内容

- 新增 `design/`：MMSP 遵守的每条规则、改变它的每个决定，都是一篇 RFC，即 `design/rfcs/MMSP-RFC-NNNN-<slug>.md`，附 `.zh.md` 对照版本。`design/README.md` 为它们编制索引，写明类别与状态，并说明哪些改动需要 RFC；`design/0000-template.md` 是新 RFC 的起点。
- 新增 MMSP-RFC-0001（RFC 流程），以及十一条规则 MMSP-RFC-0002 至 MMSP-RFC-0012：同一套协议，由基类收尾的同一套流语法（其 `.done` 内容项就是片段的拼接），显式路由，凭据只发往它被指定的地方，每个思考级别都可用，被拒绝的值抛出有类型的错误，最小化回传并以 `fidelity` 作为例外通道，两个包遵守同一份契约，每条流都以用量和结束原因收尾，思考经往返转换不丢失，转换直白且不带冗余。
- 文档侧边栏新增「设计」分组，直接从仓库文件以两种语言渲染 `design/README.md` 与每一篇 `design/rfcs/MMSP-RFC-*.md`；`pages.yml` 的触发路径加入了 `design/**`。
- `AGENTS.md`、README 与 mmsp-dev skill 增加了指向 `design/` 的说明；skill 中的规则与 `AGENTS.md` 中的对应规则以 `(MMSP-RFC-NNNN)` 标注各自所依据的 RFC。
