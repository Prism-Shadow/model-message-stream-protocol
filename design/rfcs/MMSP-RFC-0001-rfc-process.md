# MMSP-RFC-0001 The RFC Process

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Updated by: [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301), [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#341](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/341), [#347](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/347)
- Kind: process

[中文版](MMSP-RFC-0001-rfc-process.zh.md)

## Abstract

Adopt `design/` so every **specification** MMSP conforms to and every **protocol or public API change** is recorded as an RFC (one decision per file, accepted on PR merge). The specifications in force are the accepted `spec` RFCs indexed in [`design/README.md`](../README.md).

## 1. Introduction

- **Invariants buried in how-to guides**: Core guarantees (such as *no client may raise for a thinking level*) lived inside the `mmsp-dev` skill alongside coding tips, hiding which rules were unbreakable contracts.
- **Reasoning lost in PRs**: The changelog records only what changed, leaving design rationale scattered across PR descriptions instead of in the repository.
- **Evolution of the RFC process**:
  - **2026-10-19 ([#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265))**: Adopted one RFC per decision instead of a separate principles file.
  - **2026-10-24 ([#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301))**: Per the owner's direction ("RFC 应该是讨论一些软件里必须固定下来的概念、协议、定律、算法，比如 IETF RFC-8200: IPv6 Specification 的标题就是名词"), reshaped RFCs after IETF [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) to specify fixed concepts, protocols, or algorithms with noun titles.
  - **2026-11-02 ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308))**: Switched accepted RFCs to **in-place edits** ("原地修改吧") after web search and page fetch required rewriting four full bilingual spec RFCs for a single feature.
  - **2026-11-18 ([#341](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/341))**: Added the visual-hierarchy rule ("RFC 太啰嗦了，没有主次分明，优化一下，让阅读障碍的人也能看懂") — 1–3 sentence abstracts, separated revision tables in `Introduction`, one bullet per term in `Conventions and Terminology`, and bold lead-in bullets or tables in place of prose walls.
  - **2026-11-18 ([#347](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/347))**: Renumbered MMSP-RFC-0014 Prompt Cache Sessions to MMSP-RFC-0011 so the RFCs run contiguously, and changed the rule from the next unused number, never reused, to the next consecutive number (§5).

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals. In a `spec` RFC, `MUST` and `MUST NOT` govern code behavior, `SHOULD` and `SHOULD NOT` apply to callers and contributors, and the Chinese twin renders them as 必须, 不得, 应当, 不应, and 可以.

- **Spec**: An RFC that fixes a concept, protocol, or algorithm the code conforms to.
- **Change**: An RFC that changes the protocol or the public API.
- **Process**: An RFC defining how `design/` works.
- **Accepted**: The status of an RFC whose PR has merged.
- **Superseded**: The status of an accepted RFC replaced whole by a later RFC (`Superseded by MMSP-RFC-NNNN`).

## 3. Documents

- **Layout**: `design/README.md` (index and process), `design/0000-template.md` (English only), and `design/rfcs/MMSP-RFC-NNNN-<slug>.md` with `.zh.md` twins. Because `design/` holds only Markdown, CI classifies edits as documentation and skips model tests.
- **Sections**:
  - **`spec` RFCs**: `Abstract`, `Introduction`, `Conventions and Terminology`, numbered noun-titled body sections, and `Conformance` (file-level modules and tests).
  - **`change` and `process` RFCs**: `Abstract`, `Introduction`, and numbered Rust RFC sections. Empty sections are omitted.
- **Languages**: Template section names stay English in both files; `spec` body headings are translated in `.zh.md` with matching section numbers.
- **Reading before changes**: Before modifying a client, check `design/README.md`—the `Accepted` `spec` rows are the specifications in force.

## 4. Lifecycle

- **Starting an RFC**: Required for changes to a specification, message/stream shapes, public API, routing/credential semantics, or caller compatibility. Copy [`0000-template.md`](../0000-template.md) to `design/rfcs/MMSP-RFC-NNNN-<slug>.md`, write both language files, and open a PR to `dev` (routine models, clients, and bug fixes use normal PRs; see [`design/README.md`](../README.md)).
- **State transitions**: Open PR = proposed, merged = accepted, closed = withdrawn. The RFC PR adds its own row (`Accepted` or `Superseded by MMSP-RFC-NNNN`) to `design/README.md`.
- **Editing in place vs. superseding**:
  - **In-place edit**: Accepted RFCs (including specs) are edited in place in both languages, keeping their number and index row while appending the PR URL to `Updated by`.
  - **Full replacement**: Replacing a spec whole requires a new RFC with `Supersedes:`, updating the old file's metadata (`Superseded by`) and index row.
  - **Implementation link**: The PR implementing a `change` RFC adds `Implementation PR` to the RFC metadata.
- **Precedence**: When code and an accepted RFC disagree, the RFC wins—fix the code or change the RFC first.
- **Metadata**: `Feature Name`, `Start Date`, `RFC PR`, `Kind`, plus optional `Updated by`, `Supersedes`, `Superseded by`, and `Implementation PR` (all PR links as full URLs).
- **Changelog**: Every RFC PR includes a `process` changelog entry (`Scope: design`); implementation PRs link the RFC in their own entry.

## 5. Numbering

Each RFC takes the next consecutive `MMSP-RFC-NNNN` after the highest number in `design/rfcs/` and open PRs. On 2026-10-24, [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) numbered rules `0002`–`0013`, and [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301) consolidated them into noun-titled specifications `0002`–`0009` plus `0010`:

| 0.5.5 number | First renumbering (#298) | Content now in |
| --- | --- | --- |
| MMSP-RFC-0002 One protocol for every model | MMSP-RFC-0002 One protocol for every model | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md); [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#6-order) §6 (order) |
| MMSP-RFC-0003 One stream grammar, closed by the base class | MMSP-RFC-0003 Every request is an async stream (grammar); MMSP-RFC-0005 (`IncompleteStreamError`) | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md) |
| MMSP-RFC-0004 Routing is explicit | MMSP-RFC-0006 Client routing is explicit; MMSP-RFC-0011 (version matching) | [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md); [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#6-request-parameters) §6 |
| MMSP-RFC-0005 A credential goes only where it was given for | MMSP-RFC-0007 Keys stay safe | [MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md) |
| MMSP-RFC-0006 Every thinking level is usable on every client | MMSP-RFC-0010 Every thinking level is supported | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#6-request-parameters) §6 |
| MMSP-RFC-0007 A rejected value raises a typed error | MMSP-RFC-0009 Every error is typed | [MMSP-RFC-0007](MMSP-RFC-0007-error-types.md) |
| MMSP-RFC-0008 Replay is minimal; fidelity is the exception channel | MMSP-RFC-0004 Messages stay lean; MMSP-RFC-0005 (`tool_call_id`, unsigned thinking) | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5; [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md) |
| MMSP-RFC-0009 Two packages, one contract | MMSP-RFC-0002 One protocol for every model | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#6-one-protocol-in-two-packages) §6 |
| MMSP-RFC-0010 Every stream ends with its usage and finish reason | MMSP-RFC-0005 Essential fields are never dropped | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5 |
| MMSP-RFC-0011 Thinking survives the round trip | MMSP-RFC-0005 Essential fields are never dropped | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md) |
| MMSP-RFC-0012 Conversion is direct and carries nothing redundant | MMSP-RFC-0013 Implementation code is straightforward; MMSP-RFC-0004 (nothing redundant) | [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md); [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5 |
| — | MMSP-RFC-0008 History does not change | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#6-the-identical-prefix) §6 |
| — | MMSP-RFC-0012 A request can be interrupted | [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md) |
| — | — | [MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md), new |

- **Contiguous renumbering**: On 2026-11-18, [#347](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/347) renumbered MMSP-RFC-0014 Prompt Cache Sessions to [MMSP-RFC-0011](MMSP-RFC-0011-prompt-cache-sessions.md). An MMSP-RFC-0011 in the first two columns above is the earlier document of that number, not Prompt Cache Sessions.
- **Redirects**: The site redirects all URLs from every earlier numbering to the current documents.

## 6. Pointers and Site

- **Pointers**: `AGENTS.md` and the `mmsp-dev` skill cite governing RFCs as `(MMSP-RFC-NNNN)` and direct contributors to read the specifications before changing a client; the root README links `design/`.
- **Site rendering**: `/rfcs/` renders `design/README.md` and every `design/rfcs/MMSP-RFC-*.md` in both languages directly from repo files, requiring no site code changes for new RFCs.

## 7. Drawbacks

- **Multi-file reading**: Specifications live across multiple files rather than a single page, relying on the index for a single view.
- **Risk of drift**: Code changes after an RFC is written can cause temporary drift until caught in review.

## 8. Rationale and Alternatives

- **Separate principles file (`penguin-harness-design` style)**: Rejected by the owner to avoid duplicating current state and decision history; each `spec` RFC is both the decision and the current specification, indexed in `design/README.md`.
- **Keeping rules inside `mmsp-dev` skill**: Rejected because the skill is a frequently updated how-to guide, whereas specifications change only by explicit decision.
- **Sibling design repo via symlinks**: Rejected because MMSP uses two packages and many git worktrees that would each require symlink setup.
- **In-file status field**: Rejected because PR state already tracks proposal/acceptance, and the index table tracks whether an RFC was superseded.
- **New spec RFC for every change (pre-2026-11-02 rule)**: Replaced by in-place edits so small updates preserve RFC numbers, cross-references, and the index while `Updated by` and `git log` preserve history.
- **Architecture Decision Records (ADRs)**: Short ADR sections suited rule RFCs, but `change` RFCs keep the richer Rust sections to capture alternatives and prior art.
- **Uppercase BCP 14 keywords**: Adopted over lowercase prose (`must`/`should` in RFC 8200) so every `MUST` statement can be audited directly against the code.

## 9. Prior Art

- **[Rust RFCs](https://github.com/rust-lang/rfcs)**: Template structure and one-decision-per-file model.
- **[IETF RFCs](https://www.ietf.org/process/rfcs/)**: Noun titles, `Abstract`, numbered sections, BCP 14 keywords, and [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) structure.
- **`Prism-Shadow/penguin-harness-design` (private)**: Kept the RFCs (`PRFC-NNNN`) while dropping the separate principles file (`PRN-NNN`).
- **[Architecture Decision Records](https://adr.github.io/)**: Lightweight decision record format.
- **[Python PEPs](https://peps.python.org/pep-0001/)**: Referenced for prior art; its in-file status workflow was deliberately omitted.

## 10. Unresolved Questions

- **Keeping `Conformance` file lists**: Retained despite file moves because they tell readers exactly where to verify each specification in the codebase.

## 11. Future Possibilities

- **Automated CI verification**: Check that every file path in `Conformance` exists and every `spec` RFC appears in the `design/README.md` index.
