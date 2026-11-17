# MMSP-RFC-0000 Title

- Feature Name: `snake_case_name`
- Start Date: YYYY-MM-DD
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec | change | process
- Supersedes: [MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md) (delete the line when none)

[中文版](MMSP-RFC-0000-<slug>.zh.md)

## Abstract

State what this document specifies in **one paragraph of 1–2 short sentences** with **bold** key terms: the concept, protocol, or algorithm fixed here, with no history or rationale.

## 1. Introduction

- **Why this is fixed**: State the problem and concrete motivating case (a model, wire event, replay, or config value) using short bullets with **bold lead-ins**.
- **History and provenance**: Link the deciding PRs as full URLs, and note any earlier RFC whose content moved here.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Term**: One concise sentence per term; cite terms defined in another RFC instead of redefining them, e.g. `([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5)`.

## 3. Noun

- **Spec RFC body**: One noun per numbered section (`## 3. Noun`, `### 3.1 Noun`). Use **short sentences, bold lead-ins, and tables over dense prose**.
- **Normative precision**: Every normative sentence uses a BCP 14 keyword and matches the code.
- **Cross-references**: Cite another RFC as `([MMSP-RFC-NNNN](MMSP-RFC-NNNN-<slug>.md#<anchor>) §N)` (the `.zh.md` twin links the `.zh.md` file and its translated heading slug).

## N. Conformance

- **Spec RFCs (last section)**: List the file-level modules and tests that implement and verify this specification.

## N. Drawbacks
## N. Rationale and Alternatives
## N. Prior Art
## N. Unresolved Questions
## N. Future Possibilities

- **Change and process RFCs**: Number these Rust RFC sections in order after the body sections, and delete any section with nothing to say.
