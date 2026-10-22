# vLLM 适配器改用自己的凭据，并以无 key 方式调用本地服务端

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `credentials`, `openai_chat`, `openai_chat_vllm_adapter`, `tests`, `docs`
- **PR:** [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276)
- **Breaking:** yes — `openai-chat-vllm-adapter` 不再读取 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`

[English](2026-10-22-vllm-credentials.md)

## 变更内容

- `openai-chat-vllm-adapter` 在 Python 与 TypeScript 的 `CLIENT_CREDENTIALS` 中有了自己的一行：`VLLM_API_KEY`（`vllm serve` 读取自身 key 所用的变量）、`VLLM_BASE_URL`，以及默认端点 `http://127.0.0.1:8000/v1`，即 `vllm serve` 默认监听的地址。这一行与 `mmsp` 的一样，标记为开放服务端。
- 对传入 base URL 而不传 key 的 vLLM 适配器（包括传入其默认端点），`environmentCredential` / `environment_credential` 的回答由 `required` 改为 `keyless`。
- `OpenaiChatClient` 与 vLLM 适配器在未解析出端点时，把所属客户端类型的默认端点交给 OpenAI SDK，SDK 不再从 `OPENAI_BASE_URL` 补全端点。开放服务端的客户端没有 key 时，把占位 key `EMPTY` 交给 SDK（vLLM 文档对未设置 `--api-key` 的服务端也是这样写的），SDK 不再从 `OPENAI_API_KEY` 补全 key，也不再拒绝构造。
- README、两个语言包的 README、网站的客户端页与模型页，以及面向使用者的 Skill，写明了 vLLM 适配器的 `VLLM_API_KEY` / `VLLM_BASE_URL` 与无 key 规则。

## 兼容性

- 不传 base URL 构造的 vLLM 适配器，现在发往 `VLLM_BASE_URL`，未设置时发往 `http://127.0.0.1:8000/v1`，不再发往 `OPENAI_BASE_URL` 或 OpenAI。vLLM 服务端在别处时，请设置 `VLLM_BASE_URL` 或传入 base URL。
- 现在发送的是 `VLLM_API_KEY`，未设置时发送 `EMPTY`，不再发送 `OPENAI_API_KEY`。用 `--api-key` 启动的 vLLM 服务端，需要把 key 放进 `VLLM_API_KEY` 或直接传入。
- 传入 base URL 而不传 key 时，现在以无 key 方式调用，不再抛出 `ApiKeyRequiredError`。
