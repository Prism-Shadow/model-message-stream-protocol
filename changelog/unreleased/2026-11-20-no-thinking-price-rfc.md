# MMSP-RFC-0012 priced thinking as output

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`

[中文版](2026-11-20-no-thinking-price-rfc.zh.md)

## What changed

- [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.md) Thinking Priced as Output, a new `change` RFC in both languages, listed in the index of `design/README.md`: `ModelPricing` holds no thinking price, and a turn's `thoughts_tokens` are billed as output, at `response_tokens`, on every row, including a row whose vendor lists thinking at another rate. The `thoughts_tokens` count of `usage_metadata` stays.
