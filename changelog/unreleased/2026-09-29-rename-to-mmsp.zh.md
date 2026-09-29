# AgentHub 更名为 MMSP，即 Model Message Stream Protocol

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `mmsp`, `errors`, `integration`, `skills`
- **PR:** [#223](https://github.com/Prism-Shadow/mmsp/pull/223)
- **Breaking:** yes — 软件包、Python 模块、错误基类与环境变量都换了名字

[English](2026-09-29-rename-to-mmsp.md)

## 变更内容

- 项目从 AgentHub 更名为 MMSP，即 Model Message Stream Protocol：面向所有模型服务商的同一套消息格式与同一套流式语法。仓库迁至 `https://github.com/Prism-Shadow/mmsp`。
- Python 包 `agenthub-python` 更名为 `mmsp`，其模块 `agenthub` 更名为 `mmsp`：`from mmsp import AutoLLMClient`。
- npm 包 `@prismshadow/agenthub` 更名为 `@prismshadow/mmsp`：`import { AutoLLMClient } from "@prismshadow/mmsp"`。
- 两个包抛出的所有错误的基类 `AgentHubError` 更名为 `MMSPError`。
- 环境变量 `AGENTHUB_DEBUG` 与 `AGENTHUB_CACHE_DIR` 更名为 `MMSP_DEBUG` 与 `MMSP_CACHE_DIR`。
- skill 目录 `skills/agenthub-python`、`skills/agenthub-typescript` 与 `.agents/skills/agenthub-dev` 更名为 `skills/mmsp-python`、`skills/mmsp-typescript` 与 `.agents/skills/mmsp-dev`，skill 本身随之更名。

## 兼容性

- 用 `mmsp` 替换 `agenthub-python`，用 `@prismshadow/mmsp` 替换 `@prismshadow/agenthub` 进行安装；旧包不再发布新版本。
- Python 导入中把 `agenthub` 换成 `mmsp`，TypeScript 导入中把 `@prismshadow/agenthub` 换成 `@prismshadow/mmsp`，`AgentHubError` 换成 `MMSPError`，环境变量的 `AGENTHUB_` 前缀换成 `MMSP_`。其余一切不变：类名、方法、消息与事件格式、trace 文件都与之前相同。
- 在安装过这些 skill 的编码助手环境里，用新的 skill 目录覆盖旧目录。
