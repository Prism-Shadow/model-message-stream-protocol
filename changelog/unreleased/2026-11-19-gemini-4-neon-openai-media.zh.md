# Gemini 4 Neon、OpenAI 图像与语音转写模型、OpenRouter Gemini TTS 与 TokenDance DeepSeek ASR

- **Date:** 2026-11-19
- **Type:** feature
- **Scope:** `google-official`, `openai-official`, `openai-speech`, `registry`, `credentials`
- **PR:** [#352](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/352)

[English](2026-11-19-gemini-4-neon-openai-media.md)

## 变更内容

- `google-official` 与 `google-genai` 将 `gemini-4-neon` 加入 `google-official` 的 `("low", "medium", "high", "xhigh")` 思考档位（`none` 映射为 `"low"`，`max` 映射为 `"xhigh"`；`google-genai` 受限于 SDK 的 `ThinkingLevel` 枚举上限，映射至 `("low", "medium", "high")`）。
- `openai-official` 在 `routed_client_type` / `routedClientType` 中除 `text-embedding-*`（`openai-embedding`）和 `gpt-image-*`（`openai-image`）外，新增将 `gpt-transcribe` 路由至 `openai-transcription`。
- `openai-speech` 新增 `GeminiPlugin`（`models = r"gemini-.*tts"`），在未传入 `tts_config` 时将默认 `request["voice"]` 设为 `"Kore"`，使 OpenRouter 上的 `google/gemini-3.8-flash-tts` 与 `google/gemini-3.8-flash-lite-tts` 无需显式传入 `tts_config` 即可合成语音。
- 各官方客户端将 `thinking_level` 的默认分支切换为最小安全子集，即厂商最新一代每个模型都接受的请求，并在小写化的模型 id 上显式匹配旧代模型（[MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md#61-明确匹配) §6.1）：
  - `google-official` 与 `google-genai` 默认回退至 `("low", "medium", "high")`（原为 `("minimal", "low", "medium", "high")`），对 `("gemini-3-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.6-flash", "gemini-robotics")` 匹配 `("minimal", "low", "medium", "high")`。`"gemini-2.5"` 在 `google-official` 上取 `("low", "high")`，在 `google-genai` 上不发送 `thinking_level`；`google-genai` 补齐 `"gemini-omni"`（`("low", "high")`）。
  - `openai-official` 与 `openai-responses` 的 `gpt` 插件仅在 `("gpt-5.", "gpt-6-luna", "gpt-6.1-terra")` 上为 `ThinkingLevel.NONE` 发送 `"none"`，其他模型（包括 GPT-5 本身）发送 `"low"`。
  - `anthropic-official` 默认将 `ThinkingLevel.NONE` 映射为 effort `"low"` 的自适应思考，对 `"sonnet-5-5"` 匹配 `"between_tools"`，对 `("4-5", "4-6", "4-7", "4-8")` 以及不含 `"-5-5"` 的 `"opus-5"` / `"sonnet-5"` 匹配 `"disabled"`。
  - `zai-official` 默认使用 GLM-5.3 的强制思考与 `("low", "high", "max")` 档位，对 `("glm-4", "glm-5.1", "glm-5.2")` 以及其后不接 `"glm-5."` 的 `"glm-5"`（GLM-5、GLM-5-Turbo、GLM-5V-Turbo、网关的 `z-ai/glm-5:exacto`）匹配 `"disabled"` 与原样传递的 effort。
  - `minimax-official` 默认使用 MiniMax-M3.1-Flash 的 `ThinkingLevel.NONE` → `"low"` 及 `LOW`..`MAX` 原样传递（MiniMax-M2.x 同样接受），对 `MiniMax-M3`（含 `"minimax-m3"` 但不含 `"minimax-m3."`）匹配 `"none"` 与 `xhigh`/`max` → `"high"`。
- 注册表新增 14 个条目，总数扩充至 384 条：
  - Gemini API 上的 `gemini-4-neon`（`google-official`，输入文本/图片/视频/音频，输出文本，上下文 1,048,576，每百万 token 提示 $3.00 / 输出 $15.00 / 缓存 $0.15）与 OpenRouter 上的 `google/gemini-4-neon`（`openai-responses`，输入文本/图片，输出文本，上下文 1,048,576，$3.00 / $15.00 / $0.15）。
  - OpenAI 上的 `gpt-image-2.6-sunburst`、`gpt-image-2.6-flare`、`gpt-image-2.5-sunburst`（`openai-official`，输入文本，输出图片，每百万 token 提示 $5.00 / 输出 $30.00 / 缓存 $1.25）与 OpenRouter 上的 `openai/gpt-image-2.6-sunburst`、`openai/gpt-image-2.6-flare`、`openai/gpt-image-2.5-sunburst`、`openai/gpt-image-2.5-flare`（`openai-image`，输入文本，输出图片，$5.00 / $30.00）。
  - OpenAI 上的 `gpt-transcribe`（`openai-official`，输入音频，输出文本，每百万秒 $75.00 = $0.0045/分钟）与 OpenRouter 上的 `openai/gpt-transcribe`（`openai-transcription`，输入音频，输出文本，每百万秒 $75.00）。
  - OpenRouter 上的 `google/gemini-3.8-flash-tts` 与 `google/gemini-3.8-flash-lite-tts`（`openai-speech`，输入文本，输出音频）。
  - TokenDance 上的 `deepseek-asr`（`https://tokendance.space/gateway/deepseek` 上的 `deepseek-transcription`，输入音频，输出文本，每百万秒 ¥110.00 = ¥0.00011/秒）。
- 共享测试目录（`models.json`）将 `gpt-image-2.5-flare` 替换为 `gpt-image-2.6-flare`，在 `openai-transcription` 下新增 `gpt-transcribe`，并在 `openai-speech` 下新增 OpenRouter 的 `google/gemini-3.8-flash-tts`。
- 文档（`site/src/docs/usage.{en,zh}.md`、`models.{en,zh}.md`、`configuration.{en,zh}.md`）与 MMSP 技能文件（`skills/mmsp-python/`、`skills/mmsp-typescript/`）同步补充了新模型、反转后的思考档位映射表，以及多模态/非 Token `usage_metadata` 与 `list_supported_models()` 的统一计费换算说明。
