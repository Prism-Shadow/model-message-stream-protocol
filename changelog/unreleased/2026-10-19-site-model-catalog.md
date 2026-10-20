# Model catalog and status pages on the site

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `site`, `.github`
- **PR:** [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263)

[中文版](2026-10-19-site-model-catalog.zh.md)

## What changed

- `/models/` and `/zh/models/` listed every entry of the SDK registry (`src_ts/src/registry.ts`, read at build time): the vendor and provider marks, the modalities, the context window, and the input, output and cached list prices per million tokens in USD or CNY, with search and sortable columns.
- Every catalog row expanded to its integration kit: the TypeScript and Python `AutoLLMClient` calls and the row of an MMSP server's models table, with the key variable it reads. An official model at its vendor's own endpoint got the short form, `AutoLLMClient(model=...)`.
- `/status/` and `/zh/status/` showed the daily status probe's data from the `status-data` branch: one line with the worst status of the probed channels and the month's probe cost, then one block per channel with TTFT, TPS, the month's cost, 90 days of bars and the share of days up. A channel without a configured key showed as grey `No key`, not as an outage.
- The catalog's status column linked each probed row to its block on `/status/`; an unprobed row said `Not probed`.
- `/models.json` served the catalog for agents: each entry's endpoint, client, key variable, list price, kit and status key.
- The top bar gained `Models` and `Status` after the documentation entries and showed its entries inline from 1024 px. The home page's "and 1000+ models" opened the catalog. `sitemap.xml` and `llms.txt` listed both pages.
- `pages.yml` rebuilt the site when `src_ts/src/registry.ts` or `src_ts/src/credentials.ts` changed.

## Providers

| Provider | Base URL | Key variable |
| --- | --- | --- |
| OpenAI, Anthropic, Gemini API, Z.ai, Moonshot, DeepSeek, MiniMax | The vendor's own | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ZAI_API_KEY`, `MOONSHOT_API_KEY`, `DEEPSEEK_API_KEY`, `MINIMAX_API_KEY` |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| TokenDance | `https://tokendance.space/gateway/v1`, `https://tokendance.space/gateway` | `TOKENDANCE_API_KEY` |
| Vertex AI | `https://aiplatform.googleapis.com` | `VERTEX_API_KEY`, the service-account JSON |
| Amazon Bedrock | `bedrock://<region>` | `BEDROCK_API_KEY`, `ACCESS,SECRET` |
