# A slim /models.json, and integration kits assembled in the browser

- **Date:** 2026-10-25
- **Type:** feature
- **Scope:** `site`
- **PR:** [#305](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/305)
- **Breaking:** yes — `/models.json` rows lost `kit`, `vendor`, `status_key`, `pricing.currency` and `pricing.thoughts_tokens` and no longer carry `null`, and `/models/kits.json` and `/zh/models/kits.json` were removed.

[中文版](2026-10-25-models-json-slim.zh.md)

## What changed

- `/models.json` rows kept `model`, `base_url`, `client`, `provider` (the name), `input_modalities`, `output_modalities`, `context_window`, `pricing` and `api_key_env`, and gained `api_key_format` only where the provider's key is not a plain token (Vertex AI, Amazon Bedrock, vLLM), with the English hint as before. `pricing` held the token buckets `prompt_tokens`, `response_tokens` and `cached_tokens`. A value the registry does not record was left out instead of written as `null`. The file stayed one JSON document, with one row per line.
- `/models.json` gained a top-level `call`, one constructor call that fits every row: `"python": "AutoLLMClient(model=model, client_type=client, base_url=base_url, api_key=os.environ[api_key_env])"`, `"typescript": "new AutoLLMClient({ model, clientType: client, baseUrl: base_url, apiKey: process.env[api_key_env] })"` and `"docs"`, the quickstart's URL. The top-level `pricing` sentence became the only place the currency is stated, and it says thoughts are billed at `response_tokens`. The endpoint read `listSupportedModels("USD")` and the provider table directly, and the build stops if a registry row bills thoughts apart from the response.
- The Model Index assembled each entry's programs, run lines and agent prompt in the browser, from the row and one table of the providers on the page. The template moved from `site/src/shared/catalog.ts` to the new `site/src/shared/kit.ts` (`kitFor`, `agentPromptFor`, `catalogKit`, `literal`, `formatContext`, `formatPrice`), which the page's script imports. Each row carried `data-client`, `data-p` (its provider's index in `<script type="application/json" data-kit-providers>`), `data-kind` (except for text), `data-short` (on rows whose constructor names only the model) and its modalities as letters in `data-in` and `data-out`; the section carried `data-site`. The build kept deciding the kind and the short constructor (`kitEntry()`, `kitProvider()` in `catalog.ts`), so the SDK's model families never reach the browser. The programs, run lines and agent prompts were the same, byte for byte, as those `kits.json` served.
- The dialog filled at once on a click. The fetch of `kits.json`, its prefetch after load, the loading and failure lines, their `kit.loading` and `kit.loadFailed` strings in both languages, and `catalogKits()` were removed.
- `llms.txt` described `/models.json` by its new fields and its `call`.
- Sizes, raw and gzipped: `/models.json` went from 837,545 bytes (23,592) to 115,078 (6,798). `/models/` went from 1,154,025 (53,974) to 1,179,764 (55,278) and `/zh/models/` from 1,166,447 (54,788) to 1,192,195 (56,136); the catalog script from 7,251 (2,927) to 15,966 (6,638). The page no longer fetched `/models/kits.json`, 1,838,349 bytes (35,934), or `/zh/models/kits.json`, 1,865,338 (36,630).

## Compatibility

- `kit`: fill the top-level `call` with the row's `model`, `client`, `base_url` and `api_key_env`. The complete programs, the server row and the run lines are on the Model Index, in each row's dialog.
- `status_key`: join the row's fields as `status.key` names them, `` `${client}+${base_url}+${model}` ``.
- `vendor`: no field replaces it. A gateway's model id names the maker (`anthropic/claude-opus-5.5`), and the Model Index still shows the maker's mark.
- `pricing.currency`: every price is in USD, as the top-level `pricing` says.
- `pricing.thoughts_tokens`: read `pricing.response_tokens`.
- `null`: a missing `context_window` or `pricing` means the registry records none; read it as `row.context_window ?? null`.
- `/models/kits.json` and `/zh/models/kits.json`: read `/models.json` with `call`, or open the entry's dialog on `/models/`.
