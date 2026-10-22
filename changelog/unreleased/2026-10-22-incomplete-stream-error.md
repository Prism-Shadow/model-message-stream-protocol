# IncompleteStreamError for a stream that ends without its usage or finish reason

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `errors`, `base_client`, `wire`, `openai_official`, `site`
- **PR:** [#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)

[中文版](2026-10-22-incomplete-stream-error.zh.md)

## What changed

- Added `IncompleteStreamError`, the `MMSPError` that [MMSP-RFC-0010](../../design/rfcs/MMSP-RFC-0010-stop-metadata.md) names, to the exports of both packages. When a provider stream ended without its usage or its finish reason, the base class raised it in place of the `stop` event, after the items that had arrived, where it had raised a bare `ValueError` / `Error`.
- `IncompleteStreamError` carried `client`, `missing` (`usage_metadata`, `finish_reason`, or both) and the `finish_reason` and `usage_metadata` that had arrived (`finishReason` and `usageMetadata` in TypeScript). Its message named what was missing, as in `<client>'s stream ended without usage_metadata and finish_reason.`
- The MMSP server sent `IncompleteStreamError` with its fields, so the `mmsp` client raised an `UpstreamError` whose `error_type` was `IncompleteStreamError`.
- `OpenAIOfficialClient` in Python read the usage of `response.completed` and `response.incomplete` only when the event carried one, as TypeScript already did, so an event without usage ended in `IncompleteStreamError` rather than an `AttributeError`.
- Documented the error on the site's errors and usage pages and in the `mmsp-python` and `mmsp-typescript` skills.
