# Thinking is billed at the output price

- **Date:** 2026-11-20
- **Type:** feature
- **Scope:** `registry`, `tests`, `site`, `skills`, `.github`
- **PR:** [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360)
- **Breaking:** yes — `ModelPricing` lost `thoughts_tokens`; a turn's thinking tokens are billed at `response_tokens`

[中文版](2026-11-20-no-thinking-price.zh.md)

## What changed

- `ModelPricing` dropped `thoughts_tokens` in both packages, as [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.md) specifies. `list_supported_models` / `listSupportedModels` returned `currency`, `prompt_tokens`, `response_tokens` and the optional `cached_tokens`, in USD and in CNY, and a turn's `thoughts_tokens` were billed as output, at `response_tokens`. The `thoughts_tokens` count of `usage_metadata` did not change.
- The registry's `usd` / `_usd` helpers took no thinking rate. `gemini-nano-banana-2.1` and `gemini-omni-1.2-flash` on `google-official`, the two rows that had priced thinking apart, priced it at their output price, which raised the computed cost of their thinking (see the table below).
- `/models.json` no longer wrote a `thoughts_tokens` price on any row, and its `pricing` note said thoughts are billed at the output price.
- The status probe billed a sample's thinking tokens at the output price.
- The usage docs and both skills computed the output of a turn as `(thoughts_tokens + response_tokens) * pricing.response_tokens`.

## Registry metadata

| Model | Client | Thinking per 1M tokens, before | After | Change |
| --- | --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | `google-official` | $7.50 | $30.00 | +$22.50 |
| `gemini-omni-1.2-flash` | `google-official` | $9.00 | $12.00 | +$3.00 |

Every other row had priced thinking at its output price already, and its computed cost did not change.

## Compatibility

- A caller that read `pricing.thoughts_tokens` (`pricing["thoughts_tokens"]` in Python) prices thinking with `pricing.response_tokens`: the output of a turn costs `(thoughts_tokens + response_tokens) * pricing.response_tokens` per million.
- A cost already computed for `gemini-nano-banana-2.1` or `gemini-omni-1.2-flash` at the earlier thinking rate stays as it was recorded; computing it again from this release's registry gives the higher figure above.
