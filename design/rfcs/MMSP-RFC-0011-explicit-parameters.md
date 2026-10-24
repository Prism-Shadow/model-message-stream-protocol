# MMSP-RFC-0011 Request parameters are never fuzzy-matched

- Feature Name: `explicit_parameters`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[中文版](MMSP-RFC-0011-explicit-parameters.zh.md)

## Summary
[summary]: #summary

What a client sends for a model is decided by an explicit match, never by a guess: a generation or variant is told apart by the version in its id (`"4-6"`; `"gpt-6"` and not `"gpt-6-luna"`; `"k2."`; `"m3.1"`; `"glm-5.3"`), never by a bare family substring such as `"claude"` or `"gpt"`. Each `UniConfig` value is sent as the setting a fixed mapping names for the client and the model's generation, or it raises `UnsupportedParameterError`. A key a client has no use for is ignored.

## Motivation
[motivation]: #motivation

A request built from a fuzzy match sends one generation another's parameters, and a mapping that lives only in the code is one the caller cannot read. The audit behind [#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) found the configuration page wrong on most keys ("MMSP maps it to the closest one the model supports", "Most providers cache on their own and accept only `enable`"). It rewrote the page from both transforms, which agree on every row, and left the table there: the RFC states only what the code keeps. The version rule was part of the first bullet of MMSP-RFC-0004 in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265). This RFC is the owner's 模型请求参数不模糊匹配.

## Rule
[rule]: #rule

- Which client a model id reaches is [MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.md).
- **Official clients.** Inside an official client, the generations of a vendor are told apart by explicit version strings, kept in named tuples or plain conditions (`"4-6"` in the model id, the `_LOW_EFFORT_FOR_NONE` tuple of `anthropic-official`). The first row that matches applies. A tier or modality marker in the id (`-pro`, `-image`, `tts`, `embedding`) selects the model's kind the same way. A new generation adds a row or a condition, never a looser match.
- **Compatible clients.** A compatible client reads the model id only where what it sends differs by model, and then by an explicit name too. For example:
  - the vLLM adapter picks a chat template's thinking switch by the model's name from its own table, and falls back to Qwen3's;
  - `openai-responses` turns `none` into `low` on GPT-6 except Luna, as the official client does;
  - `openai-chat` and `openai-responses` ask for `detail: "high"` on an image GPT-5.6 would otherwise refuse.
- **Values with no setting.** A `UniConfig` value with no setting on the model raises before the request goes out ([MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.md)). `thinking_level` is the exception: it runs as a fixed row instead ([MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.md)).
- **Values with another form.** Where a protocol has another form for a value, the mapping says which. For example, a list of tool names is `allowed_tools` on `openai-chat`, a list of one name is `{type: "tool", name}` on `ant-messages`, and an unset `max_tokens` is 64000 on the Anthropic clients.
- **The configuration page.** This RFC states the rule; the configuration page of the site, [`site/src/docs/configuration.en.md`](../../site/src/docs/configuration.en.md), writes down what every client sends for every key. A row of it changes with the code that changes it, in the same PR.

## Enforced by
[enforced-by]: #enforced-by

- `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig` of the clients under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`.
- `src_py/tests/test_thinking_level_mapping.py` / `src_ts/tests/thinking-level-mapping.test.ts`, which pin each generation's row.
- `test_request_body.py` / `request-body.test.ts`, which read the body the Anthropic clients send for a config and a generation.
- `site/src/docs/configuration.en.md` / `configuration.zh.md`, the table of what each client sends, ignores or raises on.
- Review against `.agents/skills/mmsp-dev/SKILL.md`, which stops to ask before a non-obvious mapping is coded.
