# Live E2E tests retry an overloaded server's 529

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `tests`, `ci`
- **PR:** [#335](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/335)

[中文版](2026-11-17-e2e-retry-overloaded.zh.md)

## What changed

- `.github/workflows/pytest.yml` reran a live test that failed with HTTP 529, the status MiniMax and Anthropic answer when their servers are overloaded: `--only-rerun 529` joined the rate-limit filters under the same `--reruns 5 --reruns-delay 30`.
- `src_ts/tests/client.test.ts` retried a test body that threw an error with status 529, or with a message naming 529, as it retried a 429: up to 5 times, 30 s apart.
- Every other failure, a 500 included, kept failing on its first attempt.
