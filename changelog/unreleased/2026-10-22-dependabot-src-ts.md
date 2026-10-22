# Dependency updates for the TypeScript package

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `src_ts`, `tests`

[中文版](2026-10-22-dependabot-src-ts.zh.md)

## What changed

- `@anthropic-ai/sdk` moved from `^0.81.0` to `^0.91.1` (0.81.0 to 0.91.1 in the lockfile), the first release outside GHSA-p7fg-763f-g4gf; `@anthropic-ai/bedrock-sdk` stayed at `^0.26.4`, which accepts the SDK below 1.0.
- `package-lock.json` was regenerated with `npm audit fix`, and no other range in `package.json` changed. The runtime dependencies moved to `protobufjs` 7.6.6 (from 7.5.4) with `@protobufjs/utf8` 1.1.2 and `ws` 8.22.0 (from 8.19.0), both under `@google/genai`; `express` 4.22.3 (from 4.22.1) with `body-parser` 1.20.9, `proxy-addr` 2.0.8, `path-to-regexp` 0.1.13 and `qs` 6.16.1; `@aws-sdk/xml-builder` 3.972.41 (from 3.972.6), which dropped `fast-xml-parser`; and `minimatch` 9.0.9 with `brace-expansion` 2.1.7.
- The development tools moved to `jest` 30.5.2 (from 30.2.0) with `@babel/core` 7.29.7, `browserslist` 4.29.4, `baseline-browser-mapping` 2.11.31 and `picomatch` 4.0.7 and 2.3.2; `handlebars` 4.7.10 (from 4.7.8), `js-yaml` 4.3.2 and 3.15.2, `minimatch` 3.1.5 with `brace-expansion` 1.1.21, `flatted` 3.4.4, `@humanfs/node` 0.16.8 and `form-data` 4.0.6.
- `tests/request-body.test.ts` checked the request body of both Messages client types against a local server: `temperature` on `ant-messages` and the Bedrock body version on `anthropic-official`, the cases of `src_py/tests/test_request_body.py`.
