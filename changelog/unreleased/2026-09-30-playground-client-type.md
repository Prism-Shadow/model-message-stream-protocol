# The playground picks the client type and base URL with the model

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `integration`
- **PR:** [#229](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/229)

[中文版](2026-09-30-playground-client-type.zh.md)

## What changed

- A Client Type dropdown sits next to Model in both playgrounds: Auto, which lets the model id name the client, then the official and the compatible clients, each with its vendor or protocol.
- Picking a model sets the client type its id names and fills Base URL with the endpoint that client reaches: the environment's (`OPENAI_BASE_URL` and the like) or the vendor's own. Changing the client type moves an untouched base URL to the new type's endpoint; a base URL typed over it stays, and each model keeps its own edits.
- The base URL filled in is left out of requests, so the environment's key keeps working; only a base URL typed over it is sent.
- List models adds the listed ids with the current client type and base URL.
- The built-in models are GPT-6.1 Sol, Text Embedding 3 Large, Gemini 3.8 Flash, Gemini 3.1 Flash Image, Gemini 3.8 Flash TTS, Gemini Embedding 2, Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, GLM 5.3 Flash, Kimi K3, MiniMax M3 and DeepSeek Flash.
- `MODEL_FAMILIES` is exported from `mmsp.auto_client` and `autoClient`, the table the playground reads the families from.
