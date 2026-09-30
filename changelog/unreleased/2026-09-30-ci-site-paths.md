# Site changes skip the model tests

- **Date:** 2026-09-30
- **Type:** chore
- **Scope:** `ci`

[中文版](2026-09-30-ci-site-paths.zh.md)

## What changed

- The TypeScript and Python test workflows ignore changes under `site/`, whose TypeScript files and `package.json` used to start the model tests. A site-only change runs the site build alone.
