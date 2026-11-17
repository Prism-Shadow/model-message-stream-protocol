# 视频设置、图像分辨率、DeepSeek 语音合成与识别，以及 Gemini 4 Hydrogen

- **Date:** 2026-11-16
- **Type:** feature
- **Scope:** `types`, `google_official`, `deepseek_speech`, `openai_speech`, `integration`
- **PR:** [#332](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/332)
- **Breaking:** yes — `image_config` 的 `image_size` 改名为 `resolution`，`ImageSize` 类型改名为 `ImageResolution`

[English](2026-11-16-video-config-hydrogen-deepseek-audio.md)

## 变更内容

- `UniConfig` 新增 `video_config`（`VideoConfig`：`aspect_ratio`；`resolution`，取 `360p`、`720p`、`1080p` 或 `4K`；以整秒计的 `duration`），见 [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) §6.2 与 §6.4。`google-official` 把它作为 `response_format` 中的一个 `video` 条目发给 Gemini Omni，`4K` 按 Google 的写法发成 `4k`，时长写成 `"<n>s"`，只发送给出的字段；对其他模型，`google-official` 对 `video_config` 抛出 `UnsupportedParameterError`，其他客户端忽略它。
- 两个包中 `ImageConfig` 的 `image_size` 改名为 `resolution`，`ImageSize` 类型改名为 `ImageResolution`。`google-official` 与 `google-genai` 把它发送为 Gemini 的 `image_size`，`openai-image` 按它查尺寸表。
- `google-official` 支持 `gemini-4-hydrogen`：思考等级 `low`、`medium`、`high` 与 `xhigh`，`none` 按 `low` 运行，`max` 按 `xhigh` 运行；Gemini 4 Carbon、Argon 与 3.x 模型仍以 `high` 运行 `xhigh` 与 `max`。
- `deepseek-speech` 在两个包中以流的形式调用 DeepSeek 的语音合成（`POST /v1/tools/tts`）：每条消息一次请求，带消息的文本、`format: "pcm"`，以及取自只有一项的 `tts_config` 的 `voice_id`；每一块一到达就作为同一个内容项的 `inline_data` 流出，类型为 `audio/l16; rate=24000; channels=1`。`prompt_tokens` 是 DeepSeek 计费的字符数，一个汉字算 2 个，其他字符算 1 个。
- `deepseek-transcription` 以只含 `file` 的 multipart 表单调用 DeepSeek 的语音识别（`POST /v1/tools/asr`），文件是消息中唯一的音频内容项，PCM 封装成 WAV；转写文字作为一个 `text` 内容项流出，`prompt_tokens` 是 `duration_ms` 换算成的秒数，向上取整。
- `deepseek-speech` 与 `openai-speech` 以完整的 16 位帧发送原始 PCM，见 [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.zh.md) §3.4：HTTP 分块劈开的帧，其开头的字节等到下一个片段再发出（DeepSeek 与 OpenAI 的分块都会劈开采样）；不含完整帧的分块是空的增量事件；结束时剩下的字节最后发出。在最后一块之前中断的分块响应抛出异常，不会以 `stop` 结束。
- 两个服务端的 Playground 通过 Web Audio 边接收边播放原始 PCM 语音，每个片段紧接着前一个片段排期播放，并有一个停止按钮；播完后变为可重放的播放器；其他音频格式仍在完整后播放。
- 两个服务端的 Playground 增加麦克风按钮：录下的片段无论浏览器的录音器写成什么格式，都以 `audio/wav`（16 kHz 单声道 16 位 PCM）附上；在非安全上下文中按钮禁用；录音满五分钟或发送消息时停止。
- 两个服务端的 Playground 增加 `POST /api/key`，说明页面不发送 key 时，按页面选项构建的客户端从哪里取 key：环境变量名及 key 的末四位（短于十二个字符的 key 一位也不显示）、未设置的环境变量、不带 key 调用的开放服务端，或环境变量里的 key 不能发往的 base URL。API key 一栏把它显示为占位文字；请求缺少所需的 key 时显示为红色。
- `deepseek-official` 经由 `deepseek-speech` 服务 `deepseek-tts`，经由 `deepseek-transcription` 服务 `deepseek-asr`，见 [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.zh.md) §3；两个客户端类型都读取 `DEEPSEEK_API_KEY` 与 `DEEPSEEK_BASE_URL`。
- 注册表新增 `gemini-4-hydrogen`、`deepseek-tts` 与 `deepseek-asr`（从 353 条增至 356 条）。
- `.github/ci/models.json` 在 `google-official` 下以 `gemini-4-hydrogen` 取代 `gemini-3.8-flash`，并新增 `deepseek-speech` 组的 `deepseek-tts` 与 `deepseek-transcription` 组的 `deepseek-asr`。两个 e2e 测试套件中，共享的视频用例发送 `video_config`（9:16、360p、3 秒），图像用例发送 `resolution`，转写用例改为以 `audio/wav` 发送 whisper.cpp 的 `jfk.wav`，取代 Whisper 的 `jfk.flac`；模型索引的转写程序也改用这个文件。
- `llmsdk_docs/gemini4/` 新增 Gemini 4 Hydrogen 的页面快照，并刷新最新模型、价格、弃用与思考页面；`llmsdk_docs/gemini_omni/` 记录线上 API 接受的视频设置；`llmsdk_docs/deepseek_audio/` 新增 DeepSeek 语音合成与语音识别指南的快照。

## 配置行为

| 键 | `google-official` 上的 Gemini Omni | `deepseek-speech` | `deepseek-transcription` |
| --- | --- | --- | --- |
| `video_config` | `response_format: [{"type": "video", ...}]` | 忽略 | 忽略 |
| `tts_config` | 忽略 | 唯一一项的 `voice` 发送为 `voice_id`；未设置时不发送 `voice_id`；两项及以上抛错 | 忽略 |
| `fast_mode` | 抛错 | 抛错 | 抛错 |
| `thinking_level` | `low` 或 `high` | 忽略 | 忽略 |

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 | 输出 | 上下文 | 每百万计价 |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-4-hydrogen` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image, Video, Audio | Text | 1,048,576 | 输入 $1.50，输出 $7.50，缓存 $0.075 |
| `deepseek-tts` | `https://api.deepseek.com` | `deepseek-official` | Text | Audio | — | 每百万计费字符 ¥300（每万字符 ¥3） |
| `deepseek-asr` | `https://api.deepseek.com` | `deepseek-official` | Audio | Text | — | 每百万秒 ¥216.666667（每小时 ¥0.78） |

## 兼容性

- 把每个 `image_config` 中的 `image_size` 改名为 `resolution`，取值不变（`1K`、`2K`）；TypeScript 的导入中把 `ImageSize` 改为 `ImageResolution`。仍然带 `image_size` 的 `image_config` 没有分辨率：Gemini 与 `openai-image` 生成默认尺寸。
