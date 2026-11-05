# 图像生成、语音合成与语音转写写入规范

- **Date:** 2026-11-05
- **Type:** process
- **Scope:** `design`
- **PR:** [#RFCPR](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/RFCPR)

[English](2026-11-05-media-generation-rfcs.md)

## 变更内容

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求：§3.2 规定了 `openai-image`、`openai-speech` 与 `openai-transcription` 所用的图像、语音与转写端点。图像从一个 JSON 中读取，不请求流式，不发送 `response_format`，取自 `b64_json`，没有时从 `url` 不带凭据地下载，MIME 类型取自 `media_type`、`output_format` 或图像的字节；语音以同一个内容项的 `inline_data` 分块流出音频字节，无文件头的 PCM 按响应 `content-type` 命名为 `audio/l16; rate=<rate>; channels=<channels>`；转写以 OpenAI 的 multipart 表单上传消息中唯一的音频内容项，PCM 封装成 WAV，不发送 `prompt`。每个客户端每条消息发一次请求。`stop` 带 `finish_reason` `stop` 与各次请求之和的用量：图像为端点的输入与输出 token 数，语音以输入的 UTF-8 字节数作为 `prompt_tokens`，转写以音频秒数向上取整作为 `prompt_tokens`。§5 把下载图像 `url` 失败列为 `ProviderStreamError` 的来源之一，§6.3 把这三个客户端的模型列为不思考的模型，§6.4 把 `tts_config` 映射为 `voice`，把 `image_config` 按 Gemini 的 1K 与 2K 尺寸表映射为 `size`。
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md) 客户端路由：`openai-official` 经由 `openai-image` 服务 `gpt-image-` 模型，显式指定或按 ID 推断都是如此。
- [MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.zh.md) 服务上游密钥：新增的 §7 规定，端点在答案中给出的链接由客户端自己的 HTTP 客户端下载，不带任何凭据：既不带它的密钥，也不带它的默认请求头，也不带环境中的变量。
- [MMSP-RFC-0007](../../design/rfcs/MMSP-RFC-0007-error-types.zh.md) 异常类型：§3.2 把下载生成图像的 `url` 时得到的 HTTP 错误状态定为 `ProviderStreamError`，以该状态码作为它的 code。

## 图像尺寸

| `aspect_ratio` | `1K` | `2K` |
| --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` |
| `2:3` | `848x1264` | `1696x2528` |
| `3:2` | `1264x848` | `2528x1696` |
| `3:4` | `896x1200` | `1792x2400` |
| `4:3` | `1200x896` | `2400x1792` |
| `9:16` | `768x1376` | `1536x2752` |
| `16:9` | `1376x768` | `2752x1536` |
| `21:9` | `1584x672` | `3168x1344` |
