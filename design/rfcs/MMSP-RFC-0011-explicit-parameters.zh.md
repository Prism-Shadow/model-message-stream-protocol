# MMSP-RFC-0011 模型请求参数不模糊匹配

- Feature Name: `explicit_parameters`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0011-explicit-parameters.md)

## Summary
[summary]: #summary

客户端为某个模型发送什么，由明确的匹配决定，绝不靠猜：区分某一代或某个变体，看的是 id 中的版本（`"4-6"`；`"gpt-6"` 但不是 `"gpt-6-luna"`；`"k2."`；`"m3.1"`；`"glm-5.3"`），绝不用 `"claude"`、`"gpt"` 这类只有系列名的子串。每个 `UniConfig` 值都按一张固定的映射，发送为该客户端、该模型这一代所对应的设置，没有这样的设置就抛出 `UnsupportedParameterError`。客户端用不上的键会被忽略。

## Motivation
[motivation]: #motivation

靠模糊匹配构建的请求，会把一代模型的参数发给另一代；只存在于代码里的映射，调用方无从读到。[#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) 背后的审查发现，配置页在大多数键上写得不对（「MMSP maps it to the closest one the model supports」「Most providers cache on their own and accept only `enable`」）。它依据两种语言的转换重写了这一页，两者在每一行上都一致，并把映射表留在那里：RFC 只陈述代码保证的东西。版本规则原是 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中 MMSP-RFC-0004 第一条的一部分。本 RFC 就是项目负责人的「模型请求参数不模糊匹配」。

## Rule
[rule]: #rule

- 模型 id 由哪个客户端处理，见 [MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.zh.md)。
- **官方客户端。** 在官方客户端内部，同一厂商的各代模型靠明确的版本字符串区分，写在有名字的元组或直白的条件里（模型 id 中的 `"4-6"`，`anthropic-official` 的 `_LOW_EFFORT_FOR_NONE` 元组）。先匹配上的那一行生效。id 中表示档位或模态的标记（`-pro`、`-image`、`tts`、`embedding`）也以同样的方式选定模型的类别。新的一代模型加一行或一个条件，绝不放宽匹配。
- **兼容客户端。** 兼容客户端只在发送的内容因模型而异时才读取模型 id，而且同样按明确的名字。例如：
  - vLLM 适配器按模型名从自己的表中选出聊天模板的思考开关，找不到时退回 Qwen3 的开关；
  - `openai-responses` 在 Luna 以外的 GPT-6 上把 `none` 变成 `low`，与官方客户端一样；
  - `openai-chat` 和 `openai-responses` 对 GPT-5.6 原本会拒绝的图片请求 `detail: "high"`。
- **没有对应设置的值。** 模型上没有对应设置的 `UniConfig` 值，在请求发出之前抛出异常（[MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md)）。`thinking_level` 是例外：它按表中固定的一行运行（[MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.zh.md)）。
- **有另一种形式的值。** 协议对某个值有另一种形式时，映射写明用哪一种。例如工具名列表在 `openai-chat` 上是 `allowed_tools`，只有一个名字的列表在 `ant-messages` 上是 `{type: "tool", name}`；没有设置的 `max_tokens` 在 Anthropic 客户端上是 64000。
- **配置页。** 本 RFC 只陈述规则；每个客户端为每个键发送什么，写在网站的配置页 [`site/src/docs/configuration.zh.md`](../../site/src/docs/configuration.zh.md) 上。其中的一行，和改动它的代码在同一个 PR 中修改。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中各客户端的 `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`。
- `src_py/tests/test_thinking_level_mapping.py` / `src_ts/tests/thinking-level-mapping.test.ts`，它们为每一代模型的那一行固定用例。
- `test_request_body.py` / `request-body.test.ts`，它们读取 Anthropic 客户端针对某个配置和某一代模型发送的请求体。
- `site/src/docs/configuration.en.md` / `configuration.zh.md`，记录每个客户端发送、忽略或拒绝什么的表。
- 对照 `.agents/skills/mmsp-dev/SKILL.md` 评审，它要求在编写不显然的映射之前先停下来询问。
