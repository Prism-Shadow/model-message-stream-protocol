---
description: Skill files that teach a coding agent to write correct MMSP code.
---

A coding agent that has never seen MMSP guesses at it. The repository ships skill files, for Claude Code, Codex and any assistant that reads skills, that tell it what it needs: the install command, a tool-call loop that works, the data models, the model ids.

| Skill | For | Folder |
| --- | --- | --- |
| `mmsp-python` | Code that uses the Python package | [`skills/mmsp-python`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-python) |
| `mmsp-typescript` | Code that uses the TypeScript package | [`skills/mmsp-typescript`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-typescript) |

## Install a skill

Copy the folder into the place your assistant reads skills from. For Claude Code that is `.claude/skills/` in the project, or `~/.claude/skills/` for every project.

```bash
git clone https://github.com/Prism-Shadow/model-message-stream-protocol.git
cp -r model-message-stream-protocol/skills/mmsp-python .claude/skills/
```

## What a skill holds

| File | Holds |
| --- | --- |
| `SKILL.md` | Installation, a complete tool-call example, the rules of an agent loop |
| `reference/models.md` | Model ids, keys, base URLs, routing to compatible endpoints |
| `reference/data-models.md` | `UniConfig`, `UniMessage`, `UniEvent`, the grammar, the errors |
| `reference/api.md` | How to create a client, and its methods |
| `reference/integrations.md` | The tracer and the playground |

## Working on MMSP itself

Adding a model or a provider follows a fixed workflow: snapshot the provider's documentation, capture its real streams, write the Python and TypeScript clients as a pair, and run the shared tests against the model. It is written down as a skill too, in [`.agents/skills/mmsp-dev`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/.agents/skills/mmsp-dev).
