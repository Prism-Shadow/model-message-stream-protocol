---
description: 一次响应的四个 token 计数，以及它们如何相加。
---

每条流的最后一个事件 `stop` 会携带本次请求的 token 计数，位于 `usage_metadata` 字段中。

```json
{"cached_tokens": 120, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27}
```

| 字段 | 计数 |
| --- | --- |
| `cached_tokens` | 从服务商缓存读取的输入 token |
| `prompt_tokens` | 未命中缓存的输入 token |
| `thoughts_tokens` | 用于思考的输出 token |
| `response_tokens` | 回答本身的输出 token |

## 总计

```text
input_tokens  = cached_tokens + prompt_tokens
output_tokens = thoughts_tokens + response_tokens
total_tokens  = input_tokens + output_tokens
```

服务商未报告的计数为 null，应视为零。

## 读取位置

从 `stop` 事件读取计数，只需读取一次。`delta` 事件中的该字段为 null，无需跨事件累加。

有状态调用记录的助手消息也包含相同的 `usage_metadata`，因此存储的历史会话会保留每一轮的成本。

即使响应抛出了 `EmptyResponseError`，也已消耗 token。该错误同样包含其 `usage_metadata`。`IncompleteStreamError` 包含流中途断开之前已经到达的 `usage_metadata`，没有到达则为 null。

## 多模态与非 Token 计费

非对话端点（图像生成、视频生成、语音合成、语音识别、向量生成、网页搜索与抓取）同样通过 `usage_metadata` 的四个字段报告计费单位，`list_supported_models`（TypeScript 中为 `listSupportedModels`）为每个条目的这四个字段各给出一个按相同单位、每百万计的单价。单轮调用的成本为：

```text
cost = (
  cached_tokens     * pricing.cached_tokens
  + prompt_tokens   * pricing.prompt_tokens
  + thoughts_tokens * pricing.thoughts_tokens
  + response_tokens * pricing.response_tokens
) / 1_000_000
```

为 null 的计数按零计。平台未公布缓存命中价格时，`pricing.cached_tokens` 取输入单价；厂商未给思考单列价格时，`pricing.thoughts_tokens` 取输出单价。

| 模态与客户端 | `usage_metadata` 计数规则 | `list_supported_models` 中的 `pricing` |
| --- | --- | --- |
| 文本、视觉与推理（`openai-official`、`anthropic-official`、`google-official`、`deepseek-official`、`moonshot-official`、`zai-official`、`minimax-official`、`openai-responses`、`openai-chat`、`ant-messages`、`google-genai`） | `cached_tokens`、`prompt_tokens`、`thoughts_tokens` 和 `response_tokens` 报告服务商返回的 token 数。 | `pricing.thoughts_tokens` 与 `pricing.response_tokens` 都是输出 token 单价。 |
| 图像生成（`google-official`、`google-genai`、`openai-image`，以及 `gpt-image-*` 下的 `openai-official`） | `prompt_tokens` 报告输入 token。上游按模态拆分输出 token 且其中有图像 token 时，`response_tokens` 只计图像 token，`thoughts_tokens` 计思考与文本；否则 `response_tokens` 计输出。按张计费的模型（TokenDance 上的 `openai-image`，以及 OpenRouter 的 `bytedance-seed/seedream-*`）每生成一张图在 `response_tokens` 中计 `1,000`，端点不对输入计费时 `prompt_tokens` 为 `0`。 | `pricing.response_tokens` 为图像输出单价（`gemini-nano-banana-2.1` 为 $30/1M），`pricing.thoughts_tokens` 为厂商的文本输出单价（该模型为 $7.50/1M）。按张计费的模型，`pricing.response_tokens` 为单张价格 × 1,000（TokenDance 的 `seedream-5.0-lite` 为 ¥0.22 → ¥220/1M）。 |
| 视频生成（`google-official` 上的 `gemini-omni-1.2-flash`） | `prompt_tokens` 报告输入，`thoughts_tokens` 报告思考与文本，`response_tokens` 报告视频输出 token（默认 720p 下每秒 5,792 个）。 | `pricing.thoughts_tokens` 为文本输出单价（$9/1M），`pricing.response_tokens` 为视频输出单价（$12/1M）。 |
| 语音合成（`openai-speech`） | `/audio/speech` 直接流式返回原始音频字节、不带用量头：MMSP 将输入文本的 UTF-8 字节数记入 `prompt_tokens`。`response_tokens` 记为 `0`，Gemini TTS 模型（`google/gemini-3.8-flash-tts`、`google/gemini-3.8-flash-lite-tts`）除外，按 Google 公布的每秒 25 个音频 token 记为 `ceil(音频秒数 * 25)`。 | `pricing.prompt_tokens` 为每百万 UTF-8 字节的价格（如 `fish-audio/drama-3`）；在 Gemini TTS 上为文本输入 token 单价，`pricing.response_tokens` 为音频输出 token 单价（`google/gemini-3.8-flash-tts` 为 $18/1M）。 |
| 语音合成（`deepseek-speech`，以及 `deepseek-tts` 下的 `deepseek-official`） | DeepSeek 按字符计费，每个汉字（CJK 统一表意文字与兼容表意文字、扩展 A–J）计为 2 个字符，其余字符计为 1 个字符：MMSP 将计费字符数记入 `prompt_tokens`，`response_tokens` 记为 `0`。 | `pricing.prompt_tokens` 为每百万计费字符的价格（¥300/1M = 每万字符 ¥3）。 |
| 语音合成（`google-official` 与 `google-genai` 上的 Gemini TTS） | `prompt_tokens` 和 `response_tokens` 报告 Interactions 或 generateContent 返回的文本输入与音频输出 token。 | `pricing.prompt_tokens` 为文本输入单价，`pricing.response_tokens` 为音频输出单价（`gemini-3.8-flash-tts` 为 $18/1M）。 |
| 语音识别（`openai-transcription`、`deepseek-transcription`、`gpt-transcribe` 下的 `openai-official`、`deepseek-asr` 下的 `deepseek-official`） | 按向上取整的音频整秒数计费（`openai-transcription` 为 `ceil(seconds)`，`deepseek-transcription` 为 `ceil(duration_ms / 1000)`）：MMSP 将计费秒数记入 `prompt_tokens`，`response_tokens` 记为 `0`。 | `pricing.prompt_tokens` 为每百万秒的价格（即 `每秒单价 * 1_000_000`，例如 `gpt-transcribe` 为 $75/1M = $0.0045/分钟，`fish-audio/transcribe-1` 为 $100/1M = $0.0001/秒，DeepSeek `deepseek-asr` 为 ¥216.67/1M = ¥0.78/小时，TokenDance `deepseek-asr` 为 ¥110/1M = ¥0.00011/秒）。 |
| 向量生成（`openai-embedding`、`google-official`、`google-genai`，以及 `text-embedding-*` 下的 `openai-official`） | `prompt_tokens` 报告输入 token 数（`response_tokens` 为 `0` 或 null）。 | `pricing.prompt_tokens` 为每百万输入 token 的价格；`pricing.thoughts_tokens` 与 `pricing.response_tokens` 为 `0`。 |
| 网页搜索与网页抓取（`jina-webtool`） | `prompt_tokens` 报告 Jina 对该次请求计费的 token 数（搜索固定 10,000，抓取为页面 token 数），`response_tokens` 为 null。 | `pricing.prompt_tokens` 为 Jina 每百万 token 的价格（$0.05/1M）。 |
| 网页搜索与网页抓取（`deepseek-webtool`，以及 `deepseek-search` 和 `deepseek-fetch` 下的 `deepseek-official`） | 按请求次数而非 token 计费：MMSP 将每次请求在 `prompt_tokens` 中记为 `1,000`（`response_tokens` 为 null）。 | `pricing.prompt_tokens`（每百万 prompt tokens 的价格）等于每 1,000 次请求的价格（¥5/1M = 每千次请求 ¥5）。 |
