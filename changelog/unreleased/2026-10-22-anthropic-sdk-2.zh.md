# Anthropic 客户端支持 `anthropic` SDK 2.x

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `anthropic_sdk`, `ant_messages`, `anthropic_official`, `tests`, `ci`

[English](2026-10-22-anthropic-sdk-2.md)

## 变更内容

- `AntMessagesClient` 与 `AnthropicOfficialClient` 改为通过 `anthropic_sdk` 中的 `ExplicitAsyncAnthropic` 构建 Anthropic SDK 客户端。它是 `AsyncAnthropic` 的子类，在任何 SDK 版本上都把密钥放在 `x-api-key`、令牌放在 `Authorization: Bearer`，凭证解析为空时不发送任何凭证，也不触发 SDK 自身的凭证发现（`ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_CONFIG_DIR` 下的 profile、workload identity federation）。`ant-messages` 仍同时通过两个头发送密钥，`anthropic-official` 只通过 `x-api-key`。两个客户端可在 `anthropic` 0.87.0 至 2.x 上使用，依赖仍为 `anthropic[bedrock]>=0.87.0`。
- `AntMessagesClient` 改为通过 SDK 的 `extra_body` 发送 `temperature`，在去掉该参数的 SDK 版本上也能送达服务端。
- `AnthropicOfficialClient` 在 Bedrock 上对 Claude 4.6 系列发送 `anthropic_version: bedrock-2023-05-31`，即这些模型接受的请求体版本；更新的模型沿用 SDK 默认值。
- `test_request_body.py` 用本地服务器检查两种 Messages 客户端类型的请求体：`ant-messages` 的 `temperature`，以及 `anthropic-official` 在 Bedrock 上的请求体版本。
- Python CI 工作流在主测试之后，用 `anthropic[bedrock]<2` 与 `anthropic[bedrock]==0.87.0` 重跑离线测试。

## 线上形状

| 客户端 | 线上的密钥 | SDK 0.87 / 1.x / 2.x |
| --- | --- | --- |
| `anthropic-official` | `x-api-key: <key>` | 三者相同 |
| `ant-messages` | `x-api-key: <key>` 与 `Authorization: Bearer <key>` | 三者相同 |
| 两者，无密钥 | 不带凭证头 | 三者相同 |
| `anthropic-official` 的 `bedrock://` | 仅 AWS SigV4；`4-6` 模型的请求体 `anthropic_version` 为 `bedrock-2023-05-31` | 三者相同 |
