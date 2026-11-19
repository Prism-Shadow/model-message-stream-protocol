# TypeScript Google 客户端的空 tts_config

- **Date:** 2026-11-20
- **Type:** fix
- **Scope:** `google-official`, `google-genai`, `tests`
- **PR:** [#355](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/355)

[English](2026-11-20-empty-tts-config-parity.md)

## 变更内容

- TypeScript 的 `google-official` 与 `google-genai` 将 `tts_config: []` 视为未设置并使用 `Kore` 音色，与 Python 客户端以及 `openai-speech`、`deepseek-speech` 一致；此前会抛出 `UnsupportedParameterError`（"Gemini TTS does not support 0 speakers"）。
- 新增参数化离线测试：`tts_config` 缺省、为空值或为空列表时，两个 Google 客户端均使用 `Kore`（`test_request_body.py` / `request-body.test.ts`），`openai-speech` 与 `deepseek-speech` 均不发送音色（`test_media_clients.py` / `media-clients.test.ts`）。
