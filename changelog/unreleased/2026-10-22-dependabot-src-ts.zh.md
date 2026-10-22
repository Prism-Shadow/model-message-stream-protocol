# TypeScript 包的依赖更新

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `src_ts`, `tests`
- **PR:** [#275](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/275)

[English](2026-10-22-dependabot-src-ts.md)

## 变更内容

- `@anthropic-ai/sdk` 从 `^0.81.0` 升至 `^0.91.1`（锁文件中由 0.81.0 升至 0.91.1），这是第一个不受 GHSA-p7fg-763f-g4gf 影响的版本；`@anthropic-ai/bedrock-sdk` 仍为 `^0.26.4`，它接受 1.0 以下的 SDK。
- 用 `npm audit fix` 重新生成 `package-lock.json`，`package.json` 中的其他版本范围均未改动。运行时依赖升至 `protobufjs` 7.6.6（原为 7.5.4）及 `@protobufjs/utf8` 1.1.2、`ws` 8.22.0（原为 8.19.0），二者都在 `@google/genai` 之下；`express` 4.22.3（原为 4.22.1）及 `body-parser` 1.20.9、`proxy-addr` 2.0.8、`path-to-regexp` 0.1.13 和 `qs` 6.16.1；`@aws-sdk/xml-builder` 3.972.41（原为 3.972.6），它不再依赖 `fast-xml-parser`；以及 `minimatch` 9.0.9 和 `brace-expansion` 2.1.7。
- 开发工具升至 `jest` 30.5.2（原为 30.2.0）及 `@babel/core` 7.29.7、`browserslist` 4.29.4、`baseline-browser-mapping` 2.11.31 和 `picomatch` 4.0.7 与 2.3.2；`handlebars` 4.7.10（原为 4.7.8）、`js-yaml` 4.3.2 与 3.15.2、`minimatch` 3.1.5 和 `brace-expansion` 1.1.21、`flatted` 3.4.4、`@humanfs/node` 0.16.8 以及 `form-data` 4.0.6。
- `tests/request-body.test.ts` 用本地服务器检查两种 Messages 客户端类型的请求体：`ant-messages` 的 `temperature`，以及 `anthropic-official` 在 Bedrock 上的请求体版本，与 `src_py/tests/test_request_body.py` 的用例相同。
