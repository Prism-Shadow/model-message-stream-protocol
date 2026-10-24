# MMSP-RFC-0010 Every thinking level is supported

- Feature Name: `thinking_levels_usable`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[中文版](MMSP-RFC-0010-thinking-levels-usable.zh.md)

## Summary
[summary]: #summary

No client rejects a `ThinkingLevel`: none raises `UnsupportedParameterError` for `thinking_level`, on any model. Each official client maps every level onto a setting of the model's generation from a fixed table, without a warning:
- the level itself, where the model has it;
- another level the model accepts, where it has not: Claude 4.6 runs `xhigh` at `high`, and Gemini runs `xhigh` and `max` at `high`;
- for `none`, the model's own off switch where it has one, such as `disabled` on Claude Sonnet 5 and `none` on GPT-6 Luna and the Kimi K3 series;
- for `none` on a model with no off switch, the least thinking it allows: the lowest effort on Claude Opus 5.5, `between_tools` on Claude Sonnet 5.5, and `minimal` or `low` on Gemini.

## Motivation
[motivation]: #motivation

A caller sets a `ThinkingLevel` once and changes models by name. A client that raised for a level its model lacks would send the caller back to branching on the model, which is what MMSP exists to remove. The history of the rule:
- [#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) clamped the levels per Gemini model;
- [#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) mapped `max` per vendor;
- [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) closed the gap where `none` sent nothing and Claude Opus 5 still thought;
- [#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) turned thinking off with `none` on the Kimi K3 series.

The owner's rule, 支持全部思考等级, is that every level works on every client. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0006.

## Rule
[rule]: #rule

- Through a compatible client, the endpoint decides what a level runs as, and it may refuse the value the client sends for a model that cannot take it:
  - `ant-messages` sends `disabled` for `none`;
  - `openai-responses` sends the level as its effort, with `none` as `low` on GPT-6 except Luna ([MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.md));
  - `openai-chat` sends no level, so the endpoint runs its default;
  - its vLLM adapter sends only its chat template's switch;
  - the `mmsp` client forwards the level to its server.
- The mapping per client and generation is written down on the configuration page of the site, [`site/src/docs/configuration.en.md`](../../site/src/docs/configuration.en.md), and each of its rows has a case in the mapping tests of both packages ([MMSP-RFC-0011](MMSP-RFC-0011-explicit-parameters.md)).

## Enforced by
[enforced-by]: #enforced-by

- The config transforms of the clients under `src_py/mmsp/<client>/client.py` / `src_ts/src/<client>/client.ts`.
- `src_py/tests/test_thinking_level_mapping.py`, `src_ts/tests/thinking-level-mapping.test.ts`.
- The docstring of `UnsupportedParameterError` in `errors.py` / `errors.ts`.
- `site/src/docs/configuration.en.md` / `configuration.zh.md`.
