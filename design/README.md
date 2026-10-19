# MMSP design

[中文版](README.zh.md)

The design MMSP is built to. When the code and the design disagree, the design wins: fix the code, or change the design first through an RFC.

| File | Holds |
| --- | --- |
| [`PRINCIPLES.md`](PRINCIPLES.md) | The invariants every change keeps, `PRN-001` and up |
| [`rfcs/`](rfcs/) | One decision per file, `MRFC-NNNN-<slug>.md` |
| [`0000-template.md`](0000-template.md) | The file an RFC starts from |

Every file except the template has a Chinese twin, `<name>.zh.md`, which mirrors it section for section. The site renders the principles and every RFC from these files, in the Design section of its docs.

## When a change needs an RFC

- A change to a principle.
- A change to the message or stream shapes: an item kind or field, a key of `UniEvent`, `UniMessage` or `UniConfig`, what `StreamItems` decides.
- A change to the public API: the methods and constructor of `AutoLLMClient`, the package exports, the error classes.
- A change to what the routing tables or the credential rule mean. Adding a row is not one.
- A change to the MMSP server's wire protocol (`/v1/stream`, `/v1/models`).
- Anything that breaks a caller.

A normal PR is enough for a new model or generation, a new vendor or protocol client that follows the pattern, a new family or client-type row, registry entries, docs, the site, CI and bug fixes.

## Writing an RFC

1. Branch `rfc/<slug>` from `origin/dev` and copy `0000-template.md` to `rfcs/MRFC-NNNN-<slug>.md`. `NNNN` is the next number that neither `ls design/rfcs/` nor an open PR (`gh pr list --search "MRFC-"`) uses; a number is never reused. One decision per RFC.
2. Write the Chinese twin `MRFC-NNNN-<slug>.zh.md` in the same PR. The section names stay English in both. Each file links the other on the line under its metadata: `[中文版](MRFC-NNNN-<slug>.zh.md)` and `[English](MRFC-NNNN-<slug>.md)`.
3. An RFC that changes a principle edits `PRINCIPLES.md` and its twin in the same PR, lists the ids on its `Principles:` line, and appends `RFCs: [MRFC-NNNN](rfcs/MRFC-NNNN-<slug>.md)` as the last line of each principle it touches.
4. Add a changelog entry with `Type: process` and `Scope: design`, in the format of [`changelog/README.md`](../changelog/README.md).
5. Open the PR with `gh pr create --base dev`, titled `MRFC-NNNN: <Title>`, then add its link to the `RFC PR` line in a follow-up commit.

An open PR is a proposed RFC, a merged one is accepted, and a closed one is withdrawn, its number spent. There is no status field. The PR that implements an accepted RFC adds `- Implementation PR: [#N](<url>)` after the `RFC PR` line and links the RFC from its own changelog entry. An RFC that replaces another appends `- Superseded by: [MRFC-NNNN](MRFC-NNNN-<slug>.md)` to the old file's metadata in the same PR.

## Writing rules

- A principle is an invariant: a normative statement of one to three sentences, at most a few lines of essential detail, then `Enforced by:` naming the modules and tests that hold it, at file level.
- Every sentence of a principle is true of the code. Where it is not, the code is fixed, or the sentence is changed through an RFC.
- A number is an invariant or carries a tense. No counts and no current inventories: which clients exist, which models a client serves.
- Code identifiers, file paths and the RFC section names stay English in both languages.
- PR and issue links are full URLs; links to files of the repository are relative.
- There is no index file: `ls design/rfcs/` lists the RFCs, and `grep -l PRN-004 design/rfcs/` finds those that touched a principle.
