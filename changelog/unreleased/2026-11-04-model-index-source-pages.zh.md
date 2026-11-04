# 模型索引为每个模型链接到它在服务商处的页面

- **Date:** 2026-11-04
- **Type:** feature
- **Scope:** `site`

[English](2026-11-04-model-index-source-pages.md)

## 变更内容

- 模型索引的每一行在代码按钮前新增一个链接，图标是 Lucide 的 `external-link`，大小与代码按钮相同，点击后在新标签页打开该模型在服务商处的页面（`target="_blank"`、`rel="noopener noreferrer"`），提示文字为 “Open {model} on {provider}” 与 “在 {provider} 打开 {model}”。353 行中有 345 行带有链接，`http://127.0.0.1:8000/v1` 上的 8 个 vLLM 条目没有。集成代码对话框里，模型 id 下方的服务商名称链接到同一个页面，后面带同样的图标。
- 链接由页面脚本在加载时添加，依据是每行的服务商 id 和模型 id，由新文件 `site/src/shared/pages.ts` 中的 `modelPage(provider, model)` 给出；构建时不往行里写链接。`data-kit-providers` 中的服务商表为每个服务商增加了 `id`，行图标增加了 `external-link` 符号（`#catalog-page`），两种语言都增加了字符串 `kit.page`。最后一列在桌面上从 2.5 rem 加宽到 4.5 rem，在较窄的屏幕上从 2.25 rem 加宽到 4.25 rem。
- 体积（原始字节，括号内为 `gzip -9` 后）：`/models/` 从 1,205,397（56,517）变为 1,206,126（56,730），`/zh/models/` 从 1,218,141（57,425）变为 1,218,873（57,645）；目录脚本从 16,543（6,814）变为 18,990（7,771），模型索引的样式表从 6,759（1,742）变为 7,032（1,788），全站样式表从 42,636（8,455）变为 42,674（8,460）。

## 页面

| 服务商 | 行数 | 页面 |
| --- | --- | --- |
| OpenRouter | 124 | `https://openrouter.ai/{model}` |
| TokenDance | 63 | `https://tokendance.space/models/{model}` |
| OpenCode Go | 28 | `https://opencode.ai/docs/go/` |
| Gemini API | 15 | `https://ai.google.dev/gemini-api/docs/models/{model}` |
| OpenAI | 15 | `https://developers.openai.com/api/docs/models/{model}` |
| SiliconFlow | 14 | `https://www.siliconflow.cn/models?q={model}`，即在模型列表中搜索该模型 |
| Fireworks AI | 13 | `accounts/fireworks/models/{name}` 对应 `https://fireworks.ai/models/fireworks/{name}`；`deepseek-v4p1-flash`、`deepseek-v4-flash-0731` 和 `deepseek-v4-pro-0813` 在 `deepseek-ai/` 下 |
| Anthropic | 10 | `https://platform.claude.com/docs/en/models/overview` |
| Amazon Bedrock | 9 | `https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-{id}.html`，id 去掉推理配置文件的 `global.`，点号换成连字符 |
| Penguin Go | 9 | `https://go.penguin.ooo` |
| DashScope | 7 | `https://help.aliyun.com/zh/model-studio/models` |
| DeepSeek | 6 | `https://api-docs.deepseek.com/quick_start/pricing/`；`deepseek-search` 和 `deepseek-fetch` 打开 `https://api-docs.deepseek.com/guides/search/` |
| Qwen Token Plan | 6 | `https://help.aliyun.com/zh/model-studio/token-plan-overview` |
| Vertex AI | 6 | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/{id}`，id 去掉 `gemini-`，点号换成连字符（`gemini/3-8-flash`）；`gemini-3.1-flash-tts-preview` 打开 `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models` |
| Moonshot | 5 | `https://platform.moonshot.cn/docs/pricing/chat` |
| Z.ai | 5 | `https://docs.z.ai/guides/llm/{model}` |
| Atlas Cloud | 3 | `https://www.atlascloud.ai/models/{model}` |
| ModelScope | 3 | `https://modelscope.cn/models/{model}` |
| Jina AI | 2 | `https://jina.ai/reader/` |
| MiniMax | 2 | `https://platform.minimax.io/docs/guides/models-intro` |
| vLLM | 8 | 无 |
