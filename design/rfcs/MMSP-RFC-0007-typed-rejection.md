# MMSP-RFC-0007 A rejected value raises a typed error

- Feature Name: `typed_rejection`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[中文版](MMSP-RFC-0007-typed-rejection.zh.md)

## Summary
[summary]: #summary

A client that rejects a `temperature`, `tool_choice`, `prompt_caching`, `fast_mode` or `tts_config` value its model cannot take raises `UnsupportedParameterError`, naming the client and the parameter, before the request goes out. An operation a client cannot perform at all raises `UnsupportedOperationError`. `thinking_level` is never rejected ([MMSP-RFC-0006](MMSP-RFC-0006-thinking-levels-usable.md)).

## Motivation
[motivation]: #motivation

A caller that handles a rejected value needs one class to catch, the same in both packages and through the MMSP server; a bare `ValueError` or `Error` cannot be told from a bug. The audit that wrote this rule found `tts_config` rejected with a bare error in both Google clients, in both languages, fixed in [#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269); the rule names the parameter so that the shared tests hold it.

## Rule
[rule]: #rule

- The `mmsp` client relays its server's rejection as `UpstreamError`, whose `error_type` is `UnsupportedParameterError`.
- The rejections inside a stream are typed too: `EmptyResponseError` for a response that is thinking and nothing else ([MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.md)), `IncompleteStreamError` for a stream that ended without its usage or finish reason ([MMSP-RFC-0010](MMSP-RFC-0010-stop-metadata.md)), `StreamProtocolError` for a client that broke the grammar.

## Enforced by
[enforced-by]: #enforced-by

`src_py/mmsp/errors.py`, `src_ts/src/errors.ts`; `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig` of the clients; `test_list_models.py` / `list-models.test.ts`; `test_mmsp_server.py` / `mmsp-server.test.ts`; `test_client.py::test_gemini_tts_config_rejects_a_speaker_list_it_cannot_voice` and its Jest mirror.
