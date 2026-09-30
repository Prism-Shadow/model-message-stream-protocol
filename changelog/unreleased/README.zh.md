# Unreleased

[English](README.md)

- [2026-09-29] 站点跟随系统语言（中文或英文）与主题（亮色或暗色），新增一行安装 skill 的“交给你的编码助手”一节与“Agent 循环”一页，文档目录跟随阅读位置、可复制 Markdown，新增 sitemap 与 star 数，首页的流循环播放，标志改为四宫格四字母。([详情](2026-09-29-site-languages-and-themes.zh.md))
- [2026-09-29] 新增站点 mmsp.penguin.ooo，包含首页与文档；README 的 header、概念图与 social preview 以 MMSP 之名重绘。([详情](2026-09-29-site-and-artwork.zh.md), [#226](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/226))
- [2026-09-29] AgentHub 更名为 MMSP，即 Model Message Stream Protocol：软件包为 `mmsp` 与 `@prismshadow/mmsp`，模块为 `mmsp`，错误基类为 `MMSPError`，环境变量为 `MMSP_DEBUG` 与 `MMSP_CACHE_DIR`。([详情](2026-09-29-rename-to-mmsp.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-17] Vertex AI 服务账号密钥把 Gemini 路由到新增的 generateContent 客户端 `Gemini3_8GenerateContentClient`，`gemini-generate-content` / `gemini-interactions` 可显式指定线上协议。([详情](2026-09-17-gemini-vertex-generate-content.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] Gemini 文本、图像与 TTS 模型改用 Interactions API，SDK 升级到 google-genai / @google/genai 2.x；调用工具的轮次以 tool_call 结束，fast_mode 改为请求 priority 服务层级。([详情](2026-09-16-gemini-interactions-api.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] 流式协议 v2：一次流由若干 `delta` 事件和最后唯一的 `stop` 事件组成，每个内容项以 `.delta` 片段流出、再由其 `.done` 项收尾。([详情](2026-09-16-streaming-protocol-v2.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] 0.5.0 之前记录的内容项在 0.6.0 之前仍被接受，并转换为 `.done` 类型。([详情](2026-09-16-backward-compatibility.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-15] Responses 客户端把每个轮次都按带 type 的 message item 发出。([详情](2026-09-15-responses-assistant-message-item.zh.md))
- [2026-09-14] MiniMax M3 的工具调用改为从已完成的输出 item 读取，不再取自参数增量。([详情](2026-09-14-minimax-tool-call-from-completed-item.zh.md), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221))
