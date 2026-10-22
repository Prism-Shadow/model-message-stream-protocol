# MMSP-RFC-0007 被拒绝的值抛出有类型的错误

- Feature Name: `typed_rejection`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0007-typed-rejection.md)

## Summary
[summary]: #summary

客户端因模型无法接受而拒绝 `temperature`、`tool_choice`、`prompt_caching`、`fast_mode` 或 `tts_config` 的某个值时，在请求发出之前抛出 `UnsupportedParameterError`，并指明客户端与参数。客户端根本无法执行的操作抛出 `UnsupportedOperationError`。`thinking_level` 从不被拒绝（[MMSP-RFC-0006](MMSP-RFC-0006-thinking-levels-usable.zh.md)）。

## Motivation
[motivation]: #motivation

处理被拒绝的值的调用方，需要一个能捕获的类，在两个包中、经由 MMSP 服务端时都一样；裸的 `ValueError` 或 `Error` 无法与缺陷区分开。写下这条规则时做的审查发现，两个 Google 客户端在两种语言中都用裸错误拒绝 `tts_config`，已在 [#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269) 修复；规则点明这个参数，好让共享测试守住它。

## Rule
[rule]: #rule

- `mmsp` 客户端把其服务端的拒绝作为 `UpstreamError` 抛出，其 `error_type` 为 `UnsupportedParameterError`。

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/errors.py`、`src_ts/src/errors.ts`；各客户端的 `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`；`test_list_models.py` / `list-models.test.ts`；`test_mmsp_server.py` / `mmsp-server.test.ts`；`test_client.py::test_gemini_tts_config_rejects_a_speaker_list_it_cannot_voice` 及其对应的 Jest 测试。
