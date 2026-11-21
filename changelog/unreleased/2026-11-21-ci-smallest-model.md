# The live tests run only the smallest newest-generation model on each official endpoint

- **Date:** 2026-11-21
- **Type:** process
- **Scope:** `ci`
- **PR:** [#363](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/363)

[中文版](2026-11-21-ci-smallest-model.zh.md)

## What changed

- `.github/ci/models.json` dropped `gpt-6.2-sol` and `gpt-6.1-terra` from `openai-official` and `claude-sonnet-5-5` from `anthropic-official`. Their official endpoints kept one text case each, `gpt-6-luna` and `claude-haiku-5-5`, the smallest model of the vendor's newest generation; Bedrock kept `global.anthropic.claude-sonnet-4-6`, the only model its key reaches.
- The other official endpoints already carried one such model: `gemini-4-hydrogen`, `glm-5.3-flash`, `MiniMax-M3.1-Flash`, `deepseek-flash` and `kimi-k3.1-pro`. The image, TTS, transcription, video, embedding and web tool cases, the compatible-client and gateway cases, and the `slow` cases stayed as they were.
- `.github/ci/README.md` stated the rule under "Model catalog", linking MMSP-RFC-0002.
