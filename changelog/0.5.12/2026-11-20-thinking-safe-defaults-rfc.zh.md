# MMSP-RFC-0003 把最小安全子集定为官方客户端的思考默认值，MMSP-RFC-0005 为 `gpt-transcribe` 增加路由

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`
- **PR:** [#356](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/356)

[English](2026-11-20-thinking-safe-defaults-rfc.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改（中英文），并在历史表中记下这些情况：
  - §6.1 规定官方客户端中没有任何标记匹配的思考分支发送最小安全子集，即厂商最新一代每个思考模型都接受的请求：Gemini 为 `low`/`medium`/`high`；GPT、Claude 与 MiniMax 上 `none` 为 `low`；GLM 为强制开启思考及 `low`/`high`/`max`。仍在提供、但接受其他请求的每一代都显式匹配，思考等级标记在小写化的 id 上匹配。标记列表去掉了 `-pro`，插件中加入 `openai-speech` 的 `gemini` 插件，它在 `tts_config` 未设置或为空时发送 `voice: "Kore"`。
  - §6.3 加入 Gemini 4 Neon 的 `xhigh`、Gemini 2.5 在 `google-official` 上的 `low`/`high` 与在 `google-genai` 上不发送级别、Claude 4.5 至 Opus 5 与 Sonnet 5 上的 `disabled`，以及 GPT-5.1 至 GPT-5.6 上的 `none`。
  - §6.4 的 `tts_config` 一行涵盖 Google 客户端，并把空的 `tts_config` 视为未设置：Google 客户端与 `gemini` 插件发送 `"Kore"`，其他语音客户端不发送音色。
  - [#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349) 的历史行只写 §6.1，即该 PR 修改的唯一一节。
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md) 客户端路由在原文上修改（中英文）：§3 让 `openai-official` 经 `openai-transcription` 服务完整 id `gpt-transcribe`。
