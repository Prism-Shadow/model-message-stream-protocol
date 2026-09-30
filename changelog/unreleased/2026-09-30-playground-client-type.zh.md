# Playground 随模型选定客户端类型和 base URL

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `integration`

[English](2026-09-30-playground-client-type.md)

## 变更内容

- 两个 Playground 在 Model 旁新增 Client Type 下拉框：先是 Auto（由模型 id 指定客户端），然后是官方客户端和兼容客户端，每项注明厂商或协议。
- 选择模型后，客户端类型设为模型 id 指定的那个，Base URL 填入该客户端访问的端点：环境变量里的（如 `OPENAI_BASE_URL`），或厂商官方的。切换客户端类型时，未改动过的 base URL 会随之换成新类型的端点；手动改过的 base URL 保留不变，每个模型各自记住自己的改动。
- 自动填入的 base URL 不随请求发送，因此环境变量里的 key 照常可用；只有手动改过的 base URL 才会发送。
- List models 加入的模型沿用当前的客户端类型和 base URL。
- 内置模型改为 GPT-6.1 Sol、Text Embedding 3 Large、Gemini 3.8 Flash、Gemini 3.1 Flash Image、Gemini 3.8 Flash TTS、Gemini Embedding 2、Claude Sonnet 5.5、Claude Opus 5.5、Claude Fable 5.1、GLM 5.3 Flash、Kimi K3、MiniMax M3 和 DeepSeek Flash。
- `mmsp.auto_client` 与 `autoClient` 导出 `MODEL_FAMILIES`，Playground 从这张表读取模型系列。
