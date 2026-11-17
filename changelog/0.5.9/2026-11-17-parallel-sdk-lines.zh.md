# 旧 SDK 版本线的离线测试与实况测试并行运行

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `ci`
- **PR:** [#338](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/338)

[English](2026-11-17-parallel-sdk-lines.md)

## 变更内容

- 在 `anthropic[bedrock]<2` 与 `==0.87.0`、`google-genai<3` 与 `==2.23.0` 上重跑的 Python 离线测试，从 Python 测试任务移入 `.github/workflows/pytest-sdk-lines.yml`，每条版本线一个任务，CI 与发布前检查都让它们与 Python 测试同时开始。
- 这些测试不调用模型，此前却在实况测试之后、在 TypeScript 测试所等待的任务里运行，使每次运行多出约 2 分钟。**CI passed** 与两个发布任务仍要求它们通过。
