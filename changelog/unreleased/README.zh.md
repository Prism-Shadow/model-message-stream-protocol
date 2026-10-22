# 未发布

[English](README.md)

- [2026-10-22] Chat Completions 客户端读取 OpenRouter 的 `reasoning_details`，并把其中的加密片段，即 GPT 加密的推理内容或 Gemini 的思考签名，原样回传（[MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-thinking-round-trip.zh.md)）。([详情](2026-10-22-openai-chat-reasoning-details.zh.md))
- [2026-10-19] 网站新增 `/models/` 模型目录（每一项附带接入代码）和展示每日探测结果的 `/status/` 状态页。([详情](2026-10-19-site-model-catalog.zh.md), [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263))
- [2026-10-19] 每日探测配置的模型通道，把状态、延迟、速度和费用发布到 `status-data` 分支。([详情](2026-10-19-status-probe.zh.md), [#259](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/259))
- [2026-10-19] 模型注册表新增 Google Vertex AI、Amazon Bedrock 与 TokenDance 条目，并更新 OpenRouter 与 SiliconFlow 条目。([详情](2026-10-19-registry-vertex-bedrock-tokendance.zh.md), [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261))
- [2026-10-19] MiniMax 客户端与注册表新增 MiniMax-M3.1-Flash。([详情](2026-10-19-minimax-m3-1-flash.zh.md), [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260))
