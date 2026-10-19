# Registry rows for Google Vertex AI, Amazon Bedrock and TokenDance

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `registry`, `tests`, `ci`, `docs`
- **PR:** [#261](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/261)

[中文版](2026-10-19-registry-vertex-bedrock-tokendance.zh.md)

## What changed

- `list_supported_models()` / `listSupportedModels()` gained three provider sections, identical in Python and TypeScript:
  - Google Vertex AI, `https://aiplatform.googleapis.com` through `google-genai`: `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.1-flash-image`, `gemini-3.1-flash-tts-preview`, `gemini-embedding-2`.
  - Amazon Bedrock, `bedrock://us-east-1` through `anthropic-official`: the Global inference profiles `global.anthropic.claude-fable-5-1`, `-opus-5-5`, `-sonnet-5-5`, `-haiku-5-5`, `-fable-5`, `-opus-5`, `-sonnet-5`, `-opus-4-8`, `-sonnet-4-6`.
  - TokenDance, `https://tokendance.space/gateway/v1`: `deepseek-v4.1-flash-1017`, `deepseek-v4.1-flash` (`deepseek-official`), `deepseek-v4-pro` (`openai-chat`), `minimax-m3` (`minimax-official`), `kimi-k3`, `kimi-k2.6` (`moonshot-official`), `glm-5.3`, `glm-5.3-flash`, `glm-5.2` (`zai-official`), `qwen3.8-flash`, `qwen3.8-max`, `mimo-v2.6-flash`, `step-5-preview`, `hy4-preview` (`openai-responses`), `qwen3.7-text-embedding` (`openai-embedding`); and `minimax-m3.1-flash` through `ant-messages` at `https://tokendance.space/gateway`, since its Chat Completions stream ends in a chunk without `delta`.
- OpenRouter rows were refreshed from the live models API and gained `deepseek/deepseek-v4.1-flash-1017` and `google/gemini-3.8-flash`.
- SiliconFlow rows were refreshed from its pricing page and gained `deepseek-ai/DeepSeek-V4.1-Flash`, `zai-org/GLM-5.3`, `zai-org/GLM-5.3-Flash` and `tencent/Hy4-preview`; `Pro/zai-org/GLM-5.1`, `Pro/moonshotai/Kimi-K2.6` and `Qwen/Qwen3.8-27B` gained prices.
- The registry unit tests construct `bedrock://` entries with an `ACCESS,SECRET` test key.
- `.github/ci/models.json` gained a slow `deepseek-official` case, `deepseek-v4.1-flash` on TokenDance (`provider: tokendance`, `TOKENDANCE_API_KEY`); `pytest.yml` and `jest.yml` pass `TOKENDANCE_API_KEY`.
- The models page and the README list the TokenDance, Vertex AI and Bedrock base URLs and keys, with a Claude on Amazon Bedrock section.

## Registry metadata

| Provider | Source, read 2026-10-19 | Stored price |
| --- | --- | --- |
| Google Vertex AI | https://cloud.google.com/vertex-ai/generative-ai/pricing | Global endpoint list price in USD: Gemini 4 Argon $4 / $20 / $0.2 cached, Gemini 3.8 and 3.7 Flash $1.5 / $7.5 / $0.15, Embedding 2 $0.2 text input. The promotions through 2026-11-30 and 2026-12-31 are not stored. The image and TTS rows carry no price. |
| Amazon Bedrock | https://aws.amazon.com/bedrock/pricing/ and each model card | Global cross-Region table for US East (N. Virginia) in USD, equal to Anthropic's list price; geo profiles cost 10% more. Context windows are 1,000,000 tokens. |
| TokenDance | https://tokendance.space/portal/api/models/all | The catalog's `items` rate in CNY for the row's protocol; weekday peak rates (09:00-12:00, 14:00-18:00 Beijing) on the two DeepSeek V4.1 Flash rows are double. `minimax-m3` carries no price because the catalog lists none for Responses. |
| OpenRouter | https://openrouter.ai/api/v1/models | The quoted price, except where the quoted endpoint runs a discount: then the vendor's own endpoint undiscounted (`google/gemini-3.8-flash`, `z-ai/glm-5.1`), or the quoted endpoint undiscounted (`deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`). |
| SiliconFlow | https://siliconflow.cn/pricing | CNY list price; the DeepSeek Flash rows store the 02:00-08:00 rate, other hours cost double. |
