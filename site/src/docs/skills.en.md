---
description: Skill files that teach a coding agent to write correct MMSP code.
---

A coding agent that has never seen MMSP guesses at it. The repository ships skill files, for Claude Code, Codex and any assistant that reads skills, that tell it what it needs: the install command, a tool-call loop that works, the data models, the model ids.

| Skill | For | Folder |
| --- | --- | --- |
| `mmsp-python` | Code that uses the Python package | [`skills/mmsp-python`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-python) |
| `mmsp-typescript` | Code that uses the TypeScript package | [`skills/mmsp-typescript`](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills/mmsp-typescript) |

## Install a skill

Put the folder where your assistant reads skills from: `~/.claude/skills/` for every project, `.claude/skills/` in one project, `.agents/skills/` for Codex. One line takes the folder, reference files included, out of the repository's tarball:

<div class="code-group" data-labels="Python skill,TypeScript skill">

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-python
```

```bash
mkdir -p ~/.claude/skills && curl -fsSL https://github.com/Prism-Shadow/model-message-stream-protocol/archive/main.tar.gz | tar -xz -C ~/.claude/skills --strip-components=2 model-message-stream-protocol-main/skills/mmsp-typescript
```

</div>

An assistant that takes no skills can read the same file from a link. Paste this, and it has what the skill holds:

```text
Read https://github.com/Prism-Shadow/model-message-stream-protocol/blob/main/skills/mmsp-python/SKILL.md and the reference files it links, then write an agent that calls get_weather with MMSP.
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
