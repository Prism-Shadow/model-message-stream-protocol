# One environment-key rule for every client

- **Date:** 2026-10-18
- **Type:** fix
- **Scope:** `credentials`, `utils`, `errors`, `auto_client`, `tests`
- **Breaking:** yes — an official client given a `base_url` other than its default endpoint and no `api_key` now raises `ApiKeyRequiredError` instead of sending its environment key there

[中文版](2026-10-18-env-key-default-endpoint.zh.md)

## What changed

- Every client, official and compatible, resolves its key and endpoint through `resolve_credentials` / `resolveCredentials` by one rule. A key passed in is used, with the base URL passed in, else `<P>_BASE_URL`, else the client's default endpoint. Without a key, the client reads `<P>_API_KEY` only when no base URL is passed, or when the base URL passed is its own default endpoint, trailing slashes and the host's case aside. Any other base URL without a key raises `ApiKeyRequiredError` before any request. The `mmsp` client still calls a base URL given without a key keyless, as an open server.
- `deepseek-official`, `zai-official`, `moonshot-official`, `minimax-official` and `google-official` no longer send `DEEPSEEK_API_KEY`, `ZAI_API_KEY`, `MOONSHOT_API_KEY`, `MINIMAX_API_KEY` or `GEMINI_API_KEY` to a base URL other than their default endpoint. Given no base URL, or `https://api.deepseek.com`, `https://api.z.ai/api/paas/v4/`, `https://api.moonshot.cn/v1`, `https://api.minimax.io/v1` or `https://generativelanguage.googleapis.com`, they read it as before.
- `openai-official`, `anthropic-official` and the compatible clients, which refused every base URL passed without a key, now read their `<P>_API_KEY` for their default endpoint passed as the base URL (`https://api.openai.com/v1`, `https://api.anthropic.com`, `https://generativelanguage.googleapis.com`).
- Added `ApiKeyRequiredError`, an `MMSPError` exported from the package root, carrying `client`, `client_type` / `clientType`, `api_key_env` / `apiKeyEnv`, `base_url_env` / `baseUrlEnv` and `base_url` / `baseUrl`. Its message names both fixes, for example `apiKey is required for DeepSeekOfficialClient with baseUrl https://gateway.example/v1: DEEPSEEK_API_KEY is sent only to https://api.deepseek.com or to the endpoint DEEPSEEK_BASE_URL names. Pass apiKey, or drop baseUrl and set DEEPSEEK_API_KEY, plus DEEPSEEK_BASE_URL for an endpoint other than https://api.deepseek.com.` (`api_key` and `base_url` in Python).
- Added the `credentials` module: `@prismshadow/mmsp/credentials` in TypeScript, a new `package.json` export that imports nothing and reads no environment, and `mmsp.credentials` in Python.
  - `CLIENT_CREDENTIALS`: each client type's key variable, base URL variable and default endpoint, and `openServer` / `open_server` for `mmsp`.
  - `environmentCredential(clientType, baseUrl?)` / `environment_credential(client_type, base_url=None)`: what a client handed no key does, `env` (naming the base URL variable only when no base URL is passed), `keyless` or `required`; `null` / `None` for an unknown client type.
  - `routedClientType(model, clientType?)` / `routed_client_type(model, client_type=None)`: the client `AutoLLMClient` builds for a model. `MODEL_FAMILIES`, `OFFICIAL_CLIENT_TYPES`, `COMPATIBLE_CLIENT_TYPES` and `clientTypeForModel` / `client_type_for_model` moved there from `autoClient` / `auto_client`, which routes through it.
- Offline tests build every client type of `CLIENT_CREDENTIALS` and check that `environmentCredential` / `environment_credential` predicts what the built client does: with a key, with no key and no base URL, with its default endpoint spelled otherwise, and with another base URL.

## Compatibility

- A caller that passes an official client a `base_url` other than its default endpoint and relies on the environment's key must pass the key as `api_key`, or drop `base_url` and set `<P>_BASE_URL` beside `<P>_API_KEY`.
- The refusal message changed from `api_key is required for <Client> with a base_url: <VAR> is not sent to another endpoint.` to the `ApiKeyRequiredError` message above, still a `ValueError` in Python. Code that matched the old text should catch `ApiKeyRequiredError`.
