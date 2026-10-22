# The vLLM adapter takes its own credentials and calls a local server keyless

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `credentials`, `openai_chat`, `openai_chat_vllm_adapter`, `tests`, `docs`
- **PR:** [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276)
- **Breaking:** yes — `openai-chat-vllm-adapter` no longer reads `OPENAI_API_KEY` or `OPENAI_BASE_URL`

[中文版](2026-10-22-vllm-credentials.zh.md)

## What changed

- `openai-chat-vllm-adapter` got its own row in `CLIENT_CREDENTIALS`, in Python and TypeScript: `VLLM_API_KEY` (the variable `vllm serve` reads for its own key), `VLLM_BASE_URL`, and the default endpoint `http://127.0.0.1:8000/v1`, where `vllm serve` answers. The row is an open server, as `mmsp`'s is.
- `environmentCredential` / `environment_credential` answered `keyless` for a vLLM adapter given a base URL without a key, its default endpoint included, where it had answered `required`.
- `OpenaiChatClient` and the vLLM adapter handed the OpenAI SDK their client type's default endpoint whenever none was resolved, so the SDK no longer filled it from `OPENAI_BASE_URL`. A client of an open server with no key handed the SDK the placeholder key `EMPTY`, as vLLM's docs do for a server started without `--api-key`, so the SDK no longer filled it from `OPENAI_API_KEY` or refused to build.
- The README, the package READMEs, the client and model pages of the site, and the consumer skills named `VLLM_API_KEY` / `VLLM_BASE_URL` and the keyless rule for the vLLM adapter.

## Compatibility

- A vLLM adapter built with no base URL now reaches `VLLM_BASE_URL`, else `http://127.0.0.1:8000/v1`, instead of `OPENAI_BASE_URL` or OpenAI. Set `VLLM_BASE_URL`, or pass the base URL, for a vLLM server elsewhere.
- It now sends `VLLM_API_KEY`, or `EMPTY` without it, instead of `OPENAI_API_KEY`. A vLLM server started with `--api-key` needs the key in `VLLM_API_KEY` or passed in.
- A base URL passed without a key is now called keyless instead of raising `ApiKeyRequiredError`.
