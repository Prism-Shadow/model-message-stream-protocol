# 0.5.1

[English](README.md)

- [2026-10-01] 注册表、README 与 e2e 测试中的 Qwen3.6 35B A3B 换成 Qwen3.8 27B（OpenRouter 上为 `qwen/qwen3.8-27b`，SiliconFlow 上为 `Qwen/Qwen3.8-27B`）。([详情](2026-10-01-qwen3-8.zh.md))
- [2026-10-01] Google generateContent 协议的兼容客户端改名为 `google-genai`（别名 `gemini-generate-content`），Vertex AI 需显式指定它：`gemini-official` 只讲 Interactions，并拒绝服务账号 key。([详情](2026-10-01-google-genai-client.zh.md), [#244](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/244))
- [2026-10-01] 标志在亮色背景上不再有灰边，标志素材（SVG 与 PNG，亮色与暗色）存放在 `.github/images/`。([详情](2026-10-01-logo-light.zh.md), [#240](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/240), [#242](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/242))
- [2026-10-01] 站点、标志与图片的主题色改为 fennel flower 色相上的纯蓝 `#477dfb`，暗色文字使用 `#7aa2f7`；语言与主题按钮改为点击切换，首页在桌面端一屏展示。([详情](2026-10-01-fennel-theme.zh.md), [#238](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/238))
- [2026-09-30] 发布 workflow 遇到 PyPI 或 npm 上已有的版本时跳过，不再失败。([详情](2026-09-30-publish-skip-existing.zh.md), [#237](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/237))
- [2026-09-30] 只改站点时只运行站点构建，不再运行模型测试。([详情](2026-09-30-ci-site-paths.zh.md), [#236](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/236))
- [2026-09-30] 文档新增“设计哲学”一页，所有示例默认显示 TypeScript；Tracer 与 Playground 也可用 TypeScript 在 shell 中启动，首页示例加上了 import，顶栏在 star 数加载时不再移动。([详情](2026-09-30-site-docs.zh.md), [#234](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/234))
