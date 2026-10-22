# 为 Google Vertex AI、Amazon Bedrock 与 TokenDance 登记模型

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `registry`, `tests`, `ci`, `docs`
- **PR:** [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261)

[English](2026-10-19-registry-vertex-bedrock-tokendance.md)

## 变更内容

- `list_supported_models()` / `listSupportedModels()` 新增三个提供方分组，Python 与 TypeScript 完全一致：
  - Google Vertex AI，`https://aiplatform.googleapis.com`，经 `google-genai`：`gemini-4-argon`、`gemini-3.8-flash`、`gemini-3.7-flash`、`gemini-3.1-flash-image`、`gemini-3.1-flash-tts-preview`、`gemini-embedding-2`。
  - Amazon Bedrock，`bedrock://us-east-1`，经 `anthropic-official`：全球推理配置文件 `global.anthropic.claude-fable-5-1`、`-opus-5-5`、`-sonnet-5-5`、`-haiku-5-5`、`-fable-5`、`-opus-5`、`-sonnet-5`、`-opus-4-8`、`-sonnet-4-6`。
  - TokenDance（词元跳动），`https://tokendance.space/gateway/v1`：`deepseek-v4.1-flash-1017`、`deepseek-v4.1-flash`（`deepseek-official`），`deepseek-v4-pro`（`openai-chat`），`minimax-m3`（`minimax-official`），`kimi-k3`、`kimi-k2.6`（`moonshot-official`），`glm-5.3`、`glm-5.3-flash`、`glm-5.2`（`zai-official`），`qwen3.8-flash`、`qwen3.8-max`、`mimo-v2.6-flash`、`step-5-preview`、`hy4-preview`（`openai-responses`），`qwen3.7-text-embedding`（`openai-embedding`）；`minimax-m3.1-flash` 经 `ant-messages` 走 `https://tokendance.space/gateway`，因为它的 Chat Completions 流以一个不含 `delta` 的分块结束。
- 依据 OpenRouter 的实时 models API 更新了 OpenRouter 条目，并新增 `deepseek/deepseek-v4.1-flash-1017` 与 `google/gemini-3.8-flash`。
- 依据 SiliconFlow 价格页更新了 SiliconFlow 条目，新增 `deepseek-ai/DeepSeek-V4.1-Flash`、`zai-org/GLM-5.3`、`zai-org/GLM-5.3-Flash` 与 `tencent/Hy4-preview`；`Pro/zai-org/GLM-5.1`、`Pro/moonshotai/Kimi-K2.6` 与 `Qwen/Qwen3.8-27B` 补上了价格。
- 注册表单元测试用 `ACCESS,SECRET` 形式的测试 key 构造 `bedrock://` 条目。
- `.github/ci/models.json` 在 `deepseek-official` 下新增一个慢速用例：TokenDance 上的 `deepseek-v4.1-flash`（`provider: tokendance`，`TOKENDANCE_API_KEY`）；`pytest.yml` 与 `jest.yml` 传入 `TOKENDANCE_API_KEY`。
- 模型页与 README 列出了 TokenDance、Vertex AI 与 Bedrock 的 base URL 和 key，并新增 Amazon Bedrock 上的 Claude 一节。

## 注册表元数据

| 提供方 | 来源（2026-10-19 读取） | 登记的价格 |
| --- | --- | --- |
| Google Vertex AI | https://cloud.google.com/vertex-ai/generative-ai/pricing | 全球端点标价（美元）：Gemini 4 Argon $4 / $20 / 缓存 $0.2，Gemini 3.8 与 3.7 Flash $1.5 / $7.5 / $0.15，Embedding 2 文本输入 $0.2。截至 2026-11-30 与 2026-12-31 的促销价不登记。图像与 TTS 条目不带价格。 |
| Amazon Bedrock | https://aws.amazon.com/bedrock/pricing/ 及各模型卡片 | 美国东部（弗吉尼亚北部）全球跨区域推理表（美元），与 Anthropic 标价相同；地域配置文件贵 10%。上下文窗口均为 1,000,000 token。 |
| TokenDance | https://tokendance.space/portal/api/models/all | 目录中该条目所用协议的 `items` 费率（人民币）；两个 DeepSeek V4.1 Flash 条目在工作日高峰时段（北京时间 09:00-12:00、14:00-18:00）价格翻倍。`minimax-m3` 不带价格，因为目录没有给出 Responses 协议的价格。 |
| OpenRouter | https://openrouter.ai/api/v1/models | API 报出的价格；若报价端点正在打折，则登记厂商自有端点的原价（`google/gemini-3.8-flash`、`z-ai/glm-5.1`），厂商无端点时登记报价端点的原价（`deepseek/deepseek-v4-flash`、`deepseek/deepseek-v4-pro`）。 |
| SiliconFlow | https://siliconflow.cn/pricing | 人民币标价；DeepSeek Flash 条目登记 02:00-08:00 时段的价格，其余时段价格翻倍。 |
