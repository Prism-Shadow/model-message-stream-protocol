# 所有客户端共用一条环境变量密钥规则

- **Date:** 2026-10-18
- **Type:** fix
- **Scope:** `credentials`, `utils`, `errors`, `auto_client`, `tests`
- **PR:** [#258](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/258)
- **Breaking:** yes — 官方客户端指定了默认端点以外的 `base_url` 却没有 `api_key` 时，改为抛出 `ApiKeyRequiredError`，不再把环境变量里的密钥发往该地址

[English](2026-10-18-env-key-default-endpoint.md)

## 变更内容

- 所有客户端，无论官方还是兼容，都通过 `resolve_credentials` / `resolveCredentials` 按同一条规则解析密钥与端点。传入了密钥就使用它，端点依次取传入的 base URL、`<P>_BASE_URL`、客户端的默认端点。未传入密钥时，客户端只在未传入 base URL，或传入的 base URL 正是自己的默认端点（忽略末尾斜杠与主机名大小写）时读取 `<P>_API_KEY`。未传入密钥而传入其他 base URL 时，在发出任何请求之前抛出 `ApiKeyRequiredError`。`mmsp` 客户端仍把未带密钥的 base URL 视为开放的服务端，请求不带密钥。
- `deepseek-official`、`zai-official`、`moonshot-official`、`minimax-official` 与 `google-official` 不再把 `DEEPSEEK_API_KEY`、`ZAI_API_KEY`、`MOONSHOT_API_KEY`、`MINIMAX_API_KEY` 或 `GEMINI_API_KEY` 发往默认端点以外的 base URL。未传入 base URL，或传入 `https://api.deepseek.com`、`https://api.z.ai/api/paas/v4/`、`https://api.moonshot.cn/v1`、`https://api.minimax.io/v1`、`https://generativelanguage.googleapis.com` 时，照旧读取该变量。
- `openai-official`、`anthropic-official` 与各兼容客户端过去拒绝一切未带密钥的 base URL，现在传入的 base URL 是其默认端点（`https://api.openai.com/v1`、`https://api.anthropic.com`、`https://generativelanguage.googleapis.com`）时，会读取各自的 `<P>_API_KEY`。
- 新增 `ApiKeyRequiredError`，它是从包根导出的 `MMSPError`，携带 `client`、`client_type` / `clientType`、`api_key_env` / `apiKeyEnv`、`base_url_env` / `baseUrlEnv` 与 `base_url` / `baseUrl`。其消息同时给出两种解决办法，例如 `apiKey is required for DeepSeekOfficialClient with baseUrl https://gateway.example/v1: DEEPSEEK_API_KEY is sent only to https://api.deepseek.com or to the endpoint DEEPSEEK_BASE_URL names. Pass apiKey, or drop baseUrl and set DEEPSEEK_API_KEY, plus DEEPSEEK_BASE_URL for an endpoint other than https://api.deepseek.com.`（Python 中为 `api_key` 与 `base_url`）。
- 新增 `credentials` 模块：TypeScript 为 `@prismshadow/mmsp/credentials`，是 `package.json` 新增的导出，不导入任何模块，也不读取环境变量；Python 为 `mmsp.credentials`。
  - `CLIENT_CREDENTIALS`：每个客户端类型的密钥变量、base URL 变量与默认端点，以及 `mmsp` 的 `openServer` / `open_server`。
  - `environmentCredential(clientType, baseUrl?)` / `environment_credential(client_type, base_url=None)`：未传入密钥的客户端会怎么做，结果为 `env`（只有未传入 base URL 时才给出 base URL 变量）、`keyless` 或 `required`；未知的客户端类型返回 `null` / `None`。
  - `routedClientType(model, clientType?)` / `routed_client_type(model, client_type=None)`：`AutoLLMClient` 为某个模型构造的客户端。`MODEL_FAMILIES`、`OFFICIAL_CLIENT_TYPES`、`COMPATIBLE_CLIENT_TYPES` 与 `clientTypeForModel` / `client_type_for_model` 从 `autoClient` / `auto_client` 移到这里，`AutoLLMClient` 通过它路由。
- 离线测试构造 `CLIENT_CREDENTIALS` 中的每个客户端类型，检查 `environmentCredential` / `environment_credential` 的回答与构造出的客户端的实际行为一致：传入密钥、未传密钥也未传 base URL、以另一种写法传入默认端点、传入其他 base URL。

## 兼容性

- 向官方客户端传入默认端点以外的 `base_url`、又依赖环境变量密钥的调用方，必须把密钥作为 `api_key` 传入，或去掉 `base_url`，在 `<P>_API_KEY` 之外设置 `<P>_BASE_URL`。
- 拒绝时的消息由 `api_key is required for <Client> with a base_url: <VAR> is not sent to another endpoint.` 改为上面的 `ApiKeyRequiredError` 消息，在 Python 中仍是 `ValueError`。匹配旧消息文本的代码应改为捕获 `ApiKeyRequiredError`。
