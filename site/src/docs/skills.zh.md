---
description: 教会编码助手写出正确 MMSP 代码的 skill 文件。
---

编码助手如果没见过 MMSP，就只能靠猜。本仓库提供了 skill 文件，供 Claude Code、Codex 以及所有支持 skill 的助手使用。这些文件会告诉助手需要知道的一切：安装命令、可运行的工具调用循环、数据模型和模型 id。

| Skill | 用途 | 目录 |
| --- | --- | --- |
| `mmsp-python` | 使用 Python 包的代码 | [`skills/mmsp-python`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-python) |
| `mmsp-typescript` | 使用 TypeScript 包的代码 | [`skills/mmsp-typescript`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-typescript) |

## 安装 skill

将 skill 目录放到助手读取的位置：全局目录 `~/.claude/skills/`、项目内目录 `.claude/skills/` 或 Codex 目录 `.agents/skills/`。一行命令即可从仓库的压缩包中提取目录及其参考文件：

<div class="code-group" data-labels="Python skill,TypeScript skill">

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-python
```

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-typescript
```

</div>

如果助手不支持 skill，可以通过链接读取文件。将以下文本粘贴给助手，它就能获得 skill 的全部内容：

```text
Read https://github.com/Prism-Shadow/model-message-stream-protocol/blob/main/skills/mmsp-python/SKILL.md and the reference files it links, then write an agent that calls get_weather with MMSP.
```

## Skill 包含的文件

| 文件 | 内容 |
| --- | --- |
| `SKILL.md` | 安装方法、完整的工具调用示例、agent 循环规则 |
| `reference/models.md` | 模型 id、key、base URL、兼容端点路由 |
| `reference/data-models.md` | `UniConfig`、`UniMessage`、`UniEvent`、文法、错误 |
| `reference/api.md` | 客户端创建方法及其 API |
| `reference/integrations.md` | Tracer 和 Playground |

## 开发 MMSP 本身

添加新模型或服务商遵循固定流程：快照服务商的文档、捕获真实流、成对编写 Python 和 TypeScript 客户端、运行共享测试。这套流程也已写成 skill，位于 [`.agents/skills/mmsp-dev`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/.agents/skills/mmsp-dev)。
