# MMSP-RFC-0013 把输出按模态计价

- **Date:** 2026-11-28
- **Type:** process
- **Scope:** `design`
- **PR:** [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)

[English](2026-11-28-modality-prices-rfc.md)

## 变更内容

- 新增 `change` 类 RFC [MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.zh.md) 输出按模态计价（中英文），并列入 `design/README.md` 的索引。注册表每一行的 `ModelPricing` 含四个必填单价（`cached_tokens`、`prompt_tokens`、`thoughts_tokens`、`response_tokens`）；平台未列出时，缓存命中取输入单价，思考取输出单价；embedding 按输入计价，免费端点记 `0`。一个公式把各计数乘以其单价后相加。上游按模态拆分输出的响应，把思考与文本计入 `thoughts_tokens`，图像、视频或音频 token 单独计入 `response_tokens`。每一项计费数量都计入用量：按张计费时每张图像记 1,000 个 `response_tokens`，`openai-speech` 上的 Gemini TTS 记 ⌈秒数 × 25⌉ 个音频 token。模型索引与 `/models.json` 列出四档价格。
- [MMSP-RFC-0012](../../design/rfcs/MMSP-RFC-0012-thinking-priced-as-output.zh.md) 思考按输出计价在两份文件与索引中标为被 MMSP-RFC-0013 取代。
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.zh.md) 消息请求在原文上修改（中英文），并在引言中写入这一案例。§3.2 规定 `openai-image` 把消息中的图像项作为参考图随提示词发送（OpenAI 协议上经 `POST /images/edits`，经 `openrouter` 插件以 `input_references` 发送），经 `tokendance` 与 `openrouter` 插件按每张图像记 1,000 个 `response_tokens`，并把图像 token 与其余输出分开；规定 `openai-speech` 的 `gemini` 插件计入 Gemini TTS 的音频 token，embedding 按输入计价。§5 写明四个用量计数，并要求计入每一项计费数量。
