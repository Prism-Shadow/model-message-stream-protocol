# Live E2E tests retry a stream cut short

- **Date:** 2026-10-23
- **Type:** process
- **Scope:** `tests`, `ci`

[中文版](2026-10-23-e2e-retry-incomplete-stream.zh.md)

## What changed

- `.github/workflows/pytest.yml` reran a live test that failed with `IncompleteStreamError`: `--only-rerun '^(mmsp\.errors\.)?IncompleteStreamError:'` joined the rate-limit filters under the same `--reruns 5 --reruns-delay 30`. The anchored pattern matched the raised error, not a failure that only named the class.
- `src_ts/tests/client.test.ts` retried a test body that threw an `IncompleteStreamError`, matched with `instanceof`, as it retried HTTP 429: up to 5 times, 30 s apart. `withRateLimitRetry`, `isRateLimited`, `RATE_LIMIT_RETRIES` and `RATE_LIMIT_RETRY_DELAY_MS` were renamed `withTransientRetry`, `isTransient`, `TRANSIENT_RETRIES` and `TRANSIENT_RETRY_DELAY_MS`.
- Every other failure, `EmptyResponseError`, `StreamProtocolError` and assertion failures included, kept failing on its first attempt.
