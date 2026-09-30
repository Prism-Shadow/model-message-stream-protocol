---
description: 教会编码助手写出正确 MMSP 代码的 skill 文件。
---

没见过 MMSP 的编码助手只能靠猜。仓库随附了 skill 文件，供 Claude Code、Codex 以及任何读取 skill 的助手使用，告诉它需要知道的一切：安装命令、一个能跑通的工具调用循环、数据模型、模型 id。

| Skill | 用于 | 目录 |
| --- | --- | --- |
| `mmsp-python` | 使用 Python 包的代码 | [`skills/mmsp-python`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-python) |
| `mmsp-typescript` | 使用 TypeScript 包的代码 | [`skills/mmsp-typescript`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-typescript) |

## 安装 skill

把目录放到你的助手读取 skill 的地方：所有项目共用的 `~/.claude/skills/`，单个项目里的 `.claude/skills/`，Codex 的 `.agents/skills/`。一行命令从仓库的 tarball 里取出这个目录，连同参考文件：

<div class="code-group" data-labels="Python skill,TypeScript skill">

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-python
```

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-typescript
```

</div>

不支持 skill 的助手可以通过链接读同一个文件。把这段话贴给它，它就有了 skill 里的全部内容：

```text
Read https://github.com/Prism-Shadow/model-message-stream-protocol/blob/main/skills/mmsp-python/SKILL.md and the reference files it links, then write an agent that calls get_weather with MMSP.
```

## Skill 里有什么

| 文件 | 内容 |
| --- | --- |
| `SKILL.md` | 安装方法、一个完整的工具调用示例、agent 循环的规则 |
| `reference/models.md` | 模型 id、key、base URL、到兼容端点的路由 |
| `reference/data-models.md` | `UniConfig`、`UniMessage`、`UniEvent`、文法、错误 |
| `reference/api.md` | 如何创建客户端，以及它的方法 |
| `reference/integrations.md` | Tracer 和 Playground |

## 开发 MMSP 本身

添加一个模型或提供商遵循固定的流程：快照提供商的文档，捕获它真实的流，成对编写 Python 和 TypeScript 客户端，对该模型运行共享的测试。这套流程同样写成了 skill，在 [`.agents/skills/mmsp-dev`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/.agents/skills/mmsp-dev)。
