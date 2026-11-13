# MMSP-RFC-0003 took in GPT-6.1 Terra, allowed-tools lists and the 12-hour cache

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`
- **PR:** [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313)

[中文版](2026-11-02-gpt-6-1-terra-rfc.zh.md)

## What changed

- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §6.1 matched `"gpt-6"` except `"gpt-6-luna"` and `"gpt-6.1-terra"`, and named `"gpt-5.6"`; `openai-responses` sent `none` as `low` on GPT-6 except Luna and GPT-6.1 Terra; `detail: "high"` covered an image GPT-6 would refuse, as GPT-5.6. §6.3 named GPT-6.1 Terra among the models whose off switch is `none`. §6.4 stated a list of tool names as `allowed_tools` with `mode: "required"` on `openai-official` and `openai-responses`, and `enhance` as `prompt_cache_options: {ttl: "12h"}` on `openai-official` for GPT-5.6 and later.
