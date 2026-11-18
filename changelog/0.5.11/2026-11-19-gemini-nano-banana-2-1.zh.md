# Gemini Nano Banana 2.1

- **Date:** 2026-11-19
- **Type:** feature
- **Scope:** `google-official`, `google-genai`, `registry`
- **PR:** [#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349)

[English](2026-11-19-gemini-nano-banana-2-1.md)

## 变更内容

- `google-official` 与 `google-genai` 将 `"gemini-nano-banana"` 模型的 `ThinkingLevel` 映射至其支持的档位 `("minimal", "medium", "high")`：由于 `gemini-nano-banana-2.1` 拒绝 `low`、`xhigh` 与 `max`，`none` 发送 `"minimal"`，`low` 与 `medium` 发送 `"medium"`（等距向上取整），`high`、`xhigh` 与 `max` 发送 `"high"`。
- 注册表新增通过 `google-official` 调用 Gemini API 的 `gemini-nano-banana-2.1`（输入文本、图片与视频，输出图片，上下文 131,072 token，每百万 token 提示 $1.50、思考 $7.50、回复 $30.00）以及通过 `openai-image` 在 OpenRouter 上调用的 `google/gemini-nano-banana-2.1`（输入文本，输出图片，每百万 token 提示 $1.50、回复 $30.00）。注册表共 370 个条目。
- 共享测试目录在 `google-official` 上以 `gemini-nano-banana-2.1` 取代 `gemini-3.1-flash-image`，playground 的模型快捷列表也以 `gemini-nano-banana-2.1` 取代 `gemini-3.1-flash-image`。
- `llmsdk_docs/gemini_interactions/` 新增 Gemini Nano Banana 2.1 模型页面并更新图像生成指南，`llmsdk_docs/openrouter_media/` 新增 `google/gemini-nano-banana-2.1` 的 OpenRouter 端点记录。
