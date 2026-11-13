# 经 Interactions 流式返回的 Gemini TTS 音频重新标为 audio/l16

- **Date:** 2026-11-02
- **Type:** fix
- **Scope:** `google_official`, `tests`, `llmsdk_docs`
- **PR:** [#311](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/311)

[English](2026-11-02-gemini-tts-mime-type.md)

## 变更内容

- `google-official`：不带 `mime_type` 的 Interactions `audio` 增量改为生成 MIME 类型为 `audio/l16; rate=<sample_rate>; channels=<channels>` 的 `inline_data` 内容项，即文档写明的流式默认格式：无文件头的 16 位 PCM。2026-11-02 起，API 在 `gemini-3.8-flash-tts`、`gemini-3.8-flash-lite-tts` 和 `gemini-3.1-flash-tts-preview` 的流式音频增量上不再发送 `mime_type`，此前内容项在 Python 中显示为 `None; rate=24000; channels=1`，在 TypeScript 中显示为 `undefined; rate=24000; channels=1`。带有 `mime_type` 的增量仍沿用它自己的类型。
- 测试：`test_unknown_events.py` 与 `unknown-events.test.ts` 新增一个离线用例，流式发送不带 `mime_type` 的音频增量，检查每个增量和完成项都是 `audio/l16; rate=24000; channels=1`。
- `llmsdk_docs/gemini_interactions`：按 2026-11-02 的官方页面重新快照 `speech-generation.md`（按轮次的 `speech_metadata`、音频输出格式、Gemini 3.8 TTS 模型），README 记录了不带 `mime_type` 的音频增量。
