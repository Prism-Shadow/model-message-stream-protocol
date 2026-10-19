# 拒绝 tts_config 时抛出 UnsupportedParameterError

- **Date:** 2026-10-19
- **Type:** fix
- **Scope:** `google_genai`, `google_official`, `tests`

[English](2026-10-19-tts-config-unsupported-parameter.md)

## 变更内容

- `tts_config`：在 Gemini TTS 模型上，`google-official` 与 `google-genai` 过去拒绝条目数不是一或二的说话人列表，以及两个条目未各带 `speaker` 的列表时，Python 中抛出普通的 `ValueError`，TypeScript 中抛出普通的 `Error`。现在改为在请求发出前抛出 `UnsupportedParameterError`，`parameter` 为 `tts_config`，`client` 为客户端类名。在 Python 中它仍是 `ValueError`。
- 消息由 `tts_config must contain 1 or 2 entries.` 改为 `Gemini TTS does not support <n> speakers; tts_config takes 1 or 2 entries.`，由 `speaker is required when tts_config has 2 entries.` 改为 `Gemini TTS does not support a two-speaker tts_config without a speaker on each entry.`，两种语言一致。
- 新增离线测试，在 Python 与 TypeScript 中把三个条目、两个条目缺一个 `speaker` 这两种列表分别交给 `google-official` 与 `google-genai`，检查抛出的是 `parameter` 为 `tts_config` 的 `UnsupportedParameterError`。
