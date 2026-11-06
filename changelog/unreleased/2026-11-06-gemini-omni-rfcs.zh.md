# MMSP-RFC-0002 与 MMSP-RFC-0003 写入 Gemini Omni 的视频

- **Date:** 2026-11-06
- **Type:** process
- **Scope:** `design`
- **PR:** [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)

[English](2026-11-06-gemini-omni-rfcs.md)

## 变更内容

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) 消息协议在原文上修改，中英文同步，Introduction 加入了这次的事由。§3.4 写明 `inline_data` 内容项承载的媒体（图片、音频或视频）：图片或视频一个片段就是一个内容项，音频是同一个内容项的多个片段；以 URI 交付的视频是一个装着该 URI 的 `text` 内容项。
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改，中英文同步，Introduction 加入了这次的事由。§6.1 列入 `gemini-omni` 标记；§6.2 写明 `max_tokens` 不发送给 Gemini Omni，因为它的视频 token 计入 `max_output_tokens`；§6.3 在只接受 `low` 和 `high` 的 Gemini Omni 上以 `high` 运行 `medium`。
