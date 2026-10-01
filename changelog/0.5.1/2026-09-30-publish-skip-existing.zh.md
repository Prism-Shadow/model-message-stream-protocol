# 发布 workflow 跳过已发布的版本

- **Date:** 2026-09-30
- **Type:** chore
- **Scope:** `ci`
- **PR:** [#237](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/237)

[English](2026-09-30-publish-skip-existing.md)

## 变更内容

- 重跑发布，或版本已手动发布时，`publish.yml` 不再失败：PyPI 步骤跳过 PyPI 上已有的文件，npm 步骤在该版本已在 npm 上时跳过 `npm publish`。
