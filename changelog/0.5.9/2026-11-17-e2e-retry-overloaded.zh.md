# 实况 E2E 测试重试服务器过载返回的 529

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `tests`, `ci`
- **PR:** [#335](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/335)

[English](2026-11-17-e2e-retry-overloaded.md)

## 变更内容

- `.github/workflows/pytest.yml` 会重跑因 HTTP 529 失败的实况测试（MiniMax 与 Anthropic 在服务器过载时返回这个状态码）：在限流过滤条件之外新增 `--only-rerun 529`，沿用 `--reruns 5 --reruns-delay 30`。
- `src_ts/tests/client.test.ts` 像重试 429 一样，重试抛出状态码为 529、或消息中带有 529 的错误的测试主体：最多 5 次，间隔 30 秒。
- 其他失败（包括 500）仍在首次尝试即判定失败。
