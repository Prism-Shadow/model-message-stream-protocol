# Clients are named by their type: official clients per vendor, compatible clients per protocol

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `auto_client`, `registry`, `integration`, `skills`, `docs`
- **Breaking:** yes — the client types were renamed, a model id of no known family no longer routes on its own, and the vendor client folders and classes were renamed

[中文版](2026-09-30-client-types.zh.md)

## What changed

- `AutoLLMClient` creates the client its `client_type` names, from one table. An **official client** speaks its vendor's own API, knows the vendor's models and reads the vendor's key from the environment: `openai-official`, `anthropic-official`, `gemini-official`, `zai-official`, `moonshot-official`, `deepseek-official`, `minimax-official`. A **compatible client** speaks one wire protocol for any endpoint that serves it: `openai-responses`, `openai-chat` (`openai` is an alias), `openai-chat-vllm-adapter`, `openai-embedding`, `ant-messages`, `gemini-generate-content`.
- Without a `client_type`, the family a model id begins with names its official client: `gpt-` and `text-embedding-` route to `openai-official`, `claude-` to `anthropic-official`, `gemini-` to `gemini-official`, `glm-` to `zai-official`, `kimi-` to `moonshot-official`, `deepseek-` to `deepseek-official`, `minimax-` to `minimax-official`, case-insensitively, so a version-free id such as `deepseek-flash` routes as well as `deepseek-v4-pro`. Any other id raises a `ValueError` (an `Error` in TypeScript) that asks for a `client_type` and lists every one. An unknown `client_type` raises the same way. The `CLIENT_TYPE` environment variable still names a client for every constructor that does not.
- `openai-official` serves `text-embedding-*` models through the Embeddings API, and `gemini-official` serves a Vertex AI service-account key through generateContent, so one client type covers each vendor's models whatever the endpoint. The `gemini-interactions` pin is gone: `gemini-official` with any other key is the Interactions API.
- `list_models` on a client named by its type returns the endpoint's whole listing; on a client deduced from a model id, the ids of that family.
- The vendor client folders and classes are named after their client type: `openai_official/OpenAIOfficialClient` (was `gpt6/GPT6Client`), `anthropic_official/AnthropicOfficialClient` (`claude5/Claude5Client`), `gemini_official/GeminiOfficialClient` (`gemini3_8/Gemini3_8Client`), `gemini_generate_content/GeminiGenerateContentClient` (`gemini3_8_generate_content/Gemini3_8GenerateContentClient`), `zai_official/ZAIOfficialClient` (`glm5_3/GLM5_3Client`), `moonshot_official/MoonshotOfficialClient` (`kimi_k3/KimiK3Client`), `deepseek_official/DeepSeekOfficialClient` (`deepseek_v4/DeepSeekV4Client`), `minimax_official/MiniMaxOfficialClient` (`minimax_m3/MiniMaxM3Client`). Each still serves every generation it did, told apart inside the client by explicit version.
- `list_supported_models` reports the new client types in `client`. The playground's built-in `text-embedding-3-large` no longer declares a client type, since its id routes on its own.
- The READMEs, the site, the `mmsp-python` and `mmsp-typescript` skills (their model tables gained a client type column) and the `mmsp-dev` skill describe the client types; the repository's implementation rules now ask for one folder per client type and no routing rule on model ids beyond the family table.

## Compatibility

- Replace the old client types with the new ones: `gpt-6`, `gpt-5.6`, `gpt-5.5`, `gpt-5.4` → `openai-official`; `claude-5`, `claude-4-8`, `claude-4-7`, `claude-4-6` → `anthropic-official`; `gemini-3.8`, `gemini-3.7`, `gemini-3.6`, `gemini-3`, `gemini-embedding`, `gemini-interactions` → `gemini-official`; `glm-5.3`, `glm-5.2`, `glm-5.1` → `zai-official`; `kimi-k3`, `kimi-k2.6`, `kimi-k2.5` → `moonshot-official`; `deepseek-v4` → `deepseek-official`; `minimax-m3` → `minimax-official`. The compatible client types are unchanged. Passing a model id as `client_type` no longer works.
- A model id that begins with no known family, such as a gateway's `moonshotai/kimi-k3` or Amazon Bedrock's `global.anthropic.claude-fable-5`, now needs its `client_type`; before, some routed by a substring of the id. Pass the vendor's official client for a gateway that mirrors the vendor's API, or the compatible client for the protocol the gateway serves.
- Code that imported a vendor client by module path (`mmsp.gpt6`, `@prismshadow/mmsp/dist/claude5`) imports the new path and class name. The packages' public exports are unchanged.
