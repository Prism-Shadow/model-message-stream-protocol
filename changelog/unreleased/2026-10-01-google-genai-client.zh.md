# `google-genai` 是 Google generateContent 协议的兼容客户端，Vertex AI 也走它

- **Date:** 2026-10-01
- **Type:** feature
- **Scope:** `auto_client`, `google_genai`, `gemini_official`, `integration`, `skills`, `docs`
- **Breaking:** yes — Vertex AI 服务账号 key 需要 `client_type="google-genai"`；传入 `base_url` 时，`google-genai` 不再把 `GEMINI_API_KEY` 发过去

[English](2026-10-01-google-genai-client.md)

## 变更内容

- Google GenAI SDK 所用的 generateContent 协议的兼容客户端改名为 `google-genai`，与其他兼容客户端一样以线上协议命名。它服务 Vertex AI（服务账号 JSON key 作为 API key）、Gemini API，以及代理 generateContent 的网关。目录与类改为 `google_genai/GoogleGenaiClient`（原 `gemini_generate_content/GeminiGenerateContentClient`）。
- `gemini-official` 只讲 Gemini API 的 Interactions 端点，不再把服务账号 key 转给 generateContent。收到这种 key 时抛出 `ValueError`（TypeScript 中为 `Error`），并提示改用 `google-genai`，私钥不会被当作 API key 发出去。
- `google-genai` 遵守其他兼容客户端的凭证规则：只有端点也来自环境变量（`GEMINI_BASE_URL` 或 Google 自己的端点）时，才读取环境变量里的 `GEMINI_API_KEY`；传入 `base_url` 时必须同时传入 `api_key`。
- e2e 测试中所有 Vertex AI 模型都显式指定 `google-genai`。

## 兼容性

- Vertex AI 服务账号 key 需配合 `client_type="google-genai"`（`clientType: "google-genai"`）使用；`gemini-official`，以及不传 client type 的 `gemini-` 模型 id，现在收到这种 key 会报错。
- `gemini-generate-content` 仍可使用，作为 `google-genai` 的别名。
- 按模块路径导入该客户端的代码（`mmsp.gemini_generate_content`、`@prismshadow/mmsp/dist/gemini_generate_content`）改为导入 `google_genai` 和 `GoogleGenaiClient`。
