# session_id：对话的提示缓存键

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `types`, `utils`, `openai_official`, `openai_responses`, `openai_chat`, `moonshot_official`, `minimax_official`, `integration`, `docs`

[English](2026-11-02-session-id.md)

## 变更内容

- 两个包都按 [MMSP-RFC-0014](../../design/rfcs/MMSP-RFC-0014-prompt-cache-sessions.zh.md) 的规定新增了 `UniConfig.session_id`：一个可选的字符串，标明请求所属的对话。文档推荐每个对话设一个固定的 id，因为它能提高提示词缓存的命中率。
- `openai-official`、`openai-responses`、`openai-chat`（以及继承它的 `openai-chat-vllm-adapter`）、每一代 Kimi 上的 `moonshot-official` 与 `minimax-official` 把它作为 `prompt_cache_key` 发送，这是两个 OpenAI SDK 中都有类型的参数。空字符串不发送。
- `utils.py` 中的 `prompt_cache_key` 与 `utils.ts` 中的 `promptCacheKey` 给出这个键：64 个字符以内（按码位计数）为会话 id 本身，超过时为它的 UTF-8 字节的 SHA-256 摘要，写作小写十六进制，因为 OpenAI 的 Responses API 以及 OpenRouter 上的 OpenAI 模型拒绝更长的键。
- `anthropic-official`、`ant-messages`、`google-official`、`google-genai`、`openai-embedding`、`deepseek-official` 与 `zai-official` 忽略它；`mmsp` 客户端把它原样放在配置中转发。
- `moonshot-official` 不再在 Kimi K2 上把 `trace_id` 作为 `prompt_cache_key` 发送；Kimi K2 的调用方改为设置 `session_id` 来得到这个键。
- Playground 页面用 `crypto.randomUUID()` 生成每个对话的 id，在非安全上下文中改用 `crypto.getRandomValues` 生成，两个 Playground 服务器都把它作为请求的 `session_id` 发送，除非请求的配置中已经带有一个；没有指明会话的请求不发送。
- 配置页新增了 `session_id` 的字段行、示例值与小节，并去掉了 `trace_id` 下 Kimi K2 的那一行；快速开始、`README.md`、`src_py/README.md` 以及两个 MMSP skill 的数据模型参考都加入了这个键。

## 配置行为

| 客户端 | `session_id` 发送为 |
| --- | --- |
| `openai-official`、`openai-responses`、`openai-chat`、`openai-chat-vllm-adapter`、`moonshot-official`、`minimax-official` | `prompt_cache_key`：64 个字符以内为 id 本身，超过时为它的 SHA-256 十六进制摘要 |
| `anthropic-official`、`ant-messages`、`google-official`、`google-genai`、`openai-embedding`、`deepseek-official`、`zai-official` | 忽略 |
| `mmsp` | 在配置中原样转发 |
