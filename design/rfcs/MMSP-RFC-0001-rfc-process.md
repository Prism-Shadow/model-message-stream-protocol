# MMSP-RFC-0001 The RFC process

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: process

[中文版](MMSP-RFC-0001-rfc-process.zh.md)

## Summary
[summary]: #summary

Adopt `design/`: every rule MMSP keeps and every decision that changes the protocol or the public API is an RFC, one decision per file, accepted by merging its PR. The rules in force are the accepted rule RFCs, indexed in [`design/README.md`](../README.md); there is no other statement of them.

## Motivation
[motivation]: #motivation

The rules MMSP keeps lived in the mmsp-dev skill, written as how-to: how to build a client, with what every client must guarantee in the same bullets. Nothing told an invariant from current practice, so a contributor could not know which sentence a change may bend.

Decisions had no durable record. The changelog records what a change did and, by rule, keeps the reasoning off disk; the reasoning went into PR descriptions, where a later reader has to know which PR to open.

The owner's case: no client may raise for a thinking level. That is a promise to every caller, not a coding tip, and it held only as long as the author of each new client read the right bullet of the skill. The owner also asked that such rules be agreed the way any other decision is, one RFC each, rather than kept in a separate principles file.

## Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

Before changing a client, read the index in `design/README.md`: the rows of kind `rule` whose status is Accepted are the rules in force. Each is an RFC of four short sections: the rule in one to three sentences, why it was made, its essential detail, and the files that enforce it. `AGENTS.md` and the mmsp-dev skill still say how to do the work; a rule there that serves an RFC cites it as `(MMSP-RFC-NNNN)`.

A change to a rule, to the message or stream shapes, to the public API, to what routing or the credential rule means, or anything that breaks a caller starts as an RFC: copy [`0000-template.md`](../0000-template.md) to `design/rfcs/MMSP-RFC-NNNN-<slug>.md`, set its kind, write it and its Chinese twin, and open a PR to `dev`. A rule changes only by a rule RFC that states the whole rule as it now stands and supersedes the old one. A new model, a client that follows the pattern, a bug fix and the like stay normal PRs. [`design/README.md`](../README.md) has the full list and the steps.

When the code and an accepted RFC disagree, the RFC wins: the code is fixed, or the RFC is superseded first.

## Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

- Layout: `design/README.md` (the index and the process), `design/0000-template.md` (English only) and `design/rfcs/MMSP-RFC-NNNN-<slug>.md`, each file but the template with a `.zh.md` twin. The folder holds only Markdown, so CI classifies a change to it as documentation and runs no model tests.
- Kinds: `rule`, an invariant the code keeps; `change`, a change to the protocol or the public API; `process`, how this folder works. A rule RFC has the sections Summary, Motivation, Rule and Enforced by; a change or process RFC has the Rust RFC sections, Summary through Future possibilities. A section with nothing to say is omitted.
- Numbering: an RFC takes the next `MMSP-RFC-NNNN` that neither the folder nor an open PR uses, and a number is never reused. The one exception is the renumbering of 2026-10-24, by the owner's order ([#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)): the twelve rules took MMSP-RFC-0002 to MMSP-RFC-0013 in the order of the owner's titles, and the content of the eleven rules of 0.5.5 moved as this table says.

  | 0.5.5 number | Content now in |
  | --- | --- |
  | MMSP-RFC-0002 One protocol for every model | [MMSP-RFC-0002](MMSP-RFC-0002-one-protocol.md) |
  | MMSP-RFC-0003 One stream grammar, closed by the base class | [MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.md) (grammar), [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md) (`IncompleteStreamError`) |
  | MMSP-RFC-0004 Routing is explicit | [MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.md) (routing), [MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.md) (version matching) |
  | MMSP-RFC-0005 A credential goes only where it was given for | [MMSP-RFC-0007](MMSP-RFC-0007-credential-scope.md) |
  | MMSP-RFC-0006 Every thinking level is usable on every client | [MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.md) |
  | MMSP-RFC-0007 A rejected value raises a typed error | [MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md) |
  | MMSP-RFC-0008 Replay is minimal; fidelity is the exception channel | [MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md) (what fidelity may hold), [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md) (`tool_call_id`, unsigned thinking) |
  | MMSP-RFC-0009 Two packages, one contract | [MMSP-RFC-0002](MMSP-RFC-0002-one-protocol.md) |
  | MMSP-RFC-0010 Every stream ends with its usage and finish reason | [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md) |
  | MMSP-RFC-0011 Thinking survives the round trip | [MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.md) |
  | MMSP-RFC-0012 Conversion is direct and carries nothing redundant | [MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.md) (direct), [MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.md) (nothing redundant) |

- Metadata: `Feature Name`, `Start Date`, `RFC PR`, `Kind`, and where they apply `Supersedes`, `Superseded by` and `Implementation PR`; PR links are full URLs.
- Lifecycle: an open PR proposes, a merge accepts, a close withdraws. The index in `design/README.md` has one row per accepted RFC, with its kind and its status, `Accepted` or `Superseded by MMSP-RFC-NNNN`; the RFC's own PR adds the row. A superseding RFC updates the old file's metadata and the old row in the same PR. The PR that implements a change RFC adds its `Implementation PR` line.
- Changelog: an RFC PR carries a `process` entry with Scope `design`; the implementation PR carries its own entry, which links the RFC.
- Pointers: `AGENTS.md` names the folder and when an RFC is needed; the mmsp-dev skill sends a contributor to the rules before a client changes and tags its rules `(MMSP-RFC-NNNN)`; the README links the folder.
- Site: an RFC area at `/rfcs/` renders `design/README.md` and every `design/rfcs/MMSP-RFC-*.md` from the repository's files in both languages, so a new RFC is a new page without a change to the site's code.

## Drawbacks
[drawbacks]: #drawbacks

One more place to read before a change, and the rules are spread over files rather than one page; the index is what keeps them at a glance. A rule can drift from the code: every sentence was checked against the code when it was written, and a later change can make one false until a review reads both.

## Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

- A principles file beside the RFCs, as penguin-harness-design keeps one: rejected by the owner. Two documents would state the rules, one as the current state and one as the decision; with one rule per RFC, the file that states a rule is the decision that made it, and the index is the current state.
- Rules inside the skill: rejected. The skill is how-to and changes with every client; a rule changes only by decision. Kept apart, the skill can cite the rules.
- A sibling design repository linked in by symlinks: rejected. MMSP is one repository with two packages and many worktrees, and every worktree would need the links.
- A status field in the file: rejected. The PR's state is the status; the index carries the one thing a reader cannot see from the file, whether a later RFC superseded it.
- Architecture decision records: their short form (context, decision, consequences) is close to what a rule RFC is; change RFCs keep the Rust sections because the alternatives and prior art are what was missing.

## Prior art
[prior-art]: #prior-art

- [Rust RFCs](https://github.com/rust-lang/rfcs): the template and one decision per file.
- Prism-Shadow/penguin-harness-design (private): `PRN-NNN` principles beside `PRFC-NNNN` RFCs. This process keeps the RFCs and drops the principles file.
- [Architecture decision records](https://adr.github.io/).
- [Python PEPs](https://peps.python.org/pep-0001/): their status workflow is deliberately not copied.

## Unresolved questions
[unresolved-questions]: #unresolved-questions

Whether the `Enforced by` sections stay. They name files, and files move; they are kept because they tell a reader where to check a rule.

## Future possibilities
[future-possibilities]: #future-possibilities

A CI check that every path an `Enforced by` section names exists, and that every rule RFC has a row in the index.
