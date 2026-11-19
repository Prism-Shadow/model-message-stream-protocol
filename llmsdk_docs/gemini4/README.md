# Gemini 4 SDK Documentation

Official Google documentation for `gemini-4-argon` (retrieved 2026-10-14),
`gemini-4-carbon` (retrieved 2026-11-10), `gemini-4-hydrogen` (retrieved
2026-11-16) and `gemini-4-neon` (retrieved 2026-11-19). The documentation pages are
saved from Google's Markdown endpoints; each model specification is summarized from
its page. `latest-model.md`, `pricing.md`, `deprecations.md` and `thinking.md` are
the 2026-11-19 snapshots.

## Documentation

- [latest-model.md](docs/latest-model.md) — the current models compared.
- [gemini-4-argon.md](docs/gemini-4-argon.md) — Argon's modalities, capabilities, and token limits.
- [gemini-4-carbon.md](docs/gemini-4-carbon.md) — Carbon's modalities, capabilities, and token limits.
- [gemini-4-hydrogen.md](docs/gemini-4-hydrogen.md) — Hydrogen's modalities, capabilities, and token limits.
- [gemini-4-neon.md](docs/gemini-4-neon.md) — Neon's modalities, capabilities, and token limits.
- [whats-new-gemini-4-carbon.md](docs/whats-new-gemini-4-carbon.md) — Carbon against Argon, thinking levels, and migration.
- [whats-new-gemini-4-hydrogen.md](docs/whats-new-gemini-4-hydrogen.md) — Hydrogen against Carbon, Argon and Gemini 3.8 Flash, `xhigh`, and migration.
- [whats-new-gemini-4-neon.md](docs/whats-new-gemini-4-neon.md) — Neon against Hydrogen, Carbon and Argon, `xhigh`, and migration.
- [api-reference.md](docs/api-reference.md) — Interactions request, response, usage, and error schemas.
- [streaming.md](docs/streaming.md) — SSE events and deltas.
- [function-calling.md](docs/function-calling.md) — function declarations, calls, and results.
- [thinking.md](docs/thinking.md) — thinking levels, summaries, and signatures.
- [long-decode.md](docs/long-decode.md) — synchronous limits and background continuation.
- [pricing.md](docs/pricing.md) — standard, priority, batch, and flex pricing.
- [deprecations.md](docs/deprecations.md) — release and shutdown dates, and the ids that now route to another model.

## MMSP configuration

`google-official` uses stateless streaming Interactions with `store: false`.
Gemini 4 Argon and Gemini 4 Carbon accept `low`, `medium`, and `high` thinking, defaulting
to `medium`; Carbon spends more thinking tokens per turn and needs no other request change.
MMSP maps `NONE` to `low` and `XHIGH`/`MAX` to `high`; an omitted level stays omitted.
Gemini 4 Hydrogen and Gemini 4 Neon accept `low`, `medium`, `high` and `xhigh`, defaulting
to `high`, with the same request schema; MMSP maps `NONE` to `low` and `MAX` to `xhigh`.
Sampling parameters are ignored by the API, so MMSP continues to reject `temperature`.
Only implicit caching is supported; `prompt_caching` accepts `ENABLE`.

The 1,048,576-token context window is shared by input, thinking, and output.
Synchronous streaming supports up to 65,536 output tokens, including thinking.
Outputs above that limit require Google's stored background execution, which is
outside MMSP's stateless streaming interface.

The registry records standard list prices per million tokens: $4 input, $20
output/thinking, and $0.20 cached input. Google's introductory prices through
2026-11-30 are $2, $10, and $0.10 respectively. Neon lists $3.00 input, $15.00
output/thinking, and $0.15 cached input, and Hydrogen lists $1.50 input, $7.50
output/thinking, and $0.075 cached input, neither with an introductory price.

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

## Protocol notes for Gemini 4 Carbon, verified on 2026-11-11

The capture and probes are stored under
`api_captures/gemini_interactions/gemini-4-carbon/` (git-ignored).

- The stream had the same steps and deltas as Argon's: a `thought` step closed by a
  `thought_signature` delta, `thought_summary` deltas when the model thought aloud,
  a `function_call` step whose arguments arrived as one `arguments_delta`, and usage on
  `interaction.completed`. The `function_call` start carried no signature.
- Replay without the thought signature, or without the whole thought step, returned
  HTTP 400; without the summary, the call signature or the call id it succeeded.
- `thinking_level: "minimal"` returned HTTP 400 ("Thinking level THINKING_LEVEL_MINIMAL
  is not supported for this model"); `low`, `medium` and `high` succeeded, and
  `temperature` was accepted and ignored.

## Protocol notes for Gemini 4 Hydrogen, verified on 2026-11-16

The capture and probes are stored under `api_captures/gemini_4_hydrogen/` (git-ignored),
raw SSE against `POST /v1beta/interactions`.

- The stream had Carbon's steps and deltas: a `thought` step closed by a
  `thought_signature` delta (no `thought_summary` deltas came back with
  `thinking_summaries: "auto"` on these short turns), a `function_call` step whose
  arguments arrived as one `arguments_delta`, and usage on `interaction.completed`.
- Replay without the thought signature, or without the whole thought step, returned
  HTTP 400 ("Request contains an invalid argument."); without the summary or the call
  ids it succeeded.
- `thinking_level` `low`, `medium`, `high` and `xhigh` succeeded; `minimal` returned
  HTTP 400 ("Thinking level THINKING_LEVEL_MINIMAL is not supported for this model")
  and `max` HTTP 400 ("Supported values: 'minimal', 'low', 'medium', 'high', 'xhigh'").
- `service_tier: "priority"`, `system_instruction` and `temperature` were accepted.

## Protocol notes for Gemini 4 Neon, verified on 2026-11-19

The capture and probes are stored under
`api_captures/gemini_interactions/gemini-4-neon/` and
`api_captures/openrouter_responses/gemini-4-neon/` (git-ignored).

- The Interactions stream matched Hydrogen's contract: `thought` step with
  `thought_summary` and `thought_signature` deltas, `function_call` step, and usage on
  `interaction.completed`.
- Replay with `thought_signature` succeeded; replay without `thought_signature` or
  without the `thought` step returned HTTP 400 ("Request contains an invalid argument.").
- `thinking_level` `low`, `medium`, `high` and `xhigh` succeeded; `minimal` returned
  HTTP 400 ("Thinking level THINKING_LEVEL_MINIMAL is not supported for this model")
  and `max` HTTP 400 ("Supported values: 'minimal', 'low', 'medium', 'high', 'xhigh'").
- OpenRouter's `POST /api/v1/responses` (`google/gemini-4-neon`) accepted `reasoning.effort`
  and stateless replay with `reasoning.encrypted_content`.
