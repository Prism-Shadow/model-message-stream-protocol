# MMSP design

[中文版](README.zh.md)

The rules MMSP keeps and the decisions that changed it, each an RFC. When the code and an accepted RFC disagree, the RFC wins: fix the code, or supersede the RFC first through another RFC.

## The RFCs

| RFC | Title | Kind | Status |
| --- | --- | --- | --- |
| [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.md) | The RFC process | process | Accepted |
| [MMSP-RFC-0002](rfcs/MMSP-RFC-0002-one-protocol.md) | One protocol for every model | rule | Accepted |
| [MMSP-RFC-0003](rfcs/MMSP-RFC-0003-async-streaming.md) | Every request is an async stream | rule | Accepted |
| [MMSP-RFC-0004](rfcs/MMSP-RFC-0004-lean-messages.md) | Messages stay lean | rule | Accepted |
| [MMSP-RFC-0005](rfcs/MMSP-RFC-0005-essential-fields.md) | Essential fields are never dropped | rule | Accepted |
| [MMSP-RFC-0006](rfcs/MMSP-RFC-0006-explicit-routing.md) | Client routing is explicit | rule | Accepted |
| [MMSP-RFC-0007](rfcs/MMSP-RFC-0007-credential-scope.md) | Keys stay safe: a credential goes only where it was given for | rule | Accepted |
| [MMSP-RFC-0008](rfcs/MMSP-RFC-0008-immutable-history.md) | History does not change | rule | Accepted |
| [MMSP-RFC-0009](rfcs/MMSP-RFC-0009-typed-errors.md) | Every error is typed | rule | Accepted |
| [MMSP-RFC-0010](rfcs/MMSP-RFC-0010-thinking-levels-usable.md) | Every thinking level is supported | rule | Accepted |
| [MMSP-RFC-0011](rfcs/MMSP-RFC-0011-explicit-parameters.md) | Request parameters are never fuzzy-matched | rule | Accepted |
| [MMSP-RFC-0012](rfcs/MMSP-RFC-0012-interruptible-requests.md) | A request can be interrupted | rule | Accepted |
| [MMSP-RFC-0013](rfcs/MMSP-RFC-0013-direct-implementation.md) | Implementation code is straightforward | rule | Accepted |

A `rule` is an invariant the code keeps; a `change` changes the protocol or the public API; `process` is how this folder works. The status is `Accepted` or `Superseded by MMSP-RFC-NNNN`, so the rules in force are the `rule` rows that are Accepted. A proposed RFC is an open PR (`gh pr list --search "MMSP-RFC-"`) and a withdrawn one a closed PR; neither has a row.

The rule RFCs were renumbered once, on 2026-10-24, by the owner's order; [MMSP-RFC-0001](rfcs/MMSP-RFC-0001-rfc-process.md) maps the numbers of 0.5.5 to today's.

| File | Holds |
| --- | --- |
| [`rfcs/`](rfcs/) | One decision per file, `MMSP-RFC-NNNN-<slug>.md` |
| [`0000-template.md`](0000-template.md) | The file an RFC starts from |

Every file except the template has a Chinese twin, `<name>.zh.md`, which mirrors it section for section. The site renders this index and every RFC from these files at `/rfcs/`.

## When a change needs an RFC

- A change to a rule.
- A change to the message or stream shapes: an item kind or field, a key of `UniEvent`, `UniMessage` or `UniConfig`, what `StreamItems` decides.
- A change to the public API: the methods and constructor of `AutoLLMClient`, the package exports, the error classes.
- A change to what the routing tables or the credential rule mean. Adding a row is not one.
- A change to the MMSP server's wire protocol (`/v1/stream`, `/v1/models`).
- Anything that breaks a caller.

A normal PR is enough for a new model or generation, a new vendor or protocol client that follows the pattern, a new family or client-type row, registry entries, docs, the site, CI and bug fixes.

## Writing an RFC

1. Branch `rfc/<slug>` from `origin/dev` and copy `0000-template.md` to `rfcs/MMSP-RFC-NNNN-<slug>.md`. `NNNN` is the next number that neither `ls design/rfcs/` nor an open PR (`gh pr list --search "MMSP-RFC-"`) uses; a number is never reused. One decision per RFC. Set `Kind` to `rule`, `change` or `process`: a rule RFC keeps the sections Summary, Motivation, Rule and Enforced by; a change or process RFC keeps Summary, Motivation and the Rust RFC sections. Delete any section with nothing to say.
2. Write the Chinese twin `MMSP-RFC-NNNN-<slug>.zh.md` in the same PR. The section names stay English in both. Each file links the other on the line under its metadata: `[中文版](MMSP-RFC-NNNN-<slug>.zh.md)` and `[English](MMSP-RFC-NNNN-<slug>.md)`.
3. A rule changes only through a rule RFC that states the whole rule as it now stands and names the old one on its `Supersedes:` line. In the same PR, append `- Superseded by: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md)` to the old file's metadata, in both languages, and set the old row's status in the table above.
4. Add the RFC's row to the table above, with status `Accepted`: the row lands when the PR merges, which is what accepts the RFC.
5. Add a changelog entry with `Type: process` and `Scope: design`, in the format of [`changelog/README.md`](../changelog/README.md).
6. Open the PR with `gh pr create --base dev`, titled `MMSP-RFC-NNNN: <Title>`, then add its link to the `RFC PR` line in a follow-up commit.

An open PR is a proposed RFC, a merged one is accepted, and a closed one is withdrawn, its number spent. The file has no status field; the table above carries `Accepted` or `Superseded by`. The PR that implements an accepted change RFC adds `- Implementation PR: [#N](<url>)` after the `RFC PR` line and links the RFC from its own changelog entry.

## Writing rules

- A rule's Summary is a normative statement of one to three sentences; its Rule section is at most a few lines of essential detail; its Enforced by section names the modules and tests that hold it, at file level.
- Every sentence of a rule is true of the code. Where it is not, the code is fixed, or the rule is superseded.
- A number is an invariant or carries a tense. No counts and no current inventories: which clients exist, which models a client serves.
- Code identifiers, file paths and the RFC section names stay English in both languages.
- PR and issue links are full URLs; links to files of the repository are relative.
- The table above is the only index. `grep -l MMSP-RFC-0004 design/rfcs/` finds the RFCs that cite a rule.
