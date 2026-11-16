# 未发布

[English](README.md)

- [2026-11-16] `UniConfig.video_config` 在 `google-official` 上设置 Gemini Omni 的宽高比、分辨率与时长；`image_config` 的 `image_size` 改名为 `resolution`（不兼容）；`google-official` 支持 `gemini-4-hydrogen` 及其 `xhigh` 思考；`deepseek-speech` 以流的形式返回 DeepSeek 语音合成的原始 PCM，`deepseek-transcription` 只把文件发给 DeepSeek 的语音识别，`deepseek-official` 以 `deepseek-tts` 与 `deepseek-asr` 服务它们；注册表新增这三项（从 353 条增至 356 条）。([详情](2026-11-16-video-config-hydrogen-deepseek-audio.zh.md), [#332](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/332))
- [2026-11-16] MMSP-RFC-0003 消息请求与 MMSP-RFC-0005 客户端路由在原文上修改，写入了视频的设置、图像的分辨率、DeepSeek 的语音合成与识别，以及 Gemini 4 Hydrogen：`video_config`（宽高比、分辨率、时长）作为 Gemini Omni 的 `response_format` 中的一个 `video` 条目；`image_config` 的 `image_size` 改名为 `resolution`；`deepseek-speech` 以流的形式返回原始 PCM，`tts_config` 发送为 `voice_id`；`deepseek-transcription` 只上传文件；两者的用量；`deepseek-official` 经由它们服务 `deepseek-tts` 与 `deepseek-asr`；Hydrogen 的 `xhigh`。([详情](2026-11-16-video-config-deepseek-audio-rfcs.zh.md), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330))
