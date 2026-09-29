# Changelog Details

[中文版](README.zh.md)

Release history lives in three levels, each one link away from the next:

1. [`../CHANGELOG.md`](../CHANGELOG.md) — one line per release.
2. `<version>/README.md` — one line per change in that release, linking its detail file and its PR.
3. `<version>/YYYY-MM-DD-<slug>.md` — one detail file per change, recording what the change did.

Everything that has not shipped goes into `unreleased/`, which is named for its state rather than a number because the version is not decided until release. Never create a numbered folder for unshipped work and never invent the next version number. At release preparation, `unreleased/` is renamed to the decided version, its README title becomes that version, and the release line is added to the root file; the next change recreates `unreleased/`.

## Detail file format

Copy this template:

```markdown
# <Title: name the change, not the PR>

- **Date:** YYYY-MM-DD
- **Type:** feature
- **Scope:** `module`, `module`
- **PR:** [#N](https://github.com/Prism-Shadow/mmsp/pull/N)
- **Issue:** [#N](https://github.com/Prism-Shadow/mmsp/issues/N)
- **Breaking:** yes — <what breaks, in one line>

[中文版](<name>.zh.md)

## What changed

- ...
```

The metadata block sits directly under the H1, one field per bullet, always in the order above, so a reader and a `grep` find each field in the same place.

| Field | Required | Value |
| --- | --- | --- |
| `Date` | always | The entry date, matching the filename prefix. |
| `Type` | always | Exactly one of `feature` (new model or user-facing capability), `fix` (defect correction), `refactor` (restructuring with no capability change), `process` (tooling, docs, skills, CI, release plumbing). |
| `Scope` | always | 1–5 code areas, backticked, named as the tree names them (`gemini3_7`, `registry`, `auto_client`, `tests`, `skills`, …). |
| `PR` | when one exists | Full link to the PR(s) that shipped this change. A bare `#N` does not render as a link in a Markdown file, so always write the URL — in the body too. A PR mentioned in the prose for context (an earlier change being corrected, say) is a cross-reference, not a shipping PR, and stays inline. |
| `Issue` | when one exists | Full link, same rule. Multiple links are comma-separated. |
| `Breaking` | only when breaking | `yes — <one line>`. Omit the field entirely otherwise, so `grep -rl 'Breaking:' changelog/` lists exactly the breaking changes. |

Omit a field that does not apply rather than writing a placeholder. A change with no PR or issue (pre-convention entries, or work landed outside a PR) simply has no such line.

### Body

An entry records **what was done**, in past tense. It is a short document:

| Section | When | What belongs in it |
| --- | --- | --- |
| `## What changed` | always | What the change did, in bullets, each led by the model id, class, or parameter a reader would search for. |
| bespoke | as needed | The factual detail the change introduced — a config mapping table, registry metadata, a protocol difference. Reuse an existing name (`## Configuration behavior`, `## Registry metadata`) before inventing one. |
| `## Compatibility` | `Breaking: yes` | What breaks and the migration step. The instruction, not an argument for why the rest is safe. |

**Reasoning does not go on disk.** No `## Why`, `## Problem`, `## Decision`, `## Alternatives considered`, `## Verification`, `## Risks`. The thinking still has to happen — the dev skill requires the probes, the alternatives, and the verification — but it is reported in the conversation and written into the PR description, which stays attached to the diff it describes. An agent that wants it pulls the PR description, `git blame`, or `git log`; those carry their own timestamp, so nothing has to be re-checked for staleness first.

**Do not describe the current state of the codebase.** "`X` is not exported from `Y`", "the client folder now holds `Z`" — these read as fact, drift silently as the code moves, and cost every later reader a verification they did not ask for. Write what the change did at the time, not what the repository is today.

Cross-reference other entries with relative links, e.g. `[Gemini 3.7](../0.4.1/2026-07-22-kimi-k3-gemini-3-6-registry.md)`; relative links survive the folder rename at release time and can be checked mechanically.

## Chinese counterpart

Every file in this tree ships in both languages: `<name>.md` in English and `<name>.zh.md` in Chinese, mirroring it section for section. That holds for detail entries, release READMEs, and the root `CHANGELOG.md`. A change is not complete until both exist — write the English file first, then the counterpart, in the same PR.

What stays in English, verbatim, so one `grep` works across both languages:

- The metadata field names and their values — `- **Type:** feature`, the `Scope` identifiers, the `Date`, and the links. Only the `Breaking` reason is prose, so only it is translated.
- Code identifiers, model ids, parameter names, error classes, and file paths.

What gets translated: all prose, and the section headings. Use these renderings for the standard headings, so a Chinese reader can `grep` them just as reliably:

| English | 中文 |
| --- | --- |
| `## What changed` | `## 变更内容` |
| `## Compatibility` | `## 兼容性` |

Bespoke headings are translated naturally, keeping the same order and count as the English file. Each file links its counterpart on the line directly below the metadata block: `[中文版](<name>.zh.md)` in the English file, `[English](<name>.md)` in the Chinese one.

## Release README format

One line per change, newest first:

```markdown
- [YYYY-MM-DD] One-sentence description. ([details](YYYY-MM-DD-slug.md), [#N](https://github.com/Prism-Shadow/mmsp/pull/N))
```

The PR link is repeated here on purpose: the release summary should answer "which PR shipped this" without opening the detail file.

## Finding things

| Question | Query |
| --- | --- |
| What shipped in a release? | `cat changelog/<version>/README.md` |
| What has ever broken compatibility? | `grep -rl 'Breaking:' changelog/` |
| Every entry touching a client | `grep -rl 'Scope:.*gemini' changelog/` |
| Only bug fixes | `grep -rl 'Type:\*\* fix' changelog/` |
| Which PR shipped an entry | `grep 'PR:' changelog/<version>/<entry>.md` |
