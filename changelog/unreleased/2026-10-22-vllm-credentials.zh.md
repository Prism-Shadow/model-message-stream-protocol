# vLLM 适配器改用自己的凭据，OpenAI 的环境变量只发往 OpenAI

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `credentials`, `utils`, `openai_chat`, `openai_chat_vllm_adapter`, `tests`
- **PR:** [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276)
- **Breaking:** yes — `openai-chat-vllm-adapter` 不再读取 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`，OpenAI 的其他环境变量也不再发往 OpenAI 以外的端点

[English](2026-10-22-vllm-credentials.md)

## 变更内容

- `openai-chat-vllm-adapter` 在 Python 与 TypeScript 的 `CLIENT_CREDENTIALS` 中有了自己的一行：`VLLM_API_KEY`（`vllm serve` 读取自身 key 所用的变量）、`VLLM_BASE_URL`，以及默认端点 `http://127.0.0.1:8000/v1`，即 `vllm serve` 默认监听的地址。这一行与 `mmsp` 的一样，标记为开放服务端。
- 对传入 base URL 而不传 key 的 vLLM 适配器（包括传入其默认端点），`environmentCredential` / `environment_credential` 的回答由 `required` 改为 `keyless`。
- `OpenaiChatClient` 与 vLLM 适配器在未解析出端点时，把所属客户端类型的默认端点交给 OpenAI SDK，SDK 不再从 `OPENAI_BASE_URL` 补全端点。开放服务端的客户端没有 key 时，把占位 key `EMPTY` 交给 SDK（vLLM 文档对未设置 `--api-key` 的服务端也是这样写的），SDK 不再从 `OPENAI_API_KEY` 补全 key，也不再拒绝构造。
- 所有基于 OpenAI SDK 的客户端（`openai-official`、`openai-responses`、`openai-chat`、`openai-chat-vllm-adapter`、`openai-embedding`、`deepseek-official`、`zai-official`、`moonshot-official`、`minimax-official`）在端点不是 `OPENAI_API_KEY` 所发往的端点时，把 OpenAI 环境中的其余各项显式交给 SDK：不带 organization、project、admin key 和 webhook secret，也不带 `OPENAI_CUSTOM_HEADERS` 列出的任何请求头。`OPENAI_ORG_ID`、`OPENAI_PROJECT_ID`、`OPENAI_ADMIN_KEY`、`OPENAI_WEBHOOK_SECRET` 与 `OPENAI_CUSTOM_HEADERS` 不再发往网关、vLLM 服务端和其他厂商的 API，`OPENAI_CUSTOM_HEADERS` 里的 `Authorization` 请求头也不再在这些端点替换客户端自己的 key。未传 base URL 或传入 OpenAI 默认端点的 OpenAI 客户端，行为与之前相同。这条规则位于 `utils` 的 `openaiClientOptions` / `openai_client_options`。
- TypeScript 包要求 `openai` `^6.42.0`，Python 包要求 `openai>=2.34.0`，即最早读取 `OPENAI_ADMIN_KEY` 与 `OPENAI_CUSTOM_HEADERS` 的版本。
- README、两个语言包的 README、网站的客户端页与模型页，以及面向使用者的 Skill，写明了 vLLM 适配器的 `VLLM_API_KEY` / `VLLM_BASE_URL` 与无 key 规则。

## 兼容性

- 不传 base URL 构造的 vLLM 适配器，现在发往 `VLLM_BASE_URL`，未设置时发往 `http://127.0.0.1:8000/v1`，不再发往 `OPENAI_BASE_URL` 或 OpenAI。vLLM 服务端在别处时，请设置 `VLLM_BASE_URL` 或传入 base URL。
- 现在发送的是 `VLLM_API_KEY`，未设置时发送 `EMPTY`，不再发送 `OPENAI_API_KEY`。用 `--api-key` 启动的 vLLM 服务端，需要把 key 放进 `VLLM_API_KEY` 或直接传入。
- 传入 base URL 而不传 key 时，现在以无 key 方式调用，不再抛出 `ApiKeyRequiredError`。
- 传入网关 base URL 的 OpenAI SDK 客户端，不再发送 `OPENAI_ORG_ID`、`OPENAI_PROJECT_ID` 或 `OPENAI_CUSTOM_HEADERS` 中的请求头。需要这类请求头的网关，请通过 `default_headers` / `defaultHeaders` 传入。
