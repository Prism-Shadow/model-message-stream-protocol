# MMSP-RFC-0003 与 MMSP-RFC-0005 写入视频设置、图像分辨率、DeepSeek 的语音合成与识别，以及 Gemini 4 Hydrogen

- **Date:** 2026-11-16
- **Type:** process
- **Scope:** `design`
- **PR:** [#PR](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/PR)

[English](2026-11-16-video-config-deepseek-audio-rfcs.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改，中英文同步，Introduction 加入了这次的事由。§3.2 加入 `deepseek-speech`（请求原始 PCM，每一块一到达就产出）与 `deepseek-transcription`（只上传文件），以及它们的用量：DeepSeek 计费的字符数（一个汉字算 2 个），以及音频的 `duration_ms` 换算成的整秒数。§6.2 规定 `video_config` 只发送给 Gemini Omni。§6.3 在 Gemini 4 Hydrogen 上原样运行 `xhigh`、以 `xhigh` 运行 `max`，并把两个 DeepSeek 客户端列入不思考的模型。§6.4 把 `image_config` 的 `image_size` 改名为 `resolution`，在两个 Google 客户端上是 Gemini 的 `image_size`；`tts_config` 在 `deepseek-speech` 上发送为 `voice_id`；`video_config` 映射为 Gemini Omni 的 `response_format` 中的一个 `video` 条目，`duration` 写成 `"<n>s"`，`4K` 写成 `4k`。
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md) 客户端路由在原文上修改，中英文同步，Introduction 加入了这次的事由。§3 规定 `deepseek-official` 经由 `deepseek-speech` 服务 `deepseek-tts`，经由 `deepseek-transcription` 服务 `deepseek-asr`。
