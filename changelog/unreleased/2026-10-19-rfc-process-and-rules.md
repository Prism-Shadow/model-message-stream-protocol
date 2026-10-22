# The RFC process and the rules MMSP keeps

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `design`, `skills`, `docs`, `site`
- **PR:** [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)

[中文版](2026-10-19-rfc-process-and-rules.zh.md)

## What changed

- Added `design/`, where every rule MMSP keeps and every decision that changes it is an RFC, `design/rfcs/MMSP-RFC-NNNN-<slug>.md` with a `.zh.md` twin. `design/README.md` indexes them with their kind and status and says when a change needs an RFC; `design/0000-template.md` is the file an RFC starts from.
- Added MMSP-RFC-0001, the RFC process, and the eleven rules MMSP-RFC-0002 to MMSP-RFC-0012: one protocol for every model; one stream grammar, closed by the base class, whose `.done` items are their fragments joined; routing is explicit; a credential goes only where it was given for; every thinking level is usable on every client; a rejected value raises a typed error; replay is minimal with `fidelity` as the exception channel; two packages, one contract; every stream ends with its usage and finish reason; thinking survives the round trip; conversion is direct and carries nothing redundant.
- Added a Design section to the docs sidebar, which renders `design/README.md` and every `design/rfcs/MMSP-RFC-*.md` from the repository's files in both languages, and added `design/**` to the paths `pages.yml` builds the site for.
- Pointed `AGENTS.md`, the README and the mmsp-dev skill at `design/`; the skill's rules and the matching rules of `AGENTS.md` cite the RFC they serve as `(MMSP-RFC-NNNN)`.
