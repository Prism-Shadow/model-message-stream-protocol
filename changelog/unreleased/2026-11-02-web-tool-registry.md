# The web tool models in the registry and the Model Index

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `registry`, `site`, `skills`
- **PR:** [#312](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/312)

[中文版](2026-11-02-web-tool-registry.zh.md)

## What changed

- `list_supported_models()` / `listSupportedModels()` grew from 345 to 351 entries, identical in Python and TypeScript: `deepseek-search` and `deepseek-fetch` on DeepSeek's own endpoint (Official vendor endpoints, 57 rows) and on TokenDance (63 rows), and `jina-search` and `jina-fetch` in a new Jina section. The playground's model menu listed them through `GET /api/registry`.
- `Modality` gained `"Web"`, the pages a web tool answers with in its `webtool.done`. The six rows take `["Text"]`, answer `["Web"]` and carry no context window.
- The Model Index drew the Web output as Lucide's globe, labelled "Web" / "网页". A web row's kit printed each page's title and URL through the stateless `streamingResponse` / `streaming_response`: a search asked "Hello, World!" with `webtool_config: {count: 3}`, and a fetch read `https://example.com`, told apart by the `-fetch` in the model id as the clients tell them. The kits of the other 345 rows did not change.
- The site's `PROVIDERS` gained Jina AI (`https://s.jina.ai` and `https://r.jina.ai`, key `JINA_API_KEY`), and `VENDORS` gained Jina AI for `jina-` ids, with lobe-icons' Jina mark. The TokenDance rows at `/gateway/deepseek` fell under TokenDance's existing prefix.
- `/models/` went from 1,179,572 to 1,198,915 bytes (55,617 to 56,324 gzipped), `/zh/models/` from 1,192,051 to 1,211,581 (56,404 to 57,224), `/models.json` from 115,078 to 116,681 (6,798 to 6,973), and the catalog script from 15,767 to 16,543 (6,594 to 6,814).
- Both `skills/*/reference/api.md` listed `Web` among the modalities.

## Registry metadata

| Model | Base URL | Client | Input → output | Price per 1M prompt tokens |
| --- | --- | --- | --- | --- |
| `deepseek-search` | `https://api.deepseek.com` | `deepseek-official`, served through `deepseek-webtool` | Text → Web | ¥5,000 |
| `deepseek-fetch` | `https://api.deepseek.com` | `deepseek-official`, served through `deepseek-webtool` | Text → Web | ¥5,000 |
| `jina-search` | `https://s.jina.ai` | `jina-webtool` | Text → Web | $0.05 |
| `jina-fetch` | `https://r.jina.ai` | `jina-webtool` | Text → Web | $0.05 |
| `deepseek-search` | `https://tokendance.space/gateway/deepseek` | `deepseek-webtool` | Text → Web | ¥5,000 |
| `deepseek-fetch` | `https://tokendance.space/gateway/deepseek` | `deepseek-webtool` | Text → Web | ¥5,000 |

Every row's output price is 0. The new base URL constants are `_TOKENDANCE_DEEPSEEK` / `TOKENDANCE_DEEPSEEK`, `_JINA_SEARCH` / `JINA_SEARCH` and `_JINA_READER` / `JINA_READER`.

- **DeepSeek** bills ¥5 per 1,000 successful requests (https://api-docs.deepseek.com/zh-cn/guides/search.md, read 2026-11-02), and **TokenDance** ¥0.005 per request (its console, read 2026-11-02). `deepseek-webtool` counts one prompt token per request, so the rows store ¥5,000 per million.
- **Jina**'s models API, https://api.jina.ai/v1/models, lists $0.05 per million tokens for Jina's models (read 2026-11-02). `jina-webtool` counts the tokens Jina bills as prompt tokens: a flat 10,000 for a search, the page's tokens for a read.
