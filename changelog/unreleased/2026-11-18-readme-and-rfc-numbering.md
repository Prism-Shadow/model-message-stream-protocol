# Concise bilingual README and contiguous RFC numbering

- **Date:** 2026-11-18
- **Type:** process
- **Scope:** `design`, `site`
- **PR:** [#347](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/347)

[中文版](2026-11-18-readme-and-rfc-numbering.zh.md)

## What changed

- [`README.md`](../../README.md) trimmed `## Supported Models` and `### Clients` to the primary model families and core official/protocol clients, removed the specialized web-tool and audio examples (`deepseek-search`, `deepseek-speech`, `openai-transcription`), condensed `## APIs` and `## MMSP Server`, dropped the duplicate `## Wire Protocols` table, and added a language toggle to [`README.zh.md`](../../README.zh.md).
- [`README.zh.md`](../../README.zh.md) added the Chinese counterpart of the root README.
- [MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-prompt-cache-sessions.md) Prompt Cache Sessions was renumbered from `MMSP-RFC-0014` in both languages so the RFC sequence in [`design/README.md`](../../design/README.md) runs contiguously from `0001` through `0011`, with `site/astro.config.mjs` redirecting the old `mmsp-rfc-0014-prompt-cache-sessions` URLs.
