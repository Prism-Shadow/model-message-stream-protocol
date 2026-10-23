# The configuration page gives what each client sends for each key

- **Date:** 2026-10-23
- **Type:** process
- **Scope:** `site`

[中文版](2026-10-23-configuration-docs.zh.md)

## What changed

- The configuration page (`site/src/docs/configuration.en.md`, `.zh.md`) gained "What each client sends": one table per `UniConfig` key, with a row per client, and per model generation where a client tells them apart, giving the field sent, "ignored", or a raise.
- The page's statements were corrected: `max_tokens` is 64000 when not set on the Anthropic clients and ignored by the embedding clients; `temperature` raises at any value on Gemini and is sent from 0 to 1 on MiniMax; `tool_choice` has per-client limits and a list of names becomes a different setting on each client; `thinking_level` follows a fixed table per client and generation; `thinking_summary` is ignored by `openai-chat`, `openai-chat-vllm-adapter`, MiniMax, Kimi and GLM, and needs a `thinking_level` on `openai-responses`; `prompt_caching` other than `enable` raises on every client but `anthropic-official`; `fast_mode` raises on the clients without a faster tier; `image_config`, `tts_config` and `embedding_config` name the clients and models that read them; `trace_id` is also sent as `prompt_cache_key` on Kimi K2; GPT-6 Luna takes `none` as it is.
