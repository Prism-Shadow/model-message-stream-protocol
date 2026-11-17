# MMSP-RFC-0003 counted a request billed by the request as 1,000 tokens

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `design`
- **PR:** [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)

[中文版](2026-11-17-webtool-request-tokens-rfc.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §3.2 had a web tool's `stop` report, as `prompt_tokens`, 1,000 for each request where the endpoint bills by the request, in place of 1, so that the price per million tokens of such a model is the price of 1,000 requests.
