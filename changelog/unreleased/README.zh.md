# 未发布

[English](README.md)

- [2026-10-22] `@anthropic-ai/sdk` 升至 `^0.91.1`，重新生成 TypeScript 锁文件（`protobufjs` 7.6.6、`ws` 8.22.0、`express` 4.22.3、`jest` 30.5.2、`handlebars` 4.7.10 等），并新增请求体测试。([详情](2026-10-22-dependabot-src-ts.zh.md), [#275](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/275))
- [2026-10-22] 重新生成网站锁文件：`vite` 8.3.5、`source-map-js` 1.2.2、`http-cache-semantics` 4.3.0。([详情](2026-10-22-dependabot-site.zh.md), [#274](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/274))
- [2026-10-22] Anthropic 客户端支持 `anthropic` SDK 2.x：密钥仍放在 `x-api-key`，`ant-messages` 的 `temperature` 改经 `extra_body` 发送，Bedrock 上的 Claude 4.6 沿用旧的请求体版本，CI 用旧版 SDK 重跑离线测试。([详情](2026-10-22-anthropic-sdk-2.zh.md), [#270](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/270))
- [2026-10-19] 网站新增 `/models/` 模型目录（每一项附带接入代码）和展示每日探测结果的 `/status/` 状态页。([详情](2026-10-19-site-model-catalog.zh.md), [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263))
- [2026-10-19] 每日探测配置的模型通道，把状态、延迟、速度和费用发布到 `status-data` 分支。([详情](2026-10-19-status-probe.zh.md), [#259](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/259))
- [2026-10-19] 模型注册表新增 Google Vertex AI、Amazon Bedrock 与 TokenDance 条目，并更新 OpenRouter 与 SiliconFlow 条目。([详情](2026-10-19-registry-vertex-bedrock-tokendance.zh.md), [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261))
- [2026-10-19] MiniMax 客户端与注册表新增 MiniMax-M3.1-Flash。([详情](2026-10-19-minimax-m3-1-flash.zh.md), [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260))
