# The vLLM adapter takes its own credentials, and OpenAI's environment stays with OpenAI

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `credentials`, `utils`, `openai_chat`, `openai_chat_vllm_adapter`, `tests`
- **PR:** [#276](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/276)
- **Breaking:** yes — `openai-chat-vllm-adapter` no longer reads `OPENAI_API_KEY` or `OPENAI_BASE_URL`, and OpenAI's other environment variables no longer reach endpoints other than OpenAI's

[中文版](2026-10-22-vllm-credentials.zh.md)

## What changed

- `openai-chat-vllm-adapter` got its own row in `CLIENT_CREDENTIALS`, in Python and TypeScript: `VLLM_API_KEY` (the variable `vllm serve` reads for its own key), `VLLM_BASE_URL`, and the default endpoint `http://127.0.0.1:8000/v1`, where `vllm serve` answers. The row is an open server, as `mmsp`'s is.
- `environmentCredential` / `environment_credential` answered `keyless` for a vLLM adapter given a base URL without a key, its default endpoint included, where it had answered `required`.
- `OpenaiChatClient` and the vLLM adapter handed the OpenAI SDK their client type's default endpoint whenever none was resolved, so the SDK no longer filled it from `OPENAI_BASE_URL`. A client of an open server with no key handed the SDK the placeholder key `EMPTY`, as vLLM's docs do for a server started without `--api-key`, so the SDK no longer filled it from `OPENAI_API_KEY` or refused to build.
- Every client built on the OpenAI SDK (`openai-official`, `openai-responses`, `openai-chat`, `openai-chat-vllm-adapter`, `openai-embedding`, `deepseek-official`, `zai-official`, `moonshot-official`, `minimax-official`) handed the SDK the rest of OpenAI's environment explicitly whenever its endpoint was not the one `OPENAI_API_KEY` goes to: no organization, project, admin key or webhook secret, and none of the headers `OPENAI_CUSTOM_HEADERS` lists. `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET` and `OPENAI_CUSTOM_HEADERS` stopped reaching gateways, vLLM servers and other vendors' APIs, and an `Authorization` header in `OPENAI_CUSTOM_HEADERS` stopped replacing the client's own key there. An OpenAI client handed no base URL, or OpenAI's default endpoint, sent them as before. The rule lives in `openaiClientOptions` / `openai_client_options` in `utils`.
- The TypeScript package required `openai` `^6.42.0` and the Python package `openai>=2.34.0`, the first releases that read `OPENAI_ADMIN_KEY` and `OPENAI_CUSTOM_HEADERS`.
- The README, the package READMEs, the client and model pages of the site, and the consumer skills named `VLLM_API_KEY` / `VLLM_BASE_URL` and the keyless rule for the vLLM adapter.

## Compatibility

- A vLLM adapter built with no base URL now reaches `VLLM_BASE_URL`, else `http://127.0.0.1:8000/v1`, instead of `OPENAI_BASE_URL` or OpenAI. Set `VLLM_BASE_URL`, or pass the base URL, for a vLLM server elsewhere.
- It now sends `VLLM_API_KEY`, or `EMPTY` without it, instead of `OPENAI_API_KEY`. A vLLM server started with `--api-key` needs the key in `VLLM_API_KEY` or passed in.
- A base URL passed without a key is now called keyless instead of raising `ApiKeyRequiredError`.
- An OpenAI-SDK client handed a gateway's base URL no longer sends `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID` or the headers in `OPENAI_CUSTOM_HEADERS`. A gateway that needs such a header gets it through `default_headers` / `defaultHeaders`.
