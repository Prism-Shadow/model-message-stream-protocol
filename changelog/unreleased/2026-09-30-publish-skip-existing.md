# The publish workflow skips versions already published

- **Date:** 2026-09-30
- **Type:** chore
- **Scope:** `ci`

[中文版](2026-09-30-publish-skip-existing.zh.md)

## What changed

- `publish.yml` no longer fails when the version is already on a registry, after a rerun or a release published by hand: the PyPI step skips files PyPI already has, and the npm step skips `npm publish` when the package's version is already on npm.
