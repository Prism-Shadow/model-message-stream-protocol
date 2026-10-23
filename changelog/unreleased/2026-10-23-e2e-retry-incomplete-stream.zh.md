# 实况 E2E 测试重试被提前截断的流

- **Date:** 2026-10-23
- **Type:** process
- **Scope:** `tests`, `ci`
- **PR:** [#280](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/280)

[English](2026-10-23-e2e-retry-incomplete-stream.md)

## 变更内容

- `.github/workflows/pytest.yml` 会重跑因 `IncompleteStreamError` 失败的实况测试：在限流过滤条件之外新增 `--only-rerun '^(mmsp\.errors\.)?IncompleteStreamError:'`，沿用 `--reruns 5 --reruns-delay 30`。带锚点的模式只匹配抛出的该错误，不匹配仅提到该类名的失败。
- `src_ts/tests/client.test.ts` 像重试 HTTP 429 一样，重试抛出 `IncompleteStreamError`（以 `instanceof` 判断）的测试主体：最多 5 次，间隔 30 秒。`withRateLimitRetry`、`isRateLimited`、`RATE_LIMIT_RETRIES` 与 `RATE_LIMIT_RETRY_DELAY_MS` 分别更名为 `withTransientRetry`、`isTransient`、`TRANSIENT_RETRIES` 与 `TRANSIENT_RETRY_DELAY_MS`。
- 其他失败，包括 `EmptyResponseError`、`StreamProtocolError` 与断言失败，仍在首次尝试即判定失败。
