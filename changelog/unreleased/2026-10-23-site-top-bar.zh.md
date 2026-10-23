# 站点顶栏：文档、RFC、模型索引与模型监测

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`

[English](2026-10-23-site-top-bar.md)

## 变更内容

- 顶栏的八个入口（概览、快速开始、协议、参考、工具、模型、状态、更新日志）改为六个：概览、文档、RFC、模型索引、模型监测、更新日志。「文档」打开介绍页，在每个文档页上高亮；「RFC」打开 RFC 索引，在每个 RFC 页上高亮。
- 模型页的标题改为「模型索引」，状态页改为「模型监测」；模型页的简介把「此刻是否可用」改为「此刻的延迟与吞吐」。
- `site/src/shared/i18n.ts` 以中英两种语言新增了文档与 RFC 搜索、模型目录的延迟与吞吐列和代码按钮，以及状态页可用率的文案。
- 新增 `site/src/shared/status-build.ts`：`statusAtBuild()` 在每次构建中读取一次状态探测的 `latest.json`、`history.json` 与 `monthly.json`，优先从 `MMSP_STATUS_DIR` 指向的目录读取，否则以 10 秒超时从 raw.githubusercontent.com 上的 `status-data` 分支读取，都读不到时返回空并打印警告，不会让构建失败。
