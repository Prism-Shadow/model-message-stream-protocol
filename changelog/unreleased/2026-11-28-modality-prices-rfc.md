# MMSP-RFC-0013 priced output by modality

- **Date:** 2026-11-28
- **Type:** process
- **Scope:** `design`
- **PR:** [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)

[中文版](2026-11-28-modality-prices-rfc.zh.md)

## What changed

- [MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.md) Output Priced by Modality, a new `change` RFC in both languages, listed in the index of `design/README.md`. `ModelPricing` held four required prices on every registry row (`cached_tokens`, `prompt_tokens`, `thoughts_tokens`, `response_tokens`), the input price standing in for a cache hit and the output price for thinking where the platform lists none, embeddings priced on input and free endpoints at `0`. One formula summed each count times its price. A response whose upstream split its output by modality counted its thinking and text in `thoughts_tokens` and its image, video or audio tokens alone in `response_tokens`. Every billed quantity was counted: 1,000 `response_tokens` per image on per-image billing, and ⌈seconds × 25⌉ audio tokens for Gemini TTS on `openai-speech`. The Model Index and `/models.json` showed the four prices.
- [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.md) Thinking Priced as Output was superseded by MMSP-RFC-0013 in both files and in the index.
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §3.2 had `openai-image` send a message's image items with its prompt as reference images (`POST /images/edits` on the OpenAI wire, `input_references` through the `openrouter` plugin), count 1,000 `response_tokens` per image through the `tokendance` and `openrouter` plugins and split image tokens from the rest of the output; it had the `gemini` plugin of `openai-speech` count the audio tokens of Gemini TTS, and priced embeddings on input. §5 named the four usage counts and required every billed quantity to be counted.
