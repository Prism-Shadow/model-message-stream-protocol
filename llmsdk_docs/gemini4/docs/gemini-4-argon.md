# Gemini 4 Argon

> Source: https://ai.google.dev/gemini-api/docs/models/gemini-4-argon (snapshot 2026-10-14)

- **Model code:** `gemini-4-argon` (stable; October 2026).
- **Context window:** 1,048,576 tokens shared by input and output.
- **Output limit:** 65,536 synchronously; up to the remaining context window with long decode.
- **Input modalities:** Text, Image, Video, Audio, and PDF.
- **Output modality:** Text.
- **Thinking:** `low`, `medium`, `high`; default `medium`.
- **Caching:** Implicit only; explicit caching is unsupported.
- **Supported capabilities:** Function calling, structured outputs, code execution,
  computer use (preview), file search, search grounding, Maps grounding, URL context,
  and agentic video understanding.
- **Consumption options:** Standard, batch, flex, and priority.
- **Unsupported capabilities:** Audio generation, image generation, and Live API.
