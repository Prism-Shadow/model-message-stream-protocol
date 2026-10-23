# 未发布

[English](README.md)

- [2026-10-19] TypeScript 中 GLM 与 Kimi K2 的扩展参数送达 API。([详情](2026-10-19-openai-node-extension-keys.zh.md), [#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267))
- [2026-10-19] vLLM 适配器通过 Python SDK 发送 `chat_template_kwargs`。([详情](2026-10-19-vllm-chat-template-kwargs.zh.md), [#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266))
- [2026-10-22] Chat Completions 客户端读取 OpenRouter 的 `reasoning_details`，并把其中的加密片段，即 GPT 加密的推理内容或 Gemini 的思考签名，原样回传（[MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-thinking-round-trip.zh.md)）。([详情](2026-10-22-openai-chat-reasoning-details.zh.md), [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273))
- [2026-10-22] 新增 `IncompleteStreamError`：流在用量或结束原因到达之前结束时，在原本该出现 `stop` 事件的位置抛出，并由 MMSP 服务端转发。([详情](2026-10-22-incomplete-stream-error.zh.md), [#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272))
- [2026-10-22] 流语法测试辅助函数的拼接检查扩展到内联数据、内联思考与嵌入向量，每个 `.done` 内容项都与其片段的拼接比对。([详情](2026-10-22-stream-grammar-joins.zh.md), [#271](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/271))
- [2026-10-22] `@anthropic-ai/sdk` 升至 `^0.91.1`，重新生成 TypeScript 锁文件（`protobufjs` 7.6.6、`ws` 8.22.0、`express` 4.22.3、`jest` 30.5.2、`handlebars` 4.7.10 等），并新增请求体测试。([详情](2026-10-22-dependabot-src-ts.zh.md), [#275](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/275))
- [2026-10-22] 重新生成网站锁文件：`vite` 8.3.5、`source-map-js` 1.2.2、`http-cache-semantics` 4.3.0。([详情](2026-10-22-dependabot-site.zh.md), [#274](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/274))
- [2026-10-22] Anthropic 客户端支持 `anthropic` SDK 2.x：密钥仍放在 `x-api-key`，`ant-messages` 的 `temperature` 改经 `extra_body` 发送，Bedrock 上的 Claude 4.6 沿用旧的请求体版本，CI 用旧版 SDK 重跑离线测试。([详情](2026-10-22-anthropic-sdk-2.zh.md), [#270](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/270))
- [2026-10-19] 网站新增 `/models/` 模型目录（每一项附带接入代码）和展示每日探测结果的 `/status/` 状态页。([详情](2026-10-19-site-model-catalog.zh.md), [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263))
- [2026-10-19] 每日探测配置的模型通道，把状态、延迟、速度和费用发布到 `status-data` 分支。([详情](2026-10-19-status-probe.zh.md), [#259](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/259))
- [2026-10-19] 模型注册表新增 Google Vertex AI、Amazon Bedrock 与 TokenDance 条目，并更新 OpenRouter 与 SiliconFlow 条目。([详情](2026-10-19-registry-vertex-bedrock-tokendance.zh.md), [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261))
- [2026-10-19] MiniMax 客户端与注册表新增 MiniMax-M3.1-Flash。([详情](2026-10-19-minimax-m3-1-flash.zh.md), [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260))
