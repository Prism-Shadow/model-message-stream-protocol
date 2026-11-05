# 图像生成、语音合成与语音转写

- **Date:** 2026-11-05
- **Type:** feature
- **Scope:** `openai_image`, `openai_speech`, `openai_transcription`, `registry`, `integration`
- **PR:** [#IMPLPR](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/IMPLPR)

[English](2026-11-05-media-generation.md)

## 变更内容

- 实现了 [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316) 在 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md)、[MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md)、[MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.zh.md) 与 [MMSP-RFC-0007](../../design/rfcs/MMSP-RFC-0007-error-types.zh.md) 中写入的媒体部分。
- 新增三个兼容客户端，Python 和 TypeScript 同步，基于 OpenAI SDK，使用 `OPENAI_API_KEY` / `OPENAI_BASE_URL` 这一行凭据：`openai-image`（`OpenaiImageClient`，`POST /images/generations`）、`openai-speech`（`OpenaiSpeechClient`，`POST /audio/speech`）和 `openai-transcription`（`OpenaiTranscriptionClient`，`POST /audio/transcriptions`）。每条消息是一次请求；`list_models` 列出端点 `/models` 的模型。
- `openai-image` 读取每个答案的 JSON，不请求流式，也不发送 `response_format`。每张图片作为一个 `inline_data` 内容项流出：解码它的 `b64_json`，或者用一个独立的客户端下载它的 `url`，下载时不带密钥、默认请求头和 OpenAI 环境中的任何变量。下载得到 HTTP 错误时抛出 `ProviderStreamError`，以状态码作为 `code`。MIME 类型取自 `media_type`，其次是 `image/<output_format>`，再其次由字节判断（PNG、WebP、GIF，其余为 JPEG）。
- `openai-speech` 把响应的字节作为每条消息一个内容项的 `inline_data` 分块流出，无文件头的 `audio/pcm;rate=44100;channels=1` 命名为 `audio/l16; rate=44100; channels=1`，其他格式沿用它的 `content-type`。它不发送 `response_format`。
- `openai-transcription` 以 OpenAI 的 multipart 表单（`file`、`model`，不发送 `prompt`）上传每条消息中唯一的音频 `inline_data.done`，文件按 MIME 类型命名为 `audio.<扩展名>`；无文件头的 PCM（`audio/l16`、`audio/pcm`）按它的 `rate` 与 `channels` 封装成 WAV 发送。消息含文本、图片或第二个音频内容项，或者 PCM 没有 `rate` 时，在请求发出前抛错。
- 路由：`openai-official` 通过 `openai-image` 服务 `gpt-image-*`，显式指定和按 ID 推断都是如此。
- Playground 的附件按钮可以选择音频文件，以 base64 的 `data` 作为 `inline_data.done` 发送，两个服务端的 `/api/chat` 把它解码成字节；用户气泡中可以播放这段音频。Playground 和 server 页面为三个客户端类型加上了说明。Tracer 按 MIME 类型中的采样率与声道数把 PCM 封装成 WAV，没有写明时为 24 kHz 单声道。
- `.github/ci/models.json` 新增 `openai-image` 组（`gpt-image-2.5-flare`，以及作为慢用例的 OpenRouter 上的 `bytedance-seed/seedream-5-0-flash` 和 TokenDance 上的 `seedream-5.0-lite`）、`openai-speech` 组（`fish-audio/drama-3`）和 `openai-transcription` 组（`fish-audio/transcribe-1`）。共享 e2e 测试新增 `support_transcription` 能力标记和读取 Whisper 的 `jfk.flac` 的转写用例，Python 的 concat 用例跳过转写模型，图像用例改为请求 `image_size: "2K"`，单说话人语音用例不再发送 `tts_config`。
- 注册表从 353 条增至 358 条，见下表。模型索引的集成代码为图像行请求 2K，语音行的播放说明改为按程序打印的 MIME 类型中的采样率与声道数播放，为转写行提供一个下载 `jfk.flac` 并打印文字的程序，以及一个先把 base64 请求写入 `request.json` 的 Server 标签页。`VENDORS` 新增 Fish Audio，并把 `seedream-` 归入 ByteDance Seed。`/models/` 从 1,204,979 字节增至 1,221,118 字节（gzip 后从 56,258 增至 56,974），`/zh/models/` 从 1,217,675 增至 1,233,948（57,140 增至 57,871），目录脚本从 16,543 增至 17,629（6,814 增至 7,158）。
- 文档：configuration、models、streaming、errors 各页，README，两个包的 README，`skills/` 和开发 skill 都写入了三个客户端。

## 配置行为

| `UniConfig` | `openai-image` | `openai-speech` | `openai-transcription` |
| --- | --- | --- | --- |
| `image_config` | 取自下表的 `size`；没有 `image_size` 时取 1K，没有 `aspect_ratio` 时取 1:1，两者都没有时不发送 `size` | 忽略 | 忽略 |
| `tts_config` | 忽略 | 唯一一项的 `voice`；没有时不发送；两项及以上抛错 | 忽略 |
| `fast_mode: true` | 抛错 | 抛错 | 抛错 |
| `thinking_level` 及其他所有键 | 忽略 | 忽略 | 忽略 |

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

## 用量

| 客户端 | `prompt_tokens` | `response_tokens` |
| --- | --- | --- |
| `openai-image` | `input_tokens`（OpenAI）或 `prompt_tokens`（OpenRouter）；两者都不报告时为 `None`（TokenDance） | `output_tokens`（OpenAI、TokenDance）或 `completion_tokens`（OpenRouter） |
| `openai-speech` | 输入的 UTF-8 字节数 | 0 |
| `openai-transcription` | `usage.seconds`，向上取整 | 0 |

每个计数是各次请求之和；`finish_reason` 为 `stop`。

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 → 输出 | 每百万提示 / 回答价格 |
| --- | --- | --- | --- | --- |
| `gpt-image-2.5-flare` | `https://api.openai.com/v1` | `openai-official`，经由 `openai-image` | Text → Image | $5 / $30，缓存 $1.25 |
| `bytedance-seed/seedream-5-0-flash` | `https://openrouter.ai/api/v1` | `openai-image` | Text → Image | $0 / $4.311377 |
| `fish-audio/drama-3` | `https://openrouter.ai/api/v1` | `openai-speech` | Text → Audio | $10 / $0 |
| `fish-audio/transcribe-1` | `https://openrouter.ai/api/v1` | `openai-transcription` | Audio → Text | $100 / $0 |
| `seedream-5.0-lite` | `https://tokendance.space/gateway/v1` | `openai-image` | Text → Image | ¥0 / ¥13.427734 |

- **gpt-image-2.5-flare**：https://developers.openai.com/api/docs/models/gpt-image-2.5-flare （2026-11-04 读取）：每百万文本输入 token $5，缓存 $1.25，每百万图像输出 token $30。
- **seedream-5-0-flash**：无论尺寸，每张图片 $0.018（OpenRouter 的模型页与 `/api/v1/images/models`，2026-11-04 读取）；存储的是 models API 给出的 `image_output` 单价，1K 图片（4,096 个 token）约合 $0.018，2K 图片（16,384 个）约合其四倍。
- **drama-3**：提示 token 是输入的 UTF-8 字节数，每百万 $10，即未打折的价格；2026-11-04 时该端点在做减免 80% 的首发优惠（$2）。
- **transcribe-1**：提示 token 是音频的秒数，每秒 $0.0001（2026-11-04 读取）。
- **seedream-5.0-lite**：每张图片 ¥0.22（TokenDance 的 `items` 价格，2026-11-04 读取），按 2048x2048 图片的 16,384 个输出 token 折算，这是它的默认尺寸和最小的正方形尺寸。
