# Gemini 4 Argon SDK Documentation

Official Google documentation retrieved on 2026-10-14 for `gemini-4-argon`.
The documentation pages are saved from Google's Markdown endpoints; the model
specification is summarized from its HTML page.

## Documentation

- [latest-model.md](docs/latest-model.md) — model changes and migration.
- [gemini-4-argon.md](docs/gemini-4-argon.md) — modalities, capabilities, and token limits.
- [api-reference.md](docs/api-reference.md) — Interactions request, response, usage, and error schemas.
- [streaming.md](docs/streaming.md) — SSE events and deltas.
- [function-calling.md](docs/function-calling.md) — function declarations, calls, and results.
- [thinking.md](docs/thinking.md) — thinking levels, summaries, and signatures.
- [long-decode.md](docs/long-decode.md) — synchronous limits and background continuation.
- [pricing.md](docs/pricing.md) — standard, priority, batch, and flex pricing.

## MMSP configuration

`google-official` uses stateless streaming Interactions with `store: false`.
Gemini 4 Argon accepts `low`, `medium`, and `high` thinking, defaulting to `medium`.
MMSP maps `NONE` to `low` and `XHIGH`/`MAX` to `high`; an omitted level stays omitted.
Sampling parameters are ignored by the API, so MMSP continues to reject `temperature`.
Only implicit caching is supported; `prompt_caching` accepts `ENABLE`.

The 1,048,576-token context window is shared by input, thinking, and output.
Synchronous streaming supports up to 65,536 output tokens, including thinking.
Outputs above that limit require Google's stored background execution, which is
outside MMSP's stateless streaming interface.

The registry records standard list prices per million tokens: $4 input, $20
output/thinking, and $0.20 cached input. Google's introductory prices through
2026-11-30 are $2, $10, and $0.10 respectively.

## Protocol notes verified on 2026-10-14

The streaming tool-call capture and stateless replay probes are stored under
`api_captures/gemini_interactions/gemini-4-argon/` (git-ignored).

- The stream used `step.start`, `step.delta`, and `step.stop`, with usage on
  `interaction.completed`. Tool-call turns ended with `requires_action`.
- The API emitted both a `thought_signature` delta and a signature on the
  `function_call` start. Replaying only the thought signature succeeded; omitting
  every signature returned HTTP 400. No additional call-signature fidelity was needed.
- Thought summaries were optional in replay. The single-call probes also accepted
  omitted call ids, but MMSP retained them to correlate tool results.
