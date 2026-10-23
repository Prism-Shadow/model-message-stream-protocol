# 配置页给出每个客户端为每个字段发送什么

- **Date:** 2026-10-23
- **Type:** process
- **Scope:** `site`

[English](2026-10-23-configuration-docs.md)

## 变更内容

- 配置页（`site/src/docs/configuration.en.md`、`.zh.md`）新增“每个客户端发送什么”一节：每个 `UniConfig` 字段一张表，每个客户端一行，客户端按模型代际区分的再按代际分行，给出发送的字段、“忽略”或抛错。
- 修正了页面上的说法：Anthropic 的两个客户端在未设置 `max_tokens` 时发送 64000，向量客户端忽略它；`temperature` 在 Gemini 上任何值都抛错，在 MiniMax 上发送 0 到 1 之间的值；`tool_choice` 有各客户端的限制，工具名列表在每个客户端上变成不同的设置；`thinking_level` 按客户端和代际的固定表映射；`thinking_summary` 被 `openai-chat`、`openai-chat-vllm-adapter`、MiniMax、Kimi 和 GLM 忽略，在 `openai-responses` 上需要同时设置 `thinking_level`；`prompt_caching` 不是 `enable` 时，除 `anthropic-official` 外的所有客户端都抛错；没有快速档位的客户端对 `fast_mode` 抛错；`image_config`、`tts_config` 和 `embedding_config` 写明读取它们的客户端和模型；`trace_id` 在 Kimi K2 上同时作为 `prompt_cache_key` 发送；GPT-6 Luna 原样接受 `none`。
