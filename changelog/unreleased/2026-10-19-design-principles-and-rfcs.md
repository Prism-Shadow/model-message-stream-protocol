# Design principles and the RFC process

- **Date:** 2026-10-19
- **Type:** process
- **Scope:** `design`, `skills`, `docs`, `site`
- **PR:** [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)

[中文版](2026-10-19-design-principles-and-rfcs.zh.md)

## What changed

- Added `design/PRINCIPLES.md`, the invariants MMSP keeps for every model in both packages (PRN-001 to PRN-008): one protocol, one stream grammar closed by the base class, explicit routing, a credential goes only where it was given for, every thinking level usable, a rejected value raises a typed error, minimal replay with `fidelity` as the exception channel, and two packages with one contract.
- Added the RFC process: `design/README.md`, `design/0000-template.md` (the Rust RFC sections, PR links as full URLs) and `design/rfcs/MRFC-0001-rfc-process.md`, which adopted both and made an RFC the way a principle changes. Every file except the template has a `.zh.md` counterpart.
- Added a Design section to the docs sidebar, which renders `design/PRINCIPLES.md` and every `design/rfcs/MRFC-*.md` from the repository's files in both languages, and added `design/**` to the paths `pages.yml` builds the site for.
- Pointed `AGENTS.md`, the README and the mmsp-dev skill at `design/`; the skill's rules and the matching rules of `AGENTS.md` cite the principle they serve as `(PRN-00x)`.
