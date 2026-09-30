# 客户端按类型指名：每个厂商一个官方客户端，每种协议一个兼容客户端

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `auto_client`, `registry`, `integration`, `skills`, `docs`
- **Breaking:** yes — 客户端类型改了名，未知系列的模型 id 不再自行路由，厂商客户端的目录与类也改了名

[English](2026-09-30-client-types.md)

## 变更内容

- `AutoLLMClient` 从同一张表里创建 `client_type` 所指名的客户端。**官方客户端**讲厂商自己的 API，了解该厂商的模型，并从环境变量读取厂商的 key：`openai-official`、`anthropic-official`、`gemini-official`、`zai-official`、`moonshot-official`、`deepseek-official`、`minimax-official`。**兼容客户端**讲一种线上协议，对接任何提供该协议的端点：`openai-responses`、`openai-chat`（`openai` 是别名）、`openai-chat-vllm-adapter`、`openai-embedding`、`ant-messages`、`gemini-generate-content`。
- 不传 `client_type` 时，模型 id 开头的系列指名它的官方客户端：`gpt-` 与 `text-embedding-` 路由到 `openai-official`，`claude-` 到 `anthropic-official`，`gemini-` 到 `gemini-official`，`glm-` 到 `zai-official`，`kimi-` 到 `moonshot-official`，`deepseek-` 到 `deepseek-official`，`minimax-` 到 `minimax-official`，不区分大小写，因此 `deepseek-flash` 这类不带版本号的 id 与 `deepseek-v4-pro` 一样能路由。其他任何 id 都抛出 `ValueError`（TypeScript 中为 `Error`），要求传入 `client_type` 并列出全部可选值。未知的 `client_type` 同样抛错。环境变量 `CLIENT_TYPE` 仍然为没有指名客户端的构造调用指名一个。
- `openai-official` 让 `text-embedding-*` 模型走 Embeddings API，`gemini-official` 让 Vertex AI 服务账号 key 走 generateContent，因此一个客户端类型覆盖该厂商的所有模型，不论端点。`gemini-interactions` 这个固定项被移除：`gemini-official` 配其他任何 key 就是 Interactions API。
- 用类型指名的客户端，`list_models` 返回端点的完整列表；从模型 id 推断出的客户端，返回同一系列的 id。
- 厂商客户端的目录与类按其客户端类型命名：`openai_official/OpenAIOfficialClient`（原 `gpt6/GPT6Client`）、`anthropic_official/AnthropicOfficialClient`（`claude5/Claude5Client`）、`gemini_official/GeminiOfficialClient`（`gemini3_8/Gemini3_8Client`）、`gemini_generate_content/GeminiGenerateContentClient`（`gemini3_8_generate_content/Gemini3_8GenerateContentClient`）、`zai_official/ZAIOfficialClient`（`glm5_3/GLM5_3Client`）、`moonshot_official/MoonshotOfficialClient`（`kimi_k3/KimiK3Client`）、`deepseek_official/DeepSeekOfficialClient`（`deepseek_v4/DeepSeekV4Client`）、`minimax_official/MiniMaxOfficialClient`（`minimax_m3/MiniMaxM3Client`）。每个客户端仍然服务它原来服务的所有代际，在客户端内部按明确的版本号区分。
- `list_supported_models` 的 `client` 字段报告新的客户端类型。Playground 内置的 `text-embedding-3-large` 不再声明客户端类型，因为它的 id 自己就能路由。
- README、站点、`mmsp-python` 与 `mmsp-typescript` skill（模型表新增客户端类型一列）以及 `mmsp-dev` skill 都改为描述客户端类型；仓库的实现规则现在要求每个客户端类型一个目录，模型 id 上除系列表之外不再有任何路由规则。

## 兼容性

- 把旧的客户端类型换成新的：`gpt-6`、`gpt-5.6`、`gpt-5.5`、`gpt-5.4` → `openai-official`；`claude-5`、`claude-4-8`、`claude-4-7`、`claude-4-6` → `anthropic-official`；`gemini-3.8`、`gemini-3.7`、`gemini-3.6`、`gemini-3`、`gemini-embedding`、`gemini-interactions` → `gemini-official`；`glm-5.3`、`glm-5.2`、`glm-5.1` → `zai-official`；`kimi-k3`、`kimi-k2.6`、`kimi-k2.5` → `moonshot-official`；`deepseek-v4` → `deepseek-official`；`minimax-m3` → `minimax-official`。兼容客户端的类型不变。把模型 id 当作 `client_type` 传入不再可用。
- 不以任何已知系列开头的模型 id，比如网关的 `moonshotai/kimi-k3` 或 Amazon Bedrock 的 `global.anthropic.claude-fable-5`，现在需要传 `client_type`；此前其中一些靠 id 的子串路由。镜像了厂商 API 的网关传厂商的官方客户端，否则传网关所提供协议的兼容客户端。
- 按模块路径导入厂商客户端的代码（`mmsp.gpt6`、`@prismshadow/mmsp/dist/claude5`）改为导入新路径和新类名。两个包的公开导出不变。
