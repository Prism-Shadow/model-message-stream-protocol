# MMSP design

[中文版](README.zh.md)

Every **specification** MMSP conforms to and every **protocol or public API decision** is recorded as an RFC. **Precedence**: when code and an accepted RFC disagree, the RFC wins—fix the code or update the RFC first.

## The RFCs

| RFC | Title | Kind | Status |
| --- | --- | --- | --- |
| [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.md) | The RFC Process | process | Accepted |
| [MMSP-RFC-0002](rfcs/MMSP-RFC-0002-message-protocol.md) | Message Protocol | spec | Accepted |
| [MMSP-RFC-0003](rfcs/MMSP-RFC-0003-message-requests.md) | Message Requests | spec | Accepted |
| [MMSP-RFC-0004](rfcs/MMSP-RFC-0004-message-fidelity.md) | Message Fidelity | spec | Accepted |
| [MMSP-RFC-0005](rfcs/MMSP-RFC-0005-client-routing.md) | Client Routing | spec | Accepted |
| [MMSP-RFC-0006](rfcs/MMSP-RFC-0006-upstream-credentials.md) | Upstream Credentials | spec | Accepted |
| [MMSP-RFC-0007](rfcs/MMSP-RFC-0007-error-types.md) | Error Types | spec | Accepted |
| [MMSP-RFC-0008](rfcs/MMSP-RFC-0008-request-interruption.md) | Request Interruption | spec | Accepted |
| [MMSP-RFC-0009](rfcs/MMSP-RFC-0009-protocol-conversion.md) | Protocol Conversion | spec | Accepted |
| [MMSP-RFC-0010](rfcs/MMSP-RFC-0010-trace-recording.md) | Trace Recording | spec | Accepted |
| [MMSP-RFC-0011](rfcs/MMSP-RFC-0011-prompt-cache-sessions.md) | Prompt Cache Sessions | change | Accepted |

- **Kinds**: `spec` fixes a concept, protocol, or algorithm; `change` modifies the protocol or public API; `process` defines how `design/` works.
- **Statuses**: `Accepted` or `Superseded by MMSP-RFC-NNNN`. Specifications in force are the `Accepted` `spec` rows.
- **Unmerged RFCs**: A proposed RFC is an open PR (`gh pr list --search "MMSP-RFC-"`) and a withdrawn RFC is a closed PR; neither appears in the table.
- **Historical numbering**: RFCs were renumbered twice on 2026-10-24, and MMSP-RFC-0014 became MMSP-RFC-0011 on 2026-11-18; see [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.md#5-numbering) §5 for the mappings.

| File | Holds |
| --- | --- |
| [`rfcs/`](rfcs/) | One decision per file (`MMSP-RFC-NNNN-<slug>.md`) and its `.zh.md` twin |
| [`0000-template.md`](0000-template.md) | Starting template for new RFCs (English only) |

- **Bilingual mirror**: Every file except `0000-template.md` has a `<name>.zh.md` twin aligned section for section, rendered at `/rfcs/`.

## When a change needs an RFC

- **Specification change**: Modifying any existing specification.
- **Message or stream shape**: Changing an item kind or field, a key of `UniEvent`, `UniMessage`, or `UniConfig`, or how `StreamItems` decides.
- **Public API**: Changing `AutoLLMClient` methods or constructor, package exports, or error classes.
- **Routing or credential rules**: Changing what routing tables or the credential rule mean (adding a row does not need an RFC).
- **Wire protocol**: Changing the MMSP server endpoints (`/v1/stream`, `/v1/models`).
- **Breaking change**: Anything that breaks an existing caller.

**Normal PR only** (no RFC needed): Adding a model, vendor/protocol client following existing patterns, family or client-type row, registry entry, docs, site update, CI change, or bug fix.

## Writing an RFC

1. **Create file and number**: Branch `rfc/<slug>` from `origin/dev` and copy `0000-template.md` to `rfcs/MMSP-RFC-NNNN-<slug>.md` (one decision per RFC). Pick the next consecutive `NNNN` after the highest number in `design/rfcs/` and open PRs (`gh pr list --search "MMSP-RFC-"`).
2. **Set kind and sections**: Set `Kind` to `spec` (Abstract, Introduction, Conventions and Terminology, numbered body sections, Conformance) or `change` / `process` (Abstract, Introduction, numbered Rust RFC sections). Delete empty sections.
3. **Write Chinese twin**: Add `MMSP-RFC-NNNN-<slug>.zh.md` in the same PR. Keep template section names in English, translate `spec` body headings with matching section numbers, and link `[中文版](MMSP-RFC-NNNN-<slug>.zh.md)` / `[English](MMSP-RFC-NNNN-<slug>.md)` under metadata.
4. **Update index and changelog**: Add a row to the table above with status `Accepted` (merging accepts the RFC), and add a [`changelog/README.md`](../changelog/README.md) entry (`Type: process`, `Scope: design`).
5. **Open PR**: Run `gh pr create --base dev` titled `MMSP-RFC-NNNN: <Title>`, then record the PR URL in `RFC PR`.

## Changing an accepted RFC

Accepted RFCs (including specifications) are **edited in place**:

1. **Edit both languages**: Branch `rfc/<slug>` from `origin/dev` and update the `.md` and `.zh.md` files in place (keeping number, title, table row, and full current specification).
2. **Record history**: Add the motivating case and PR link to `Introduction`, and append the PR URL to `- Updated by:` (insert after `RFC PR` if absent).
3. **Open PR**: Add a changelog entry (`Type: process`, `Scope: design`) and run `gh pr create --base dev` titled `MMSP-RFC-NNNN: <what changed>`.

- **Superseding a specification**: Replacing a spec entirely requires a new RFC with `Supersedes:`. Its PR appends `- Superseded by: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md)` to the old metadata in both languages and updates the old index row.
- **PR state and implementation**: Open PR = proposed, merged = accepted, closed = withdrawn (number spent). An implementation PR for a `change` RFC adds `- Implementation PR: [#N](<url>)` after `RFC PR` and links the RFC in its changelog entry.

## Writing rules

- **Visual hierarchy**: Use short sentences, **bold lead-ins** on every bullet, and Markdown tables instead of dense prose so readers can scan key rules at a glance.
- **Spec structure**: State what is fixed in a 1–2 sentence `Abstract`, define rules in numbered sections, and list file-level modules and tests in `Conformance`.
- **Normative keywords (BCP 14)**: Use `MUST` / `MUST NOT` (`必须` / `不得`) for code behavior, and `SHOULD` / `SHOULD NOT` / `MAY` (`应当` / `不应` / `可以`) for callers and contributors. Every normative statement MUST match the code.
- **Timeless numbers**: Write only invariants or dated historical facts—never current counts or inventories of clients or models.
- **Formatting and links**: Keep code identifiers, file paths, and template section names in English. Use full URLs for PRs/issues and relative paths for repo files.
- **Single index**: The table above is the only index; run `grep -l MMSP-RFC-0004 design/rfcs/` to find citing RFCs.
