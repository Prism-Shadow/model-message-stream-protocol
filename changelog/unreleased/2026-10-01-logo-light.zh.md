# 标志在亮色背景上不再有灰边，标志素材存入仓库

- **Date:** 2026-10-01
- **Type:** fix
- **Scope:** `site`, `integration`

[English](2026-10-01-logo-light.md)

## 变更内容

- 标志原先把蓝色色块画在一整块深色圆角方块上，深色方块的边缘会在亮色背景上沿蓝色色块的圆角露出一圈灰边。现在四个色块各自成形，站点、favicon、宣传图以及 Playground 与 Tracer 页面都已修正。
- `.github/images/` 存放标志素材：亮色背景用 `mmsp-logo.svg`，暗色背景用 `mmsp-logo-dark.svg`，字母已转为轮廓，任何环境下显示一致；另有各自 512 px 的 PNG。SVG 由 `site/artwork/logo.py` 生成。social preview 也只保留这一份，站点在 `/social-preview.png` 直接提供它，不再另存副本。
