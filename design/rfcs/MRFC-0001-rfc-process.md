# MRFC-0001 Design principles and the RFC process

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Principles: PRN-001 to PRN-008

[中文版](MRFC-0001-rfc-process.zh.md)

## Summary
[summary]: #summary

Adopt `design/`: [`PRINCIPLES.md`](../PRINCIPLES.md), the invariants MMSP keeps for every model in both packages (PRN-001 to PRN-008), and an RFC process through which they, the protocol and the public API change, one decision per RFC.

## Motivation
[motivation]: #motivation

The rules MMSP keeps lived in the mmsp-dev skill, written as how-to: how to build a client, with what every client must guarantee in the same bullets. Nothing told an invariant from current practice, so a contributor could not know which sentence a change may bend.

Decisions had no durable record. The changelog records what a change did and, by rule, keeps the reasoning off disk; the reasoning went into PR descriptions, where a later reader has to know which PR to open.

The owner's case: no client may raise for a thinking level. That is a promise to every caller, not a coding tip, and it held only as long as the author of each new client read the right bullet of the skill.

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Before changing a client, read `design/PRINCIPLES.md`. Each principle is a short normative statement, its essential detail, and the files that enforce it. `AGENTS.md` and the mmsp-dev skill still say how to do the work; a rule there that serves a principle cites it as `(PRN-00x)`.

A change to a principle, to the message or stream shapes, to the public API, to what routing or the credential rule means, or anything that breaks a caller starts as an RFC: copy [`0000-template.md`](../0000-template.md) to `design/rfcs/MRFC-NNNN-<slug>.md`, write it and its Chinese twin, and open a PR to `dev`. A new model, a client that follows the pattern, a bug fix and the like stay normal PRs. [`design/README.md`](../README.md) has the full list and the steps.

When the code and a principle disagree, the principle wins: the code is fixed, or the principle is changed first through an RFC.

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

- Layout: `design/README.md` (the process), `design/PRINCIPLES.md` (one `## PRN-NNN Title` section per principle), `design/0000-template.md` (English only) and `design/rfcs/MRFC-NNNN-<slug>.md`, each file but the template with a `.zh.md` twin. The folder holds only Markdown, so CI classifies a change to it as documentation and runs no model tests.
- Numbering: an RFC takes the next `MRFC-NNNN` that neither the folder nor an open PR uses, and a new principle the next `PRN-NNN`. Numbers are never reused.
- Template: the Rust RFC sections, Summary through Future possibilities, with the metadata `Feature Name`, `Start Date`, `RFC PR` and `Principles`; PR links are full URLs.
- Lifecycle: an open PR proposes, a merge accepts, a close withdraws. The implementation PR adds an `Implementation PR` line; an RFC that replaces another adds `Superseded by` to the old file.
- Principles: an RFC that changes one edits `PRINCIPLES.md` and its twin in the same PR and names it on its `Principles:` line; the principle ends with an `RFCs:` line linking each RFC that touched it.
- Changelog: an RFC PR carries a `process` entry with Scope `design`; the implementation PR carries its own entry, which links the RFC.
- Pointers: `AGENTS.md` names the folder and when an RFC is needed; the mmsp-dev skill sends a contributor to the principles before a client changes and tags its rules `(PRN-00x)`; the README links the folder.
- Site: the docs sidebar has a Design section that renders `PRINCIPLES.md` and every `design/rfcs/MRFC-*.md` from the repository's files in both languages, so a new RFC is a new page without a change to the site's code.

## Drawbacks
[drawbacks]: #drawbacks

One more document to read before a change. A principle can drift from the code: every sentence was checked against the code when it was written, and a later change can make one false until a review reads both.

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- Principles inside the skill: rejected. The skill is how-to and changes with every client; an invariant changes only by decision. Kept apart, the skill can cite the principles.
- A sibling design repository linked in by symlinks, as penguin-harness-design is: rejected. MMSP is one repository with two packages and many worktrees, and every worktree would need the links.
- A status field: rejected. The PR's state is the status, and a field would drift from it.
- Architecture decision records: their short form (context, decision, consequences) does not ask for the alternatives and prior art that the Rust sections require, which is what was missing.

## Prior art
[prior-art]: #prior-art

- [Rust RFCs](https://github.com/rust-lang/rfcs): the template and one decision per file.
- Prism-Shadow/penguin-harness-design (private): `PRN-NNN` principles beside `PRFC-NNNN` RFCs. This process keeps that shape in one repository.
- [Architecture decision records](https://adr.github.io/).
- [Python PEPs](https://peps.python.org/pep-0001/): their status workflow is deliberately not copied.

## Unresolved questions
[unresolved-questions]: #unresolved-questions

Whether the `Enforced by:` lines stay. They name files, and files move; they are kept for now because they tell a reader where to check a principle.

## Future possibilities
[future-possibilities]: #future-possibilities

A CI check that every path an `Enforced by:` line names exists.
