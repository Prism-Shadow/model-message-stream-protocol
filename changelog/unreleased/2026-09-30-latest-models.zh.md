# 支持 Claude Opus 5.5、Sonnet 5.5 与 Fable 5.1、GPT-6.1 Sol、DeepSeek Flash 和 Gemini 3.8 TTS

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `anthropic_official`, `gemini_official`, `gemini_generate_content`, `registry`, `skills`, `docs`

[English](2026-09-30-latest-models.md)

## 变更内容

- `anthropic-official` 支持 `claude-opus-5-5`、`claude-sonnet-5-5` 和 `claude-fable-5-1`，在各平台按 id 匹配，包括带 `anthropic.` 前缀的 Bedrock id：
  - `thinking_level="none"` 在 Opus 5.5 和 Fable 5.1 上发送 `low` 档位的自适应思考，因为这两个模型对 `disabled` 和 `between_tools` 都返回 400；在 Sonnet 5.5 上发送 `thinking: {"type": "between_tools"}`，它用这种方式关闭回答前的思考。`between_tools` 不接受 `display`，所以此时不发送 `thinking_summary`。
  - 三个模型对强制工具调用（`any`、`tool`）都返回 400，因此 `tool_choice="required"` 和工具名列表在它们上面抛出 `UnsupportedParameterError`。
  - Sonnet 5.5 和 Fable 5.1 不接受 `speed`，`fast_mode` 在它们上面抛出 `UnsupportedParameterError`；Opus 5.5 照常发送。
  - 其余档位一一对应：三个模型都支持 `low`、`medium`、`high`、`xhigh` 和 `max`。
- `openai-official` 支持 `gpt-6.1-sol`。与 `gpt-6-astra` 一样，模型不接受 `none`，`thinking_level="none"` 发送 `low`。
- `deepseek-flash`（DeepSeek-V4.1-Flash，支持图像输入）路由到 `deepseek-official`；DeepSeek 也用它服务 `deepseek-v4-flash` 和 `deepseek-v4-flash-vision-exp`。客户端对 `deepseek-v4-flash` 和 `deepseek-v4-pro` 仍然拒绝图像。
- `gemini-official` 和 `gemini-generate-content` 支持 `gemini-3.8-flash-tts` 和 `gemini-3.8-flash-lite-tts`。`tts_config` 配两个说话人时，文本按台词稿读取，每轮一行 `Name: 台词`；3.8 拒绝文本里的说话人标签，所以每轮作为单独的文本块或 part 发送，说话人放在 `speech_metadata` 里。`gemini-3.1-flash-tts-preview` 拒绝这种元数据，仍按原文本发送。流式音频仍是原始 PCM（`audio/l16`，24 kHz）。
- `@google/genai` 最低版本升到 2.24，这是 generateContent 的 part 开始携带 `speechMetadata` 的第一个版本。
- `list_supported_models` 列出新模型及官方价格：`claude-fable-5-1` 每百万 token 输入 10 美元、输出 50 美元，缓存读取 0.25 美元；`claude-opus-5-5` 4 / 20 美元，缓存读取 0.20 美元；`claude-sonnet-5-5` 2 / 10 美元，缓存读取 0.20 美元；`gpt-6.1-sol` 输入 2 美元、缓存写入 2.50 美元、输出 10 美元、缓存输入 0.10 美元；`deepseek-flash` 闲时 1 / 4 元，缓存命中 0.02 元（取代此前按公告登记的 `deepseek-v4.1-flash`）；另有 `gemini-3.8-flash-tts`、`gemini-3.8-flash-lite-tts`、`gemini-3.1-flash-lite-image`，以及 OpenRouter 上的 `anthropic/claude-opus-5.5`、`anthropic/claude-sonnet-5.5`、`anthropic/claude-fable-5.1`、`openai/gpt-6.1-sol` 和 `deepseek/deepseek-v4.1-flash`。
- 端到端测试改用 `claude-sonnet-5-5`、`gpt-6.1-sol`、`deepseek-flash` 和 `gemini-3.8-flash-tts`，取代 `claude-sonnet-5`、`gpt-5.6-luna`、V4 Flash 的各个 id 和 `gemini-3.1-flash-tts-preview`；Vertex AI 不提供 3.8 TTS，仍测 `gemini-3.1-flash-tts-preview`。
- `llmsdk_docs/claude5_1/` 与 `llmsdk_docs/claude5_5/` 收录新 Claude 模型的文档；`gpt6/`、`deepseek_v4/`、`gemini3_8/` 新增 GPT-6.1 Sol、DeepSeek 模型与价格、Gemini 3.8 TTS 的页面。README、站点和 skill 都列出了新模型。
