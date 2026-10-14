# Affected client CI and publication test gates

- **Date:** 2026-10-14
- **Type:** process
- **Scope:** `.github`, `tests`

[中文版](2026-10-14-affected-client-ci.zh.md)

## What changed

- `ci.yml` selected client model tests from PR changes, included transitive client dependents, and ran all clients for shared changes and release validation.
- `models.json` consolidated Python and TypeScript model cases, capability flags, endpoint settings, and slow-test flags into one catalog. Gateway cases with non-family IDs received explicit client types.
- `MMSP_TEST_CLIENTS` selected client groups in both test suites. CI enabled slow cases and required selected API keys, while fork PRs ran offline checks.
- `CI passed` aggregated the required checks. PyPI and npm publication waited for both languages' full test suites on the publication commit.
