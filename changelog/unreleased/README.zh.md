# 未发布

[English](README.md)

- [2026-11-16] 注册表新增阿里巴巴的 Qwen4 Max（OpenRouter、TokenDance、DashScope 与 Qwen Token Plan），以及 OpenRouter 上腾讯的 `tencent/hy4-flash`、Google 的 `google/gemini-4-hydrogen`、inclusionAI 的 `inclusionai/ling-3.2-flash:free` 和 ByteDance Seed 的 `bytedance-seed/seedream-5-5`（从 353 条增至 361 条）。([详情](2026-11-16-qwen4-max-hy4-flash-registry.zh.md), [#331](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/331))
- [2026-11-16] MMSP-RFC-0002 消息协议、MMSP-RFC-0003 消息请求与 MMSP-RFC-0005 客户端路由在原文上修改，写入了每个音频片段由完整的 PCM 帧组成、视频的设置、图像的分辨率、DeepSeek 的语音合成与识别，以及 Gemini 4 Hydrogen：`video_config`（宽高比、分辨率、时长）作为 Gemini Omni 的 `response_format` 中的一个 `video` 条目；`image_config` 的 `image_size` 改名为 `resolution`；`deepseek-speech` 以流的形式返回原始 PCM，`tts_config` 发送为 `voice_id`；`deepseek-transcription` 只上传文件；两者的用量；`deepseek-official` 经由它们服务 `deepseek-tts` 与 `deepseek-asr`；Hydrogen 的 `xhigh`。([详情](2026-11-16-video-config-deepseek-audio-rfcs.zh.md), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330))
