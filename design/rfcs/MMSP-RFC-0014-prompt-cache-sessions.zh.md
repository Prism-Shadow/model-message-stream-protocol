# MMSP-RFC-0014 提示缓存会话

- Feature Name: `session_id`
- Start Date: 2026-11-02
- RFC PR: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Implementation PR: [#309](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/309)
- Kind: change

[English](MMSP-RFC-0014-prompt-cache-sessions.md)

## Abstract

`UniConfig` 新增 `session_id`，一个可选的字符串，标明请求所属的对话。服务商接受提示缓存路由键的客户端把它作为 `prompt_cache_key` 发送，64 个字符以内原样发送，超过时发送它的 SHA-256 十六进制摘要；其他客户端忽略它。

## 1. Introduction

服务商把一段提示的缓存前缀留在处理它的那台机器上，所以之后的请求只有被路由到那里，才能复用这段前缀。OpenAI 按前缀的哈希路由，同一前缀每分钟超过大约 15 个请求时会溢出到没有缓存条目的机器；它的 `prompt_cache_key` 把共享前缀的请求归为一组，让它们到达同一份缓存（`llmsdk_docs/gpt6/docs/prompt-caching.md`）。Kimi 要求多轮对话 Agent 每个会话发送一个 `prompt_cache_key`（`llmsdk_docs/kimi_k3_1/docs/chat-api.md`：对于其他多轮对话 Agent，也建议使用此字段），MiniMax 的 Responses API 则把它作为“提示缓存路由标识”（`llmsdk_docs/minimax_m3/docs/responses-create.md`：Prompt cache routing identifier）。

调用方原先无法说明一个请求属于哪个对话。MMSP 只在 Kimi K2 上发送这个键，取自 `trace_id`（[#81](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/81)）；[#163](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/163) 在 Kimi K3 上去掉了它，因为当时 K3 的文档说缓存完全自动，而这个键后来又回到了 K3 的文档里。项目负责人的原话：支持prompt cache key的端点,我们要在UniConfig里面加一个session id的可选字段,允许用户来通过指定Session id来设置prompt cache key；以及：告诉用户推荐设置Session id,这样能增加命中率。

2026-11-02 的探测把 `prompt_cache_key` 发给了 OpenAI、Moonshot、MiniMax、DeepSeek、Z.AI、OpenRouter、SiliconFlow 和 TokenDance 的 Responses、Chat Completions 与 embeddings 端点，每个端点都返回 200。OpenAI 的 Responses API 拒绝超过 64 个字符的键（400，`string_above_max_length`），按码位计数：64 个 emoji 可以通过，65 个汉字被拒绝。OpenRouter 在 Chat Completions 上也会把 OpenAI 模型的同样拒绝转回来，而 OpenAI 自己的 Chat Completions 接受 2000 个字符，Moonshot、MiniMax 和 Z.AI 接受 300 个。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *会话 id*：`UniConfig.session_id` 的值。
- *提示缓存键*：客户端作为 `prompt_cache_key` 发送的字符串。
- *字符*：一个 Unicode 码位，即 Python 的 `len` 计数的单位，也是 `Array.from` 拆分 JavaScript 字符串的单位。

## 3. `session_id` 键

- `UniConfig` 与 TypeScript 的 `UniConfig` 接口必须定义 `session_id`，一个可选的字符串。它标明请求所属的对话或 Agent 任务，在每个客户端上含义相同（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#31-uniconfig) §3.1）。
- 空字符串必须视为未设置。
- 调用方应当为每个对话设一个会话 id，在这个对话的各轮之间、恢复会话时都保持不变，不应让无关的对话共用它。UUID 原样就适用于每个端点。
- `session_id` 与 `trace_id` 相互独立：`trace_id` 指明一轮对话保存在哪里（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md)），不设置提示缓存键。

## 4. 提示缓存键

### 4.1 由会话 id 得出

会话 id 不超过 64 个字符时，提示缓存键必须就是会话 id；否则必须是它的 UTF-8 字节的 SHA-256 摘要，写作小写十六进制，正好 64 个字符。`utils.py` 中的 `prompt_cache_key` 与 `utils.ts` 中的 `promptCacheKey` 计算这个键，每个发送键的客户端都必须用它们，这样一个会话 id 在两个包中得到同一个键（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#6-两个包中的同一套协议) §6）。

### 4.2 各客户端

| 客户端 | 发送 |
| --- | --- |
| `openai-official`、`openai-responses` | Responses 请求上的 `prompt_cache_key` |
| `openai-chat`、`openai-chat-vllm-adapter` | Chat Completions 请求上的 `prompt_cache_key` |
| `moonshot-official` | `prompt_cache_key`，每一代都发送 |
| `minimax-official` | Responses 请求上的 `prompt_cache_key` |
| `anthropic-official`、`ant-messages`、`google-official`、`google-genai`、`openai-embedding`、`deepseek-official`、`zai-official` | 不发送：忽略这个键 |
| `mmsp` | 原样转发配置；由服务器端的客户端按本表处理 |

- `prompt_cache_key` 在两个 OpenAI SDK 的 `responses.create` 与 `chat.completions.create` 中都是有类型的参数，所以两个包都必须把它作为这样的参数发送，而不经过 `extra_body`。
- 客户端不得因为 `session_id` 抛出异常：服务商不接受这个键的客户端忽略它（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#62-没有对应设置的值) §6.2）。
- 客户端不得为它发送某个网关自己的会话字段或请求头，例如 OpenRouter 的 `session_id` 与 `x-session-id`、OpenCode Go 的 `x-opencode-session`、Fireworks 的 `x-session-affinity`。调用方可以通过 `default_headers` 设置这些请求头。
- `moonshot-official` 不得再在 Kimi K2 上把 `trace_id` 作为 `prompt_cache_key` 发送；只有 `session_id` 设置这个键，在每一代 Kimi 上都是如此。

## 5. Playground

Playground 页面必须把它每个对话的 id 作为 `session_id` 发送，用 `crypto.randomUUID()` 生成；页面运行在非安全上下文、没有 `randomUUID` 时，改用 `crypto.getRandomValues` 生成。新的对话取新的 id。请求没有指明 id 时 Playground 服务器回退使用的那个 id，必须不发送。

## 6. Drawbacks

- 忽略这个键的端点从中得不到任何好处，调用方也无法从响应看出这个键是否被用到。
- 超过 64 个字符的会话 id 以摘要的形式到达服务商，所以服务商的控制台显示的是摘要，而不是调用方的 id。
- 依赖 `trace_id` 设置这个键的 Kimi K2 调用方，在设置 `session_id` 之前不再有这个键。

## 7. Rationale and Alternatives

- 这个键以调用方的概念，即对话，命名，而不是以某个服务商的字段命名：OpenAI 叫它 `prompt_cache_key`，OpenRouter 叫 `session_id`，OpenCode Go 叫 `x-opencode-session`，Fireworks 叫 `x-session-affinity`。
- 超过 64 个字符时，用 `UnsupportedParameterError` 拒绝，会让长 id 在发送键的客户端上失败、在其余客户端上通过；原样发送，会在 OpenAI 以及 OpenRouter 的 OpenAI 模型上失败。摘要让一个会话在各处都对应同一个键，而 64 个字符是 OpenAI 的上限，也是探测到的最严格的上限。
- `deepseek-official` 与 `zai-official` 不发送，尽管它们的端点接受这个字段：DeepSeek 的文档写明 `prompt_cache_key` 不支持、会被静默忽略，Z.AI 的文档没有这个字段。项目负责人选择不在这两处发送，尽管为这两个客户端的模型提供服务的 OpenRouter，在没有 `session_id` 时按 `prompt_cache_key` 路由。
- 网关的字段不纳入，因为兼容客户端不承载任何厂商的特例，而 `default_headers` 已经能设置它们。
- 没有这种键的地方忽略 `session_id` 而不是拒绝它，这样调用方无论用哪个模型，都能在每个请求上设置它，而在起作用的地方，正是这样才提高命中率。

## 8. Prior Art

OpenAI 在 Responses 与 Chat Completions 上的 `prompt_cache_key`；Kimi 的 `prompt_cache_key`，Kimi Code Plan 要求必填；MiniMax 的 `prompt_cache_key`；OpenRouter 的请求体字段 `session_id` 与请求头 `x-session-id`，最多 256 个字符，是它的粘性路由键；OpenCode Go 的请求头 `x-opencode-session`；Fireworks 的 `user` 字段与请求头 `x-session-affinity`；vLLM 的请求字段 `session_id`。

## 9. Future Possibilities

- 为 `deepseek-official` 与 `zai-official` 在 OpenRouter 上的模型发送这个键，或发送 OpenRouter 自己的 `session_id`。
- 等 vLLM 写明它的 `session_id` 做什么之后，在 `openai-chat-vllm-adapter` 上发送它。
