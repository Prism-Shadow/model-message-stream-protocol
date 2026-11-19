# 0.5.12

[English](README.md)

- [2026-11-20] MMSP-RFC-0003 消息请求与 MMSP-RFC-0005 客户端路由在原文上修改，把厂商最新一代的最小安全子集定为官方客户端的思考默认值，仍在提供的各旧代均显式匹配，把空的 `tts_config` 视为未设置，并让 `gpt-transcribe` 路由至 `openai-transcription`。([详情](2026-11-20-thinking-safe-defaults-rfc.zh.md), [#356](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/356))
- [2026-11-20] TypeScript 的 `google-official` 与 `google-genai` 对空 `tts_config` 使用 `Kore` 音色，与 Python 客户端一致，不再抛错。([详情](2026-11-20-empty-tts-config-parity.zh.md), [#355](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/355))
- [2026-11-20] README 的 OpenRouter GLM-5.3 示例传入 `client_type="zai-official"`，两份 README 在模型家族中补上 `jina-` 并改用注册表所列的 `Qwen/Qwen3-Embedding-8B`，MMSP-RFC-0001 记录了 `MMSP-RFC-0014` 重编号为 `MMSP-RFC-0011`。([详情](2026-11-20-readme-routing-and-rfc-renumbering-record.zh.md), [#354](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/354))
- [2026-11-20] MMSP-RFC-0003 消息请求在原文上修改，按请求计费的端点计费的每次请求记 1,000 个提示 token，不计费的请求记 0（原为每次请求都记 1,000）。([详情](2026-11-20-webtool-billed-requests-rfc.zh.md), [#353](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/353))
- [2026-11-19] 支持 Gemini 4 Neon（`gemini-4-neon`）、OpenAI 图像与转写模型（`gpt-image-2.6-sunburst`、`gpt-image-2.6-flare`、`gpt-image-2.5-sunburst`、`gpt-transcribe`）、OpenRouter Gemini TTS（`openai-speech` 上的 `google/gemini-3.8-flash-tts`、`google/gemini-3.8-flash-lite-tts`，默认音色 `Kore`）以及 TokenDance `deepseek-asr`（`deepseek-transcription`），注册表扩充至 384 个条目，并将官方客户端的默认思考档位回退分支切换为各厂商最新模型的最小安全子集。([详情](2026-11-19-gemini-4-neon-openai-media.zh.md), [#352](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/352))
- [2026-11-19] `deepseek-webtool` 只对 DeepSeek 计费的请求，即搜到结果的搜索与返回网页 Markdown 的抓取，记 1,000 个提示 token，其余记 0。([详情](2026-11-19-deepseek-webtool-metering.zh.md), [#351](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/351))
