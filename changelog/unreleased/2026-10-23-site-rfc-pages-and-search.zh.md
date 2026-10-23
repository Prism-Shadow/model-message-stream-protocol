# 站点的 RFC 页面移至 /rfcs/，新增文档与 RFC 搜索

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `design`

[English](2026-10-23-site-rfc-pages-and-search.md)

## 变更内容

- RFC 从文档侧边栏的「设计」分组移入独立的 RFCs 区：索引（`design/README.md`）位于 `/rfcs/`，每篇 RFC 位于 `/rfcs/mmsp-rfc-NNNN-<slug>/`，Markdown 版本位于 `/rfcs/index.md` 与 `/rfcs/mmsp-rfc-NNNN-<slug>.md`，`/zh/` 下同理。RFCs 区的侧边栏只有一个分组 RFCs，先列索引，再以编号加标题列出每篇 RFC；上一篇与下一篇只在该区域内跳转。
- 旧地址 `/docs/rfcs/` 与 `/docs/mmsp-rfc-NNNN-<slug>/`（以及对应的 `/zh/` 地址）改为跳转到新地址的页面，按 `design/rfcs/` 中的文件逐一生成，在 `site/astro.config.mjs` 中计算。旧的 `.md` 地址不做跳转。
- 新增文档与 RFC 搜索：`/search/en.json` 与 `/search/zh.json` 随站点构建，每个页面以及每个 h2/h3 小节各一条记录；`site/src/shared/search.ts` 移植了 penguin.ooo/docs 的匹配方式（NFKC 归一化、每个词都须出现、计分、带匹配标记的摘要），并把当前区域的结果排在前面。搜索框可从侧边栏顶部的按钮、窄屏下分组选择器旁的图标按钮或 ⌘K / Ctrl K 打开，用 ↑ ↓ Enter Esc 操作。
- `llms.txt` 新增 `## RFC` 一节，中文列表加入 RFC 页面，模型页与状态页改称 Model Index 与 Model Status；`sitemap.xml` 列出 RFC 页面。
- 顶栏的 RFCs 入口与「设计哲学」页改为链接 `/rfcs/` 下的 RFC 索引。
- `site/README.md` 写明了 RFCs 区、搜索、`site/src/shared/status-build.ts`，以及模型目录与状态页由探测文件构建。
