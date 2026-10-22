# Unreleased

[中文版](README.zh.md)

- [2026-10-22] The Chat Completions client read OpenRouter's `reasoning_details` and replayed the encrypted fragment, GPT's encrypted reasoning or Gemini's thought signature, as received ([MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-thinking-round-trip.md)). ([details](2026-10-22-openai-chat-reasoning-details.md))
- [2026-10-19] Added the model catalog at `/models/` with an integration kit per entry, and the status page at `/status/` for the daily probe. ([details](2026-10-19-site-model-catalog.md), [#263](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/263))
- [2026-10-19] Probe the configured model channels daily and publish their status, latency, speed and cost to the `status-data` branch. ([details](2026-10-19-status-probe.md), [#259](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/259))
- [2026-10-19] Added Google Vertex AI, Amazon Bedrock and TokenDance rows to the model registry and refreshed the OpenRouter and SiliconFlow rows. ([details](2026-10-19-registry-vertex-bedrock-tokendance.md), [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261))
- [2026-10-19] Added MiniMax-M3.1-Flash to the MiniMax client and the registry. ([details](2026-10-19-minimax-m3-1-flash.md), [#260](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/260))
