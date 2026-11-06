# google-official 上的 Gemini Omni 视频生成

- **Date:** 2026-11-06
- **Type:** feature
- **Scope:** `google_official`, `stream_items`, `registry`, `integration`, `site`
- **PR:** [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)

[English](2026-11-06-gemini-omni.md)

## 变更内容

- 两种语言的 `google-official` 流式返回 Gemini Omni 的视频（`gemini-omni-1.2-flash`；`gemini-omni-1.1-flash` 在 2026-12-03 被 Google 转到 1.2 之前同样适用）：带 `data` 的 Interactions `video` 增量成为一个 `inline_data` 内容项，MIME 类型为 `video/mp4`，除非增量给出了别的类型；带 `uri` 的增量成为一个装着该 URI 的 `text` 内容项。此前客户端丢弃视频增量，流以 `EmptyResponseError` 结束。
- 请求保留 Google 的默认设置（16:9、720p、10 秒，视频内联返回），流式、不存储，不带 `response_format`；与 TTS 模型一样，只发送最新一条消息中的文本和图片。
- `StreamItems` 遇到 MIME 类型为 `video/*` 的 `inline_data` 增量时开始一个新内容项，与图片相同。
- 注册表在 Gemini API 上列出 `gemini-omni-1.2-flash`（从 353 条增至 354 条）；`_usd()` / `usd()` 增加了可选的思考价格，其他各行的价格不变。`/models.json` 在某行的 `thoughts_tokens` 与 `response_tokens` 不同时写出 `thoughts_tokens`。
- 模型索引用 Lucide 的 `video` 图标显示视频输出，视频行的集成代码写出 `video.mp4`。两个服务端中的 playground 与 tracer 用 `<video controls>` 元素播放 `video/*` 的 `inline_data` 内容项，tracer 把它标为 `Inline Video`。
- `.github/ci/models.json` 在 `google-official` 下加入 `gemini-omni-1.2-flash`，标为 slow，新增 `support_video_generation` 能力标记，两套 e2e 测试各加入一个共享的视频测试。`llmsdk_docs/gemini_omni/` 收录了 Omni 指南、模型页、价格、Interactions API 参考、Files API 与 API 错误页。

## 配置行为

| 键 | `google-official` 上的 Gemini Omni |
| --- | --- |
| `max_tokens` | 不发送 |
| `thinking_level` | `none`、`low` → `low`；`medium`、`high`、`xhigh`、`max` → `high` |
| `thinking_summary` | `thinking_summaries`，与其他 Gemini 模型相同 |
| `system_prompt` | `system_instruction` |
| `tools`、`tool_choice`、`image_config`、`fast_mode` | 抛出 `UnsupportedParameterError` |
| `temperature` | 抛错，与所有 Gemini 模型相同 |

默认视频计 57,920 个视频输出 token；用量的映射与其他 Gemini 模型相同，视频 token 计入 `response_tokens`。

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 | 输出 | 上下文 | 每 1M token 价格 |
| --- | --- | --- | --- | --- | --- | --- |
| `gemini-omni-1.2-flash` | `https://generativelanguage.googleapis.com` | `google-official` | Text, Image | Video | 131,072 | prompt $1.50，thoughts $9.00，response（视频）$12.00 |
