# MMSP-RFC-0001 The RFC Process

- Feature Name: `rfc_process`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Updated by: [#285](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/285), [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298), [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: process

[中文版](MMSP-RFC-0001-rfc-process.zh.md)

## Abstract

Adopt `design/`: every specification MMSP conforms to and every decision that changes the protocol or the public API is an RFC, one decision per file, accepted by merging its PR. The specifications in force are the accepted spec RFCs, indexed in [`design/README.md`](../README.md); there is no other statement of them.

## 1. Introduction

The rules MMSP keeps lived in the mmsp-dev skill, written as how-to: how to build a client, with what every client must guarantee in the same bullets. Nothing told an invariant from current practice, so a contributor could not know which sentence a change may bend.

Decisions had no durable record. The changelog records what a change did and, by rule, keeps the reasoning off disk; the reasoning went into PR descriptions, where a later reader has to know which PR to open.

The owner's case: no client may raise for a thinking level. That is a promise to every caller, not a coding tip, and it held only as long as the author of each new client read the right bullet of the skill. The owner also asked that such rules be agreed the way any other decision is, one RFC each, rather than kept in a separate principles file.

On 2026-10-24 the owner asked that an RFC specify a concept, protocol or algorithm that must stay fixed, titled by a noun as IETF RFCs are ([RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200), "Internet Protocol, Version 6 (IPv6) Specification"), rather than state a rule: RFC 应该是讨论一些软件里必须固定下来的概念、协议、定律、算法，比如 IETF RFC-8200: IPv6 Specification 的标题就是名词。 This document's form, and that of every specification, follows it.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals. In a spec RFC, a sentence about what the code does uses MUST or MUST NOT, and SHOULD and SHOULD NOT are for callers and contributors. The Chinese twin of an RFC renders the key words 必须, 不得, 应当, 不应 and 可以.

- *Spec*: an RFC that fixes a concept, protocol or algorithm the code conforms to.
- *Change*: an RFC that changes the protocol or the public API.
- *Process*: an RFC on how this folder works.
- *Accepted*: the status of an RFC whose PR merged.
- *Superseded*: the status of an accepted RFC a later RFC replaced, written `Superseded by MMSP-RFC-NNNN`.

## 3. Documents

- Layout: `design/README.md` (the index and the process), `design/0000-template.md` (English only) and `design/rfcs/MMSP-RFC-NNNN-<slug>.md`, each file but the template with a `.zh.md` twin. The folder holds only Markdown, so CI classifies a change to it as documentation and runs no model tests.
- Sections: a spec RFC has Abstract, Introduction, Conventions and Terminology, numbered body sections named by nouns, and Conformance, which names the modules and tests that hold it at file level. A change or process RFC has Abstract, Introduction and the Rust RFC sections, numbered. A section with nothing to say is omitted.
- Languages: the section names of the template stay English in both files; a spec's body headings are translated in the Chinese twin, and the section numbers keep the two aligned.
- Reading: before changing a client, read the index in `design/README.md`: the rows of kind `spec` whose status is Accepted are the specifications in force.

## 4. Lifecycle

- Starting: a change to a specification, to the message or stream shapes, to the public API, to what routing or the credential rule means, or anything that breaks a caller starts as an RFC: copy [`0000-template.md`](../0000-template.md) to `design/rfcs/MMSP-RFC-NNNN-<slug>.md`, set its kind, write it and its Chinese twin, and open a PR to `dev`. A new model, a client that follows the pattern, a bug fix and the like stay normal PRs; [`design/README.md`](../README.md) has the full list and the steps.
- Lifecycle: an open PR proposes, a merge accepts, a close withdraws. The index in `design/README.md` has one row per accepted RFC, with its kind and its status, `Accepted` or `Superseded by MMSP-RFC-NNNN`; the RFC's own PR adds the row. A specification changes only by a spec RFC that states the whole specification as it now stands and supersedes the old one; the superseding RFC updates the old file's metadata and the old row in the same PR. The PR that implements a change RFC adds its `Implementation PR` line.
- Precedence: when the code and an accepted RFC disagree, the RFC wins: the code is fixed, or the RFC is superseded first.
- Metadata: `Feature Name`, `Start Date`, `RFC PR`, `Kind`, and where they apply `Updated by` (the PRs that changed a process RFC after it was accepted), `Supersedes`, `Superseded by` and `Implementation PR`; PR links are full URLs.
- Changelog: an RFC PR carries a `process` entry with Scope `design`; the implementation PR carries its own entry, which links the RFC.

## 5. Numbering

An RFC takes the next `MMSP-RFC-NNNN` that neither the folder nor an open PR uses, and a number is never reused. The exceptions are the two reassignments of 2026-10-24, both by the owner's order. [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) gave the rules MMSP-RFC-0002 to MMSP-RFC-0013 in the order of the owner's titles. [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N) then restated them as nine specifications, MMSP-RFC-0002 to MMSP-RFC-0009, added MMSP-RFC-0010, and gave each a noun title, again in the owner's order. The content moved as this table says:

| 0.5.5 number | First renumbering (#298) | Content now in |
| --- | --- | --- |
| MMSP-RFC-0002 One protocol for every model | MMSP-RFC-0002 One protocol for every model | [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md); [MMSP-RFC-0009 §6](MMSP-RFC-0009-protocol-conversion.md#6-order) (order) |
| MMSP-RFC-0003 One stream grammar, closed by the base class | MMSP-RFC-0003 Every request is an async stream (grammar); MMSP-RFC-0005 (`IncompleteStreamError`) | [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md) |
| MMSP-RFC-0004 Routing is explicit | MMSP-RFC-0006 Client routing is explicit; MMSP-RFC-0011 (version matching) | [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md); [MMSP-RFC-0003 §6](MMSP-RFC-0003-message-requests.md#6-request-parameters) |
| MMSP-RFC-0005 A credential goes only where it was given for | MMSP-RFC-0007 Keys stay safe | [MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md) |
| MMSP-RFC-0006 Every thinking level is usable on every client | MMSP-RFC-0010 Every thinking level is supported | [MMSP-RFC-0003 §6](MMSP-RFC-0003-message-requests.md#6-request-parameters) |
| MMSP-RFC-0007 A rejected value raises a typed error | MMSP-RFC-0009 Every error is typed | [MMSP-RFC-0007](MMSP-RFC-0007-error-types.md) |
| MMSP-RFC-0008 Replay is minimal; fidelity is the exception channel | MMSP-RFC-0004 Messages stay lean; MMSP-RFC-0005 (`tool_call_id`, unsigned thinking) | [MMSP-RFC-0002 §5](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries); [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md) |
| MMSP-RFC-0009 Two packages, one contract | MMSP-RFC-0002 One protocol for every model | [MMSP-RFC-0002 §6](MMSP-RFC-0002-message-protocol.md#6-one-protocol-in-two-packages) |
| MMSP-RFC-0010 Every stream ends with its usage and finish reason | MMSP-RFC-0005 Essential fields are never dropped | [MMSP-RFC-0003 §5](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) |
| MMSP-RFC-0011 Thinking survives the round trip | MMSP-RFC-0005 Essential fields are never dropped | [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md) |
| MMSP-RFC-0012 Conversion is direct and carries nothing redundant | MMSP-RFC-0013 Implementation code is straightforward; MMSP-RFC-0004 (nothing redundant) | [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md); [MMSP-RFC-0002 §5](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) |
| — | MMSP-RFC-0008 History does not change | [MMSP-RFC-0004 §6](MMSP-RFC-0004-message-fidelity.md#6-the-identical-prefix) |
| — | MMSP-RFC-0012 A request can be interrupted | [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md) |
| — | — | [MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md), new |

The site redirects every URL of both earlier sets to the document that holds its content.

## 6. Pointers and Site

- Pointers: `AGENTS.md` and the mmsp-dev skill say how to do the work, and a rule there that serves an RFC cites it as `(MMSP-RFC-NNNN)`. `AGENTS.md` names the folder and when an RFC is needed; the skill sends a contributor to the specifications before a client changes; the README links the folder.
- Site: an RFC area at `/rfcs/` renders `design/README.md` and every `design/rfcs/MMSP-RFC-*.md` from the repository's files in both languages, so a new RFC is a new page without a change to the site's code.

## 7. Drawbacks

One more place to read before a change, and the specifications are spread over files rather than one page; the index is what keeps them at a glance. A specification can drift from the code: every sentence was checked against the code when it was written, and a later change can make one false until a review reads both.

## 8. Rationale and Alternatives

- A principles file beside the RFCs, as penguin-harness-design keeps one: rejected by the owner. Two documents would state the specifications, one as the current state and one as the decision; with one specification per RFC, the file that states it is the decision that made it, and the index is the current state.
- Rules inside the skill: rejected. The skill is how-to and changes with every client; a specification changes only by decision. Kept apart, the skill can cite the specifications.
- A sibling design repository linked in by symlinks: rejected. MMSP is one repository with two packages and many worktrees, and every worktree would need the links.
- A status field in the file: rejected. The PR's state is the status; the index carries the one thing a reader cannot see from the file, whether a later RFC superseded it.
- Architecture decision records: their short form (context, decision, consequences) is close to what a rule RFC was; change RFCs keep the Rust sections because the alternatives and prior art are what was missing.
- Normative key words: RFC 8200 itself writes must and should in lowercase; MMSP uses the BCP 14 capitals because every normative sentence is checked against the code, and a MUST can be checked where a lowercase must is prose.

## 9. Prior Art

- [Rust RFCs](https://github.com/rust-lang/rfcs): the template and one decision per file.
- [IETF RFCs](https://www.ietf.org/process/rfcs/): the noun title, the Abstract, numbered sections and BCP 14; [RFC 8200](https://datatracker.ietf.org/doc/html/rfc8200) as the shape.
- Prism-Shadow/penguin-harness-design (private): `PRN-NNN` principles beside `PRFC-NNNN` RFCs. This process keeps the RFCs and drops the principles file.
- [Architecture decision records](https://adr.github.io/).
- [Python PEPs](https://peps.python.org/pep-0001/): their status workflow is deliberately not copied.

## 10. Unresolved Questions

Whether the Conformance sections stay. They name files, and files move; they are kept because they tell a reader where to check a specification.

## 11. Future Possibilities

A CI check that every path a Conformance section names exists, and that every spec RFC has a row in the index.
