# MMSP-RFC-0002 had CI test the smallest model of each vendor's newest generation

- **Date:** 2026-11-21
- **Type:** process
- **Scope:** `design`, `skills`
- **PR:** [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)

[中文版](2026-11-21-ci-smallest-model-rfc.zh.md)

## What changed

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) Message Protocol, edited in place in both languages, with the case added to its Introduction. §7 had `.github/ci/models.json` carry one text model for each official client on its vendor's own endpoint, the smallest model of the vendor's newest generation, and none of that generation's larger tiers. Every other modality the vendor serves kept its own case, Amazon Bedrock kept the one Claude model the CI key reaches, and compatible-client, gateway and `slow` cases stayed outside the rule.
- `mmsp-dev` skill: Stage 4 stated the same catalog rule in place of keeping the newest version of each model family.
