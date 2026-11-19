# README routing example and the record of the RFC renumbering

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`, `site`, `skills`, `utils`
- **PR:** [#354](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/354)

[中文版](2026-11-20-readme-routing-and-rfc-renumbering-record.zh.md)

## What changed

- The OpenRouter GLM-5.3 examples of [`README.md`](../../README.md) and [`README.zh.md`](../../README.zh.md) passed `client_type="zai-official"` (`clientType` in TypeScript); without it `AutoLLMClient` raised `RoutingError` for `z-ai/glm-5.3`, whose id begins with no known family.
- Both READMEs listed `jina-` among the model families that name an official client and said that any other id needs a `client_type`, and the Model Index link gained its trailing slash.
- The embedding examples of both READMEs and of `skills/mmsp-python/reference/models.md` and `skills/mmsp-typescript/reference/models.md` used `Qwen/Qwen3-Embedding-8B`, the SiliconFlow embedding model the registry lists, in place of `Qwen/Qwen3-Embedding-0.6B`.
- [MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.md) recorded the 2026-11-18 renumbering of `MMSP-RFC-0014` to `MMSP-RFC-0011` in its Introduction and §5 in both languages, and [`design/README.md`](../../design/README.md), [`design/README.zh.md`](../../design/README.zh.md) and the redirect comments of `site/astro.config.mjs` named it beside the two renumberings of 2026-10-24.
- The `prompt_cache_key` docstrings in `src_py/mmsp/utils.py` and `src_ts/src/utils.ts` cited `MMSP-RFC-0011` in place of `MMSP-RFC-0014`.
