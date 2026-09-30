# 站点改动不再运行模型测试

- **Date:** 2026-09-30
- **Type:** chore
- **Scope:** `ci`

[English](2026-09-30-ci-site-paths.md)

## 变更内容

- TypeScript 与 Python 的测试 workflow 忽略 `site/` 下的改动。此前站点自带的 TypeScript 文件与 `package.json` 会触发模型测试；现在只改站点时只运行站点构建。
