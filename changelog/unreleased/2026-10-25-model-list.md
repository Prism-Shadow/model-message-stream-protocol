# A fuller model list in the registry, the Model Index and the playground

- **Date:** 2026-10-25
- **Type:** feature
- **Scope:** `registry`, `site`, `playground`, `docs`, `skills`
- **PR:** [#302](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/302)

[中文版](2026-10-25-model-list.zh.md)

## What changed

- `list_supported_models()` / `listSupportedModels()` grew from 125 to 345 entries, identical in Python and TypeScript. Every entry of the penguin-harness catalog got a row except the retired ones, the `custom` placeholder, and five OpenCode Go entries that OpenCode no longer lists: `cat-jam-free`, `gemini-4-argon-contributor`, `longcat-2.5-preview-free`, `space-bunny` and `step-5-preview-free`. By section:
  - **Official vendor endpoints**, 12 rows added (55 in all): `gpt-5.6` (the bare alias of `gpt-5.6-sol`), `gpt-5.5-pro`, `gpt-5.4`, `gpt-5.4-pro`, `gpt-5.4-mini`, `gpt-5.4-nano`, `claude-opus-4-7`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `glm-5` and `kimi-k2.5`, priced from each vendor's pricing page read 2026-10-24. `kimi-k2.5` took the harness catalog's price and window, because Moonshot's page no longer lists it.
  - **OpenRouter**, 87 rows added (123 in all), from the live models API and each model's `/endpoints` list, read 2026-10-24: Qwen 10, OpenAI 7, Google 7 (Gemini and Gemma), Mistral 6, Z.ai 5, NVIDIA 5, Xiaomi 4, xAI 4, Meta 4 plus Llama 2, DeepSeek 4, ByteDance Seed 4, Perplexity 3, MiniMax 3, StepFun 2, Moonshot AI 2, inclusionAI 2, Inception 2, Cohere 2, Anthropic 2, Amazon 2, and one each from Thinking Machines, Tencent, Recursive, Meituan and the `openrouter/free` router. `minimax/minimax-m3.1-flash:free`, whose slug had no endpoint left, gave way to the paid `minimax/minimax-m3.1-flash`.
  - **SiliconFlow**, 1 row added (14 in all): `Qwen/Qwen3.6-35B-A3B`, from https://siliconflow.cn/pricing.
  - **TokenDance**, 44 rows added (61 in all), from the public catalog https://tokendance.space/portal/api/models/all: 43 chat models and the embedding model `qwen-text-embedding-v4` (`openai-embedding`). The `kimi-*` rows took `moonshot-official`, the text-only `glm-*` rows `zai-official`, the `deepseek-*` rows `openai-chat`, `minimax-m2.7` and `minimax-m2.5` `ant-messages` at `https://tokendance.space/gateway`, and the rest `openai-responses` where the catalog lists that protocol, otherwise `openai-chat`.
  - **OpenCode Go**, a new section of 28 rows: the ids and protocols of https://opencode.ai/v2/docs/console/go/ and the harness catalog, the docs' per-token rates, and models.dev's context windows and input modalities.
  - **Fireworks AI** (13 rows), **DashScope** (7), **Qwen Token Plan** (6), **Atlas Cloud** (3), **Penguin Go** (9), **ModelScope** (3) and **vLLM** (8), new sections: ids, clients and base URLs from the harness catalog, with prices, windows and modalities from each provider's public pages where they published them, otherwise the harness catalog's values.
- OpenRouter's 36 earlier rows were re-read on 2026-10-24, and five changed price (see below).
- The registry's section headers took one format, `--- <platform> (<rows>; <key>; <sources>, read <date>)`, in both languages. The `list_supported_models` / `listSupportedModels` docstrings named the platforms covered, and the `SupportedModel` docstring stated which price each kind of platform stores. `/models.json` described its prices the same way.
- The Model Index fetched its integration kits on demand. `/models/kits.json` and `/zh/models/kits.json` (`catalogKits`) carried each row's programs, run lines and agent prompt, which the page had inlined. The page fetched them on the first hover or focus of a code button, or on opening the dialog, prefetched them once it had loaded, and showed a loading line in the code panes until they arrived. The arrow and code icons in every row became references to one sprite symbol each. `/models/` held its 345 rows in 1,151,073 bytes (55,140 gzipped), against 1,135,393 bytes (47,147 gzipped) for 125 rows with the kits inline.
- Both playgrounds served `GET /api/registry`, `{"models": [{"model", "client", "base_url"}, ...]}` for every registry entry. The model menu fetched it on its first open and added the entries it lacked before Custom model, each described as `client · host`, so picking one set the client type and the base URL; a failed fetch was tried again at the next open. The 13 static options stayed, and the menu's filter also matched the description.
- The site's `PROVIDERS` gained OpenCode Go (both its documented `/inference/go` bases and the `/zen/go` ones), Fireworks AI, DashScope, Qwen Token Plan, Atlas Cloud, Penguin Go, ModelScope and vLLM, each with the key variable listed under Registry metadata. `VENDORS` gained Mistral, Meta, Cohere, Amazon, Perplexity, ByteDance Seed, Inception, inclusionAI, iFlytek Spark and Dots. The marks `opencode`, `fireworks`, `atlascloud`, `modelscope`, `vllm`, `mistral`, `meta`, `cohere`, `aws`, `perplexity`, `bytedance`, `inception`, `ling` and `spark` came from lobe-icons; Penguin Go and Dots got no mark.
- The models page's gateway table, the README's Supported Models table and both `skills/*/reference/models.md` listed the new gateways with their base URLs, key variables and the client per model. The skills' stale `minimax/minimax-m3.1-flash:free` became `minimax/minimax-m3.1-flash`.

## Registry metadata

New base URLs, and the variable the site, the docs and the section headers name for each key. The SDK reads none of them: a program passes the key as `api_key`, as the Model Index's code does.

| Python / TypeScript constant | Base URL | Key variable |
| --- | --- | --- |
| `_OPENCODE_GO` / `OPENCODE_GO` | `https://opencode.ai/inference/go/openai/v1` | `OPENCODE_API_KEY` |
| `_OPENCODE_GO_ANTHROPIC` / `OPENCODE_GO_ANTHROPIC` | `https://opencode.ai/inference/go/anthropic` | `OPENCODE_API_KEY` |
| `_OPENCODE_GO_GOOGLE` / `OPENCODE_GO_GOOGLE` | `https://opencode.ai/inference/go/google` | `OPENCODE_API_KEY` |
| `_FIREWORKS` / `FIREWORKS` | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` |
| `_DASHSCOPE` / `DASHSCOPE` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| `_QWEN_TOKEN_PLAN` / `QWEN_TOKEN_PLAN` | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `QWEN_TOKEN_PLAN_API_KEY` |
| `_ATLASCLOUD` / `ATLASCLOUD` | `https://api.atlascloud.ai/v1` | `ATLASCLOUD_API_KEY` |
| `_PENGUIN_GO` / `PENGUIN_GO` | `https://go.penguin.ooo/api/v1` | `PENGUIN_GO_API_KEY` |
| `_MODELSCOPE` / `MODELSCOPE` | `https://api-inference.modelscope.cn/v1` | `MODELSCOPE_API_KEY`, the account's access token |
| `_VLLM_LOCAL` / `VLLM_LOCAL` | `http://127.0.0.1:8000/v1` | `VLLM_API_KEY`, only when the server is started with one |

Price conventions of the new rows:

- **Gateway rates.** A gateway's row stores what the gateway bills. TokenDance's is the catalog's `items` rate, which sits below the `reference` price the catalog shows beside some models.
- **Subscription rates.** An OpenCode Go row stores the per-token rate a request draws from the Go ($10) or Go Plus ($40) monthly allowance. Qwen Token Plan bills in Credits and publishes no per-token rate, so its rows store each model's DashScope pay-as-you-go list price.
- **Tiered prices** store the first tier, and each row's comment names the rest: on OpenCode Go, GPT 6 Luna and GPT 5.6 Luna up to 272K input tokens, Claude Haiku 5.5 up to 100K, Grok 4.7 up to 200K and Qwen 3.7 Plus up to 256K; on OpenAI, `gpt-5.4`, `gpt-5.4-pro` and `gpt-5.5-pro` under 272K; on Google, `gemini-3.1-pro-preview` up to 200K; on TokenDance, the catalog's lowest prompt-length tier.
- **Off-peak DeepSeek.** The time-priced DeepSeek rows of OpenCode Go, Penguin Go and TokenDance store the off-peak rate, as the official rows do. The weekday peak hours, 09:00-12:00 and 14:00-18:00 Beijing time (01:00-04:00 and 06:00-10:00 UTC), cost double on OpenCode Go and Penguin Go; TokenDance's peak rates are in each row's comment.
- **Unverified sections.** The OpenCode Go, Fireworks AI, DashScope, Qwen Token Plan, Atlas Cloud, Penguin Go, ModelScope and vLLM rows came from published docs, pricing pages and the harness catalog, and no request was sent to them; each section header says so. Six Fireworks AI rows serve on demand only and carry the harness catalog's price. ModelScope publishes no per-token price, so its rows carry none, and the vLLM rows, for a local server, are priced at zero.
- **Promotions** are not recorded. Gemini 4 Argon on OpenCode Go stores its list price, not the docs' 50% discount through 2026-11-30.

OpenRouter rows whose price changed on re-reading, USD per 1M tokens (prompt / output / cached):

| Model | Before | After |
| --- | --- | --- |
| `deepseek/deepseek-v4.1-flash` | 0.028 / 0.08 / 0.0016 | 0.02 / 1.0 / 0.015 |
| `openai/gpt-5.6-sol` | 4.0 / 20.0 / 0.4 | 5.0 / 30.0 / 0.5, OpenAI's list price; the API quotes its promotion |
| `qwen/qwen3.8-27b` | 0.24 / 2.2 / 0.05 | 0.2 / 2.5 / 0.09 |
| `xiaomi/mimo-v2.5` | 0.14 / 0.28 / 0.0028 | 0.14 / 0.28 / 0.003 |
| `z-ai/glm-5.2` | 0.62 / 2.42 / 0.14 | 0.0341 / 7.0 / 0.033, the quoted Wafer endpoint |
