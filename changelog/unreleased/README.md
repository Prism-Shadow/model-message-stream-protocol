# Unreleased

[中文版](README.zh.md)

- [2026-10-22] `openai-chat-vllm-adapter` read `VLLM_API_KEY` and `VLLM_BASE_URL` instead of the OpenAI pair, defaulted to `http://127.0.0.1:8000/v1`, and called its server keyless without a key. ([details](2026-10-22-vllm-credentials.md))
- [2026-10-19] Added the model catalog at `/models/` with an integration kit per entry, and the status page at `/status/` for the daily probe. ([details](2026-10-19-site-model-catalog.md), [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263))
- [2026-10-19] Probe the configured model channels daily and publish their status, latency, speed and cost to the `status-data` branch. ([details](2026-10-19-status-probe.md), [#259](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/259))
- [2026-10-19] Added Google Vertex AI, Amazon Bedrock and TokenDance rows to the model registry and refreshed the OpenRouter and SiliconFlow rows. ([details](2026-10-19-registry-vertex-bedrock-tokendance.md), [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261))
- [2026-10-19] Added MiniMax-M3.1-Flash to the MiniMax client and the registry. ([details](2026-10-19-minimax-m3-1-flash.md), [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260))
