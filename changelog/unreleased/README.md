# Unreleased

[中文版](README.zh.md)

- [2026-11-20] `ModelPricing` dropped `thoughts_tokens`: a turn's thinking tokens were billed at the output price on every row, raising the computed cost of thinking on `gemini-nano-banana-2.1` and `gemini-omni-1.2-flash`. ([details](2026-11-20-no-thinking-price.md))
- [2026-11-20] MMSP-RFC-0012 Thinking Priced as Output, a new `change` RFC, gave `ModelPricing` no thinking price and billed a turn's thinking tokens at the output price. ([details](2026-11-20-no-thinking-price-rfc.md), [#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359))
