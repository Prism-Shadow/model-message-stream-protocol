# Unreleased

[English](README.md)

- [2026-09-30] Playground 与 Tracer 界面重新设计：设置移入侧边栏，两个页面共用亮色与暗色主题，思考为可折叠轨迹，工具调用为卡片，页脚显示结束原因与 token 数，模型菜单可筛选，trace 中的消息为可折叠卡片并配有轮次导航。([详情](2026-09-30-playground-redesign.zh.md), [#231](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/231))
- [2026-09-30] Playground 随模型设定客户端类型和 base URL，新增 Client Type 下拉框；自动填入的 base URL 不随请求发送。([详情](2026-09-30-playground-client-type.zh.md), [#229](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/229))
- [2026-09-30] 支持 Claude Opus 5.5、Sonnet 5.5 与 Fable 5.1、GPT-6.1 Sol、DeepSeek Flash 和 Gemini 3.8 TTS；双说话人台词稿以逐轮的语音元数据发给 3.8 TTS。([详情](2026-09-30-latest-models.zh.md), [#229](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/229))
- [2026-09-30] 客户端按类型指名：每个厂商一个官方客户端（`openai-official`、`anthropic-official`、`gemini-official`、`zai-official`、`moonshot-official`、`deepseek-official`、`minimax-official`），每种协议一个兼容客户端；不传 `client_type` 时由模型 id 开头的系列指名官方客户端，其他 id 要求传入。([详情](2026-09-30-client-types.zh.md))
- [2026-09-29] 站点跟随系统语言（中文或英文）与主题（亮色或暗色），新增一行安装 skill 的“交给你的编码助手”一节与“Agent 循环”一页，文档目录跟随阅读位置、可复制 Markdown，新增 sitemap 与 star 数，首页把同一份输入依次交给三个模型回放，stop 事件以胶囊标签和柱状图展示，标志改为四块色块上的四字母。([详情](2026-09-29-site-languages-and-themes.zh.md))
- [2026-09-29] 新增站点 mmsp.penguin.ooo，包含首页与文档；README 的 header、概念图与 social preview 以 MMSP 之名重绘。([详情](2026-09-29-site-and-artwork.zh.md), [#226](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/226))
- [2026-09-29] AgentHub 更名为 MMSP，即 Model Message Stream Protocol：软件包为 `mmsp` 与 `@prismshadow/mmsp`，模块为 `mmsp`，错误基类为 `MMSPError`，环境变量为 `MMSP_DEBUG` 与 `MMSP_CACHE_DIR`。([详情](2026-09-29-rename-to-mmsp.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-17] Vertex AI 服务账号密钥把 Gemini 路由到新增的 generateContent 客户端 `Gemini3_8GenerateContentClient`，`gemini-generate-content` / `gemini-interactions` 可显式指定线上协议。([详情](2026-09-17-gemini-vertex-generate-content.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] Gemini 文本、图像与 TTS 模型改用 Interactions API，SDK 升级到 google-genai / @google/genai 2.x；调用工具的轮次以 tool_call 结束，fast_mode 改为请求 priority 服务层级。([详情](2026-09-16-gemini-interactions-api.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] 流式协议 v2：一次流由若干 `delta` 事件和最后唯一的 `stop` 事件组成，每个内容项以 `.delta` 片段流出、再由其 `.done` 项收尾。([详情](2026-09-16-streaming-protocol-v2.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-16] 0.5.0 之前记录的内容项在 0.6.0 之前仍被接受，并转换为 `.done` 类型。([详情](2026-09-16-backward-compatibility.zh.md), [#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223))
- [2026-09-18] 客户端只把 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 发往环境变量指定的端点，指定了 `base_url` 却没有 `api_key` 时抛出异常；DeepSeek、GLM 与 Kimi 客户端只读各自的密钥，Anthropic 客户端不再发送 `ANTHROPIC_AUTH_TOKEN`。([详情](2026-09-18-env-credential-fallbacks.zh.md), [#224](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/224))
- [2026-09-15] Responses 客户端把每个轮次都按带 type 的 message item 发出。([详情](2026-09-15-responses-assistant-message-item.zh.md))
- [2026-09-14] MiniMax M3 的工具调用改为从已完成的输出 item 读取，不再取自参数增量。([详情](2026-09-14-minimax-tool-call-from-completed-item.zh.md), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221))
