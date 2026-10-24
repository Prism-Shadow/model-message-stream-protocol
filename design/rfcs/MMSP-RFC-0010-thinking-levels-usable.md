# MMSP-RFC-0006 Every thinking level is usable on every client

- Feature Name: `thinking_levels_usable`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0006-thinking-levels-usable.zh.md)

## Summary
[summary]: #summary

No client rejects a `ThinkingLevel`: none raises `UnsupportedParameterError` for `thinking_level`, on any model. Where a model has no exact equivalent of a level, its official client sends a setting the model accepts instead, without a warning: Kimi K3, which cannot turn thinking off, runs `none` at `low`, and Gemini runs `xhigh` and `max` at `high`.

## Motivation
[motivation]: #motivation

A caller sets a `ThinkingLevel` once and changes models by name; a client that raised for a level its model lacks would send the caller back to branching on the model, which is what MMSP exists to remove. The levels were clamped to what each Gemini model takes in [#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) and the `max` level was mapped per vendor in [#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176); the owner's rule, which this RFC states, is that no client may raise for a thinking level. Until now it held only as long as the author of each new client read the right bullet of the mmsp-dev skill.

## Rule
[rule]: #rule

- Through a compatible client the endpoint decides what a level runs as, and it may refuse the value the client sends for a model that cannot take it. The `mmsp` client forwards the level to its server.

## Enforced by
[enforced-by]: #enforced-by

The `_convert_thinking_level*` methods of the clients; `src_py/tests/test_thinking_level_mapping.py`, `src_ts/tests/thinking-level-mapping.test.ts`; the docstring of `UnsupportedParameterError` in `errors.py` / `errors.ts`.
