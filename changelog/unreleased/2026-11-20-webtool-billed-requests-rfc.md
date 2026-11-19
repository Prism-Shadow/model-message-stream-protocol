# MMSP-RFC-0003 counted only the requests an endpoint bills

- **Date:** 2026-11-20
- **Type:** process
- **Scope:** `design`

[中文版](2026-11-20-webtool-billed-requests-rfc.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §3.2 had a web tool billed by the request count, as `prompt_tokens`, 1,000 for each request the endpoint bills and 0 for each request it does not, in place of 1,000 for every request: DeepSeek bills a search only when `results` is non-empty and a fetch only when `content` is non-empty.
