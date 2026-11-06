# Google 客户端支持 `google-genai` 3.0

- **Date:** 2026-11-06
- **Type:** fix
- **Scope:** `google_official`, `google_genai`, `ci`

[English](2026-11-06-google-genai-3.md)

## 变更内容

- `GoogleOfficialClient` 构建 SDK 客户端时把 `http_options.api_version` 设为 `v1beta`，在任何 SDK 版本上，它的 Interactions 请求、embedContent 调用和模型列表都发往 `/v1beta/`。`google-genai` 3.0.0 把 Gemini API 的默认版本改成了 `v1`，在 `v1` 上 `gemini-3.8-flash-tts` 返回 `404 Model 'gemini-3.8-flash-tts' not found`，`list_models` 读取的是 `/v1/models`。
- `GoogleGenaiClient` 在 Gemini API 和网关上设为 `v1beta`，在 Vertex AI 上设为 `v1beta1`，即 `google-genai` 2.x 的默认版本。3.0.0 在代码未指定版本时会读取 `GOOGLE_GENAI_API_VERSION`，这个变量不再改变两个客户端的版本。
- 两个客户端可在 `google-genai` 2.23.0 至 3.0.0 上使用，依赖仍为 `google-genai>=2.23.0`。
- Python CI 工作流在主测试之后，用 `google-genai<3` 和 `google-genai==2.23.0` 重新运行离线测试。

## 线上形状

| 客户端 | 路径 | SDK 2.23 / 2.34 / 3.0 |
| --- | --- | --- |
| `google-official` | `{base}/v1beta/interactions`、`{base}/v1beta/models` | 全部相同 |
| `google-genai`，API 密钥 | `{base}/v1beta/models/{model}:streamGenerateContent`、`{base}/v1beta/models` | 全部相同 |
| `google-genai`，服务账号密钥 | `https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/...` | 全部相同 |
