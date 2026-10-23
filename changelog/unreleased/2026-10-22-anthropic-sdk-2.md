# The Anthropic clients on `anthropic` SDK 2.x

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `ant_messages`, `anthropic_official`, `tests`, `ci`
- **PR:** [#270](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/270)

[中文版](2026-10-22-anthropic-sdk-2.zh.md)

## What changed

- `AntMessagesClient` and `AnthropicOfficialClient` each built the Anthropic SDK client from a private subclass of `AsyncAnthropic` that overrode `auth_headers`, so on every SDK version only the client's own key went out: `ant-messages` through both `x-api-key` and `Authorization: Bearer`, `anthropic-official` through `x-api-key` only, and nothing for a key resolved as none. The SDK's own credential discovery (`ANTHROPIC_AUTH_TOKEN`, profiles under `ANTHROPIC_CONFIG_DIR`, workload identity federation) sent nothing. The clients worked on `anthropic` 0.87.0 through 2.x, and the dependency stayed `anthropic[bedrock]>=0.87.0`.
- `AntMessagesClient` sent `temperature` through the SDK's `extra_body`, so it reached the server on the SDK lines that dropped the parameter.
- `AnthropicOfficialClient` on Bedrock sent `anthropic_version: bedrock-2023-05-31` for the Claude 4.6 models, the body version those models take; later models kept the SDK's default.
- `test_request_body.py` checked the request body of both Messages client types against a local server: `temperature` on `ant-messages` and the Bedrock body version on `anthropic-official`.
- The Python CI workflow reran the offline tests with `anthropic[bedrock]<2` and `anthropic[bedrock]==0.87.0` after the main run.

## Wire shape

| Client | Key on the wire | SDK 0.87 / 1.x / 2.x |
| --- | --- | --- |
| `anthropic-official` | `x-api-key: <key>` | same on all |
| `ant-messages` | `x-api-key: <key>` and `Authorization: Bearer <key>` | same on all |
| either, no key | no credential header | same on all |
| `anthropic-official` on `bedrock://` | AWS SigV4 only; body `anthropic_version` `bedrock-2023-05-31` for `4-6` models | same on all |
