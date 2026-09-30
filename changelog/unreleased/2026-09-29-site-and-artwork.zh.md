# 新增站点 mmsp.penguin.ooo 并重绘配图

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `site`, `docs`, `skills`
- **PR:** [#226](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/226)

[English](2026-09-29-site-and-artwork.md)

## 变更内容

- 新增 `site/`：一个 Astro 项目，包含首页、十二个文档页（介绍、快速开始、消息、流式、fidelity、错误、客户端、配置、模型与端点、token 用量、tracer 与 playground、agent skills），以及由 `CHANGELOG.md` 渲染的更新日志页。首页把两段录制的流逐个事件回放，旁边是它们拼成的消息。
- 新增 `.github/workflows/pages.yml`：凡是改动站点的 pull request 都会构建一次，并从 `main` 发布到 GitHub Pages；`site/public/CNAME` 指定自定义域名 `mmsp.penguin.ooo`。
- README 的 header 与概念图以 MMSP 之名重绘，并新增 GitHub social preview（1280 x 640），文件为 `.github/images/social-preview.png`。概念图展示当前的数据结构：`UniMessage` 中的 `.done` 项，以及由携带用量的 `stop` 事件收尾的 `delta` 事件流。它们的 HTML 源文件与渲染脚本位于 `site/artwork/`。
- README 增加了指向站点的链接。
- `skills/mmsp-python` 与 `skills/mmsp-typescript`：`reference/data-models.md` 的流式协议一节不再说“某个内容项在另一个仍在流式输出时开始会被暂存”，自客户端改为连续产出同一内容项的 delta 起，这已不再成立。
