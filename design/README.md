# MMSP design

[中文版](README.zh.md)

The specifications MMSP conforms to and the decisions that changed it, each an RFC. When the code and an accepted RFC disagree, the RFC wins: fix the code, or supersede the RFC first through another RFC.

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

A `spec` fixes a concept, protocol or algorithm the code conforms to; a `change` changes the protocol or the public API; `process` is how this folder works. The status is `Accepted` or `Superseded by MMSP-RFC-NNNN`, so the specifications in force are the `spec` rows that are Accepted. A proposed RFC is an open PR (`gh pr list --search "MMSP-RFC-"`) and a withdrawn one a closed PR; neither has a row.

The RFCs were renumbered twice on 2026-10-24, by the owner's order; [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.md#5-numbering) §5 maps the numbers of 0.5.5 and of the first renumbering to today's.

| File | Holds |
| --- | --- |
| [`rfcs/`](rfcs/) | One decision per file, `MMSP-RFC-NNNN-<slug>.md` |
| [`0000-template.md`](0000-template.md) | The file an RFC starts from |

Every file except the template has a Chinese twin, `<name>.zh.md`, which mirrors it section for section. The site renders this index and every RFC from these files at `/rfcs/`.

## When a change needs an RFC

- A change to a specification.
- A change to the message or stream shapes: an item kind or field, a key of `UniEvent`, `UniMessage` or `UniConfig`, what `StreamItems` decides.
- A change to the public API: the methods and constructor of `AutoLLMClient`, the package exports, the error classes.
- A change to what the routing tables or the credential rule mean. Adding a row is not one.
- A change to the MMSP server's wire protocol (`/v1/stream`, `/v1/models`).
- Anything that breaks a caller.

A normal PR is enough for a new model or generation, a new vendor or protocol client that follows the pattern, a new family or client-type row, registry entries, docs, the site, CI and bug fixes.

## Writing an RFC

1. Branch `rfc/<slug>` from `origin/dev` and copy `0000-template.md` to `rfcs/MMSP-RFC-NNNN-<slug>.md`. `NNNN` is the next number that neither `ls design/rfcs/` nor an open PR (`gh pr list --search "MMSP-RFC-"`) uses; a number is never reused. One decision per RFC. Set `Kind` to `spec`, `change` or `process`: a spec RFC has Abstract, Introduction, Conventions and Terminology, its body sections and Conformance; a change or process RFC has Abstract, Introduction and the Rust RFC sections, numbered. Delete any section with nothing to say.
2. Write the Chinese twin `MMSP-RFC-NNNN-<slug>.zh.md` in the same PR. The section names of the template (Abstract, Introduction, Conventions and Terminology, Conformance and the Rust RFC sections) stay English in both; a spec's body headings are translated in the Chinese twin, and the section numbers keep the two aligned. Each file links the other on the line under its metadata: `[中文版](MMSP-RFC-NNNN-<slug>.zh.md)` and `[English](MMSP-RFC-NNNN-<slug>.md)`.
3. A specification changes only through a spec RFC that states the whole specification as it now stands and names the old one on its `Supersedes:` line. In the same PR, append `- Superseded by: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md)` to the old file's metadata, in both languages, and set the old row's status in the table above.
4. Add the RFC's row to the table above, with status `Accepted`: the row lands when the PR merges, which is what accepts the RFC.
5. Add a changelog entry with `Type: process` and `Scope: design`, in the format of [`changelog/README.md`](../changelog/README.md).
6. Open the PR with `gh pr create --base dev`, titled `MMSP-RFC-NNNN: <Title>`, then add its link to the `RFC PR` line in a follow-up commit.

An open PR is a proposed RFC, a merged one is accepted, and a closed one is withdrawn, its number spent. The file has no status field; the table above carries `Accepted` or `Superseded by`. The PR that implements an accepted change RFC adds `- Implementation PR: [#N](<url>)` after the `RFC PR` line and links the RFC from its own changelog entry.

## Writing rules

- A spec RFC reads as the specification of one thing that stays fixed: its Abstract says what is specified in one to three sentences, its body states it in numbered sections, and its Conformance section names the modules and tests that hold it, at file level.
- Normative sentences use MUST, MUST NOT, SHOULD, SHOULD NOT or MAY, in capitals, as BCP 14 defines them; a sentence about what the code does uses MUST or MUST NOT, and SHOULD is for callers and contributors. The Chinese twin writes them 必须, 不得, 应当, 不应, 可以.
- Every normative sentence is true of the code. Where it is not, the code is fixed, or the specification is superseded.
- A number is an invariant or carries a tense. No counts and no current inventories: which clients exist, which models a client serves.
- Code identifiers, file paths and the section names of the template stay English in both languages.
- PR and issue links are full URLs; links to files of the repository are relative.
- The table above is the only index. `grep -l MMSP-RFC-0004 design/rfcs/` finds the RFCs that cite a specification.
