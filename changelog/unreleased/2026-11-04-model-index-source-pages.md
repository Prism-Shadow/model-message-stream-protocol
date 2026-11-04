# The Model Index links each model to its page at the provider

- **Date:** 2026-11-04
- **Type:** feature
- **Scope:** `site`

[中文版](2026-11-04-model-index-source-pages.zh.md)

## What changed

- Each Model Index row gained a link before its code button, Lucide's `external-link` icon at the code button's size, that opened the model's page at its provider in a new tab (`target="_blank"`, `rel="noopener noreferrer"`), titled "Open {model} on {provider}" and "在 {provider} 打开 {model}". 345 of the 353 rows got one; the 8 vLLM rows at `http://127.0.0.1:8000/v1` did not. In the kit dialog, the provider's name under the model id linked to the same page, with the same icon.
- The page's script added the links at load, from each row's provider id and model id, with `modelPage(provider, model)` in the new `site/src/shared/pages.ts`; the build wrote no link into a row. The provider table in `data-kit-providers` gained each provider's `id`, the row icons an `external-link` symbol (`#catalog-page`), and the strings `kit.page` in both languages. The last column widened from 2.5 rem to 4.5 rem on a desktop and from 2.25 rem to 4.25 rem on narrower screens.
- Sizes, raw and with `gzip -9`: `/models/` went from 1,205,397 bytes (56,517) to 1,206,126 (56,730) and `/zh/models/` from 1,218,141 (57,425) to 1,218,873 (57,645); the catalog script from 16,543 (6,814) to 18,990 (7,771), the Model Index stylesheet from 6,759 (1,742) to 7,032 (1,788), and the site stylesheet from 42,636 (8,455) to 42,674 (8,460).

## Pages

| Provider | Rows | Page |
| --- | --- | --- |
| OpenRouter | 124 | `https://openrouter.ai/{model}` |
| TokenDance | 63 | `https://tokendance.space/models/{model}` |
| OpenCode Go | 28 | `https://opencode.ai/docs/go/` |
| Gemini API | 15 | `https://ai.google.dev/gemini-api/docs/models/{model}` |
| OpenAI | 15 | `https://developers.openai.com/api/docs/models/{model}` |
| SiliconFlow | 14 | `https://www.siliconflow.cn/models?q={model}`, the model list searched for the model |
| Fireworks AI | 13 | `https://fireworks.ai/models/fireworks/{name}` for `accounts/fireworks/models/{name}`; `deepseek-v4p1-flash`, `deepseek-v4-flash-0731` and `deepseek-v4-pro-0813` under `deepseek-ai/` |
| Anthropic | 10 | `https://platform.claude.com/docs/en/models/overview` |
| Amazon Bedrock | 9 | `https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-{id}.html`, the id without the inference profile's `global.` and with dots as dashes |
| Penguin Go | 9 | `https://go.penguin.ooo` |
| DashScope | 7 | `https://help.aliyun.com/zh/model-studio/models` |
| DeepSeek | 6 | `https://api-docs.deepseek.com/quick_start/pricing/`; `deepseek-search` and `deepseek-fetch` open `https://api-docs.deepseek.com/guides/search/` |
| Qwen Token Plan | 6 | `https://help.aliyun.com/zh/model-studio/token-plan-overview` |
| Vertex AI | 6 | `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/{id}`, the id without `gemini-` and with dots as dashes (`gemini/3-8-flash`); `gemini-3.1-flash-tts-preview` opens `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/google-models` |
| Moonshot | 5 | `https://platform.moonshot.cn/docs/pricing/chat` |
| Z.ai | 5 | `https://docs.z.ai/guides/llm/{model}` |
| Atlas Cloud | 3 | `https://www.atlascloud.ai/models/{model}` |
| ModelScope | 3 | `https://modelscope.cn/models/{model}` |
| Jina AI | 2 | `https://jina.ai/reader/` |
| MiniMax | 2 | `https://platform.minimax.io/docs/guides/models-intro` |
| vLLM | 8 | none |
