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

非对话端点（图像生成、视频生成、语音合成、语音识别、向量生成、网页搜索与抓取）同样通过 `usage_metadata` 的四个字段报告计费单位，`list_supported_models`（TypeScript 中为 `listSupportedModels`）中的 `pricing` 也按相同的百万计费单位存储单价。对于注册表中任意带有 `pricing` 的模型，单轮调用成本可直接按统一公式计算：

```text
cost = (
  (cached_tokens   * (pricing.cached_tokens or 0))
  + (prompt_tokens   * pricing.prompt_tokens)
  + (output_tokens   * pricing.response_tokens)
) / 1_000_000
```

思考没有单独的价格：`output_tokens`，即思考与回答之和（见[总计](#总计)），在每一行都按输出单价 `pricing.response_tokens` 计费。

| 模态与客户端 | `usage_metadata` 计数规则 | `list_supported_models` 中的 `pricing` |
| --- | --- | --- |
| 文本、视觉与推理（`openai-official`、`anthropic-official`、`google-official`、`deepseek-official`、`moonshot-official`、`zai-official`、`minimax-official`、`openai-responses`、`openai-chat`、`ant-messages`、`google-genai`） | `cached_tokens`、`prompt_tokens`、`thoughts_tokens` 和 `response_tokens` 报告服务商返回的 token 数。 | `pricing.response_tokens` 为输出 token 单价，`thoughts_tokens` 也按此计费。 |
| 图像生成（`google-official`、`google-genai`、`openai-image`，以及 `gpt-image-*` 下的 `openai-official`） | `prompt_tokens` 和 `response_tokens` 报告输入 token 与图像输出 token（Gemini 图像模型在思考时还会报告 `thoughts_tokens`）。 | `gemini-nano-banana-2.1` 的 `pricing.response_tokens` 为图像输出单价（$30/1M），其思考也按此计费。按张计费的 `seedream-*` 模型（OpenRouter、TokenDance）在 `response_tokens` 中报告网关对该尺寸返回的完成 token 数（1K 为 4,096，2K 为 16,384）。`pricing.response_tokens` 只在一个尺寸上算出单张价格：OpenRouter 为 1K，TokenDance 为 2048x2048；更大的图片按公式算出的成本高于网关按张收取的固定价格。 |
| 视频生成（`google-official` 上的 `gemini-omni-1.2-flash`） | `prompt_tokens`、`thoughts_tokens` 和 `response_tokens` 分别报告输入、思考和视频输出 token（默认 720p 下每秒 5,792 个视频 token）。 | `pricing.response_tokens` 为视频输出单价（$12/1M），其思考也按此计费。 |
| 语音合成（`openai-speech`） | `/audio/speech` 直接流式返回原始音频字节、不带用量头：MMSP 将输入文本的 UTF-8 字节数记入 `prompt_tokens`，`response_tokens` 记为 `0`。 | `pricing.prompt_tokens` 为每百万 UTF-8 字节的价格（如 `fish-audio/drama-3`）。`openai-speech` 上的 Gemini TTS 模型（`google/gemini-3.8-flash-tts`、`google/gemini-3.8-flash-lite-tts`）按 `/audio/speech` 不报告的音频输出 token 计费，因此这些行省略 `pricing`。 |
| 语音合成（`deepseek-speech`，以及 `deepseek-tts` 下的 `deepseek-official`） | DeepSeek 按字符计费，每个汉字（CJK 统一表意文字与兼容表意文字、扩展 A–J）计为 2 个字符，其余字符计为 1 个字符：MMSP 将计费字符数记入 `prompt_tokens`，`response_tokens` 记为 `0`。 | `pricing.prompt_tokens` 为每百万计费字符的价格（¥300/1M = 每万字符 ¥3）。 |
| 语音合成（`google-official` 与 `google-genai` 上的 Gemini TTS） | `prompt_tokens` 和 `response_tokens` 报告 Interactions 或 generateContent 返回的文本输入与音频输出 token。 | 注册表中省略 `pricing`。 |
| 语音识别（`openai-transcription`、`deepseek-transcription`、`gpt-transcribe` 下的 `openai-official`、`deepseek-asr` 下的 `deepseek-official`） | 按向上取整的音频整秒数计费（`openai-transcription` 为 `ceil(seconds)`，`deepseek-transcription` 为 `ceil(duration_ms / 1000)`）：MMSP 将计费秒数记入 `prompt_tokens`，`response_tokens` 记为 `0`。 | `pricing.prompt_tokens` 为每百万秒的价格（即 `每秒单价 * 1_000_000`，例如 `gpt-transcribe` 为 $75/1M = $0.0045/分钟，`fish-audio/transcribe-1` 为 $100/1M = $0.0001/秒，DeepSeek `deepseek-asr` 为 ¥216.67/1M = ¥0.78/小时，TokenDance `deepseek-asr` 为 ¥110/1M = ¥0.00011/秒）。 |
| 向量生成（`openai-embedding`、`google-official`、`google-genai`，以及 `text-embedding-*` 下的 `openai-official`） | `prompt_tokens` 报告输入 token 数（`response_tokens` 为 `0` 或 null）。 | `pricing.prompt_tokens` 为每百万输入 token 的价格。 |
| 网页搜索与网页抓取（`jina-webtool`） | `prompt_tokens` 报告 Jina 对该次请求计费的 token 数（搜索固定 10,000，抓取为页面 token 数），`response_tokens` 为 null。 | `pricing.prompt_tokens` 为 Jina 每百万 token 的价格（$0.05/1M）。 |
| 网页搜索与网页抓取（`deepseek-webtool`，以及 `deepseek-search` 和 `deepseek-fetch` 下的 `deepseek-official`） | 按请求次数而非 token 计费：MMSP 将每次请求在 `prompt_tokens` 中记为 `1,000`（`response_tokens` 为 null）。 | `pricing.prompt_tokens`（每百万 prompt tokens 的价格）等于每 1,000 次请求的价格（¥5/1M = 每千次请求 ¥5）。 |
