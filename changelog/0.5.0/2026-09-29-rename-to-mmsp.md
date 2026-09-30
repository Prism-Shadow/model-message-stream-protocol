# Rename AgentHub to MMSP, the Model Message Stream Protocol

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `mmsp`, `errors`, `integration`, `skills`
- **PR:** [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)
- **Breaking:** yes — the packages, the Python module, the error base class and the environment variables changed names

[中文版](2026-09-29-rename-to-mmsp.zh.md)

## What changed

- The project was renamed from AgentHub to MMSP, the Model Message Stream Protocol: one message format and one streaming grammar for every model provider. The repository moved to `https://github.com/Prism-Shadow/model-message-stream-protocol`.
- The Python package `agenthub-python` became `mmsp`, and its module `agenthub` became `mmsp`: `from mmsp import AutoLLMClient`.
- The npm package `@prismshadow/agenthub` became `@prismshadow/mmsp`: `import { AutoLLMClient } from "@prismshadow/mmsp"`.
- `AgentHubError`, the base class of every error the packages raise, became `MMSPError`.
- The environment variables `AGENTHUB_DEBUG` and `AGENTHUB_CACHE_DIR` became `MMSP_DEBUG` and `MMSP_CACHE_DIR`.
- The skill folders `skills/agenthub-python`, `skills/agenthub-typescript` and `.agents/skills/agenthub-dev` became `skills/mmsp-python`, `skills/mmsp-typescript` and `.agents/skills/mmsp-dev`, and the skills were renamed with them.

## Compatibility

- Install `mmsp` in place of `agenthub-python` and `@prismshadow/mmsp` in place of `@prismshadow/agenthub`; the old packages receive no further releases.
- Replace `agenthub` with `mmsp` in Python imports, `@prismshadow/agenthub` with `@prismshadow/mmsp` in TypeScript imports, `AgentHubError` with `MMSPError`, and the `AGENTHUB_` prefix of the environment variables with `MMSP_`. Nothing else changed: class names, methods, message and event formats, and trace files are the same.
- Copy the new skill folders over the old ones in any coding-agent setup that installed them.
