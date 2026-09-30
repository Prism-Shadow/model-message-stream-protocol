# Latest Gemini models

> Source: https://ai.google.dev/gemini-api/docs/latest-model and
> https://ai.google.dev/gemini-api/docs/pricing (snapshot 2026-09-03)

## Gemini 3.8 Flash

- **Model ID:** `gemini-3.8-flash` (stable)
- **Context window:** 1,048,576 input tokens; 65,536 output tokens
- **Capabilities:** thinking (default `medium` level; `minimal` is not supported), tool
  calling, structured outputs, multimodal input (text, image, video, audio, PDF),
  Computer Use, code execution, Batch API
- Google's latest and most capable Flash model, one generation on from
  `gemini-3.7-flash` and unchanged from it on the wire and in price.

## Pricing

Standard list price (per 1M tokens), with a launch discount through December 31, 2026:

| Bucket                  | Through 2026-12-31 | From 2027-01-01 (list) |
| ----------------------- | ------------------ | ---------------------- |
| Input                   | $0.75              | $1.50                  |
| Output (incl. thinking) | $3.75              | $7.50                  |
| Context caching read    | $0.075             | $0.15                  |
| Context caching storage | $0.50 /1M·hour     | $1.00 /1M·hour         |

`gemini-3.7-flash` and `gemini-3.6-flash` share this exact price table, launch discount
included. MMSP's registry stores the list column and does not record the promotion, so
every row reports the rate that applies from 2027-01-01.

## API changes

The Gemini 3.7 generation's parameter contract applies unchanged (see
[../../gemini3_7/docs/latest-model.md](../../gemini3_7/docs/latest-model.md)):
`temperature`/`top_p`/`top_k` stay deprecated and ignored, `candidate_count` is
unsupported, model turn prefill returns HTTP 400, thinking is configured with the
`thinking_level` enum, and `minimal` thinking remains unsupported on the flash model.
