# Restructured the RFC suite and style guide for visual hierarchy and readability

- **Date:** 2026-11-18
- **Type:** process
- **Scope:** `design`
- **PR:** [#341](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/341)

[中文版](2026-11-18-rfc-readability-and-hierarchy.zh.md)

## What changed

- [`design/README.md`](../../design/README.md), [`design/0000-template.md`](../../design/0000-template.md) and [MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.md) RFC Process added a visual-hierarchy rule in both languages: short 1–3 sentence abstracts, separate core motivation and chronological revision tables in `## 1. Introduction`, one `- **Term**: definition` bullet per term in `## 2. Conventions and Terminology`, and bold lead-in bullets or tables in place of prose walls.
- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) through [MMSP-RFC-0010](../../design/rfcs/MMSP-RFC-0010-trace-recording.md) and [MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-prompt-cache-sessions.md), edited in place in English and Chinese, reorganized dense prose into scannable summary tables, bold-anchored bullet lists and separated revision histories while preserving every normative requirement, heading, field name and wire rule.
