# MMSP-RFC-0014 提示缓存会话

- Feature Name: `session_id`
- Start Date: 2026-11-02
- RFC PR: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Implementation PR: [#309](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/309)
- Kind: change

[English](MMSP-RFC-0014-prompt-cache-sessions.md)

## Abstract

`UniConfig` 新增可选字符串 **`session_id`**，标明请求所属的对话。服务商支持提示缓存路由键的客户端将其作为 **`prompt_cache_key`** 发送——**64 个字符以内**原样发送，超出时发送其 **SHA-256 十六进制摘要**；其余客户端忽略它。

## 1. Introduction

- **服务商缓存路由机制**：缓存前缀留在处理它的机器上，后续请求需路由到同一机器才能复用：
  - **OpenAI**：按前缀哈希路由，单前缀超约 15 次/分钟会溢出；`prompt_cache_key` 将共享前缀请求归组（`llmsdk_docs/gpt6/docs/prompt-caching.md`）。
  - **Kimi**：建议多轮 Agent 每会话发送一个 `prompt_cache_key`（`llmsdk_docs/kimi_k3_1/docs/chat-api.md`：「对于其他多轮对话 Agent，也建议使用此字段」）。
  - **MiniMax**：Responses API 将其作为“提示缓存路由标识”（`llmsdk_docs/minimax_m3/docs/responses-create.md`：Prompt cache routing identifier）。
- **历史演进与负责人要求**：MMSP 原先仅在 Kimi K2 上取 `trace_id` 发送该键（[#81](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/81)），[#163](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/163) 因 Kimi K3 文档称缓存全自动而移除，后随 K3 文档恢复而新增 `session_id`（「支持prompt cache key的端点,我们要在UniConfig里面加一个session id的可选字段,允许用户来通过指定Session id来设置prompt cache key」「告诉用户推荐设置Session id,这样能增加命中率」）。
- **2026-11-02 端点探测**：向 OpenAI、Moonshot、MiniMax、DeepSeek、Z.AI、OpenRouter、SiliconFlow 和 TokenDance 的 Responses、Chat Completions 与 embeddings 发送 `prompt_cache_key` 均返回 `200`。OpenAI Responses（及 OpenRouter Chat Completions 上的 OpenAI 模型）按码位拒绝超 **64 字符**的键（`400`，`string_above_max_length`：64 个 emoji 通过，65 个汉字被拒）；OpenAI Chat Completions 接受 2000 字符，Moonshot、MiniMax 和 Z.AI 接受 300 字符。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **会话 id**：`UniConfig.session_id` 的值。
- **提示缓存键**：客户端作为 `prompt_cache_key` 发送的字符串。
- **字符**：一个 Unicode 码位（Python `len` 与 JS `Array.from` 的计数单位）。

## 3. `session_id` 键

- **定义**：`UniConfig` 与 TS `UniConfig` 接口必须定义可选字符串 `session_id`，标明请求所属对话或 Agent 任务，各客户端含义相同（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#31-uniconfig) §3.1）。
- **空字符串**：必须视为未设置。
- **推荐用法**：调用方应当为每个对话设一个会话 id（如 UUID），跨轮次与恢复会话保持不变，不应与无关对话共用。
- **独立于 `trace_id`**：`trace_id` 仅指定轨迹保存位置（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md)），不设置提示缓存键。

## 4. 提示缓存键

### 4.1 由会话 id 得出

- **64 字符规则**：不超过 64 字符时必须原样取会话 id；否则必须取其 UTF-8 字节的 64 字符小写十六进制 SHA-256 摘要。
- **统一函数**：由 `utils.py` 的 `prompt_cache_key` 与 `utils.ts` 的 `promptCacheKey` 计算，所有发送该键的客户端都必须调用它们，保证双包结果一致（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#6-两个包中的同一套协议) §6）。

### 4.2 各客户端

| 客户端 | 发送 |
| --- | --- |
| `openai-official`、`openai-responses` | Responses 请求上的 `prompt_cache_key` |
| `openai-chat`、`openai-chat-vllm-adapter` | Chat Completions 请求上的 `prompt_cache_key` |
| `moonshot-official` | `prompt_cache_key`，每一代都发送 |
| `minimax-official` | Responses 请求上的 `prompt_cache_key` |
| `anthropic-official`、`ant-messages`、`google-official`、`google-genai`、`openai-embedding`、`deepseek-official`、`zai-official` | 不发送：忽略这个键 |
| `mmsp` | 原样转发配置；由服务器端的客户端按本表处理 |

- **顶层类型参数**：两个 OpenAI SDK 的 `responses.create` 与 `chat.completions.create` 均支持类型参数 `prompt_cache_key`，必须直接传递而不经 `extra_body`。
- **静默忽略**：客户端不得因 `session_id` 抛异常；不支持的服务商客户端忽略它（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#62-没有对应设置的值) §6.2）。
- **不发网关私有头/字段**：客户端不得发送网关自有会话字段或请求头（OpenRouter `session_id` / `x-session-id`、OpenCode Go `x-opencode-session`、Fireworks `x-session-affinity`）；调用方可用 `default_headers` 设置。
- **Kimi K2 迁移**：`moonshot-official` 不得再将 `trace_id` 作为 Kimi K2 的 `prompt_cache_key` 发送；每一代 Kimi 均仅由 `session_id` 设置该键。

## 5. Playground

- **前端生成**：Playground 页面必须用 `crypto.randomUUID()`（非安全上下文缺 `randomUUID` 时用 `crypto.getRandomValues`）为每个对话生成并发送 `session_id`，新对话换新 id。
- **回退 id 不外发**：请求未指定 id 时，Playground 服务器回退使用的 id 必须不发送。

## 6. Drawbacks

- **无使用反馈**：响应中无法判断端点是否用到了该键。
- **长 id 显示为摘要**：超 64 字符的 id 在服务商控制台显示为 SHA-256 摘要。
- **Kimi K2 迁移**：原依赖 `trace_id` 的 Kimi K2 调用方需改设 `session_id`。

## 7. Rationale and Alternatives

- **按调用方概念命名**：以“对话（`session_id`）”命名，而非绑定某家字段（`prompt_cache_key`、`x-opencode-session`、`x-session-affinity`）。
- **超 64 字符取摘要**：若抛 `UnsupportedParameterError` 会导致仅在发键客户端上失败；若原样透传会在最严的 OpenAI 64 字符上限处失败。摘要保证任意长度在各处映射为同一合法键。
- **`deepseek-official` 与 `zai-official` 不发送**：DeepSeek 文档写明不支持并忽略 `prompt_cache_key`，Z.AI 文档无此字段；尽管 OpenRouter 在无 `session_id` 时按 `prompt_cache_key` 路由这两家模型，负责人决定不在官方客户端发送。
- **排除网关字段**：保持兼容客户端无厂商特例，`default_headers` 已满足自定义头需求。
- **忽略而非拒绝**：调用方可在所有模型请求上无条件设置 `session_id`，从而在支持的端点上提高命中率。

## 8. Prior Art

- **OpenAI / Kimi / MiniMax**：`prompt_cache_key`（Kimi Code Plan 必填）。
- **OpenRouter**：请求体 `session_id` 与请求头 `x-session-id`（<=256 字符，粘性路由键）。
- **OpenCode Go / Fireworks / vLLM**：`x-opencode-session` 请求头、Fireworks `user` 与 `x-session-affinity`、vLLM `session_id`。

## 9. Future Possibilities

- **OpenRouter 上的 DeepSeek/Z.AI**：为这两家在 OpenRouter 上的模型发送 `prompt_cache_key` 或 OpenRouter 的 `session_id`。
- **vLLM 适配器**：待 vLLM 文档写明 `session_id` 作用后，在 `openai-chat-vllm-adapter` 上发送。
