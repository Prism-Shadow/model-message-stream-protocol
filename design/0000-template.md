# MMSP-RFC-0000 Title

- Feature Name: `snake_case_name`
- Start Date: YYYY-MM-DD
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec | change | process
- Supersedes: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md) (delete the line when none)

[中文版](MMSP-RFC-0000-<slug>.zh.md)

## Abstract

What this document specifies, in one paragraph of one to three sentences: the concept, protocol or
algorithm that is fixed here, and what it fixes about it. No history and no reasons.

## 1. Introduction

Why this is fixed, with the concrete case it was decided on (a model, a wire event, a replay, a
config value) and the PRs that carry the history, as full URLs. Where the content came from an
earlier RFC, say which.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as
described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119),
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

The terms this document uses, one definition each. A term another RFC defines is cited, not
redefined, as `fidelity` is:
`([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5)`.

## 3. Noun

Spec RFCs. The specification itself, one noun per section, numbered on from 3, with subsections
`### 3.1 Noun` where a section has parts. Each normative sentence uses a key word and is true of
the code. Cite another RFC as `([MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md#<anchor>) §N)`, the anchor
being the GitHub slug of the cited section's heading; the Chinese twin links the `.zh.md` file at
the slug of its own heading for that section.

## N. Conformance

Spec RFCs, last. The modules and tests that implement and check this specification, at file level.

## N. Drawbacks
## N. Rationale and Alternatives
## N. Prior Art
## N. Unresolved Questions
## N. Future Possibilities

Change and process RFCs, after the body sections and in this order: the Rust RFC sections, numbered
on. A section with nothing to say is deleted.
