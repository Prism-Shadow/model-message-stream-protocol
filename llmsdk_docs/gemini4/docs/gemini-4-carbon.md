# Gemini 4 Carbon

> Source: https://ai.google.dev/gemini-api/docs/models/gemini-4-carbon (snapshot 2026-11-10)

- **Model code:** `gemini-4-carbon` (stable; November 2026).
- **Context window:** 1,048,576 tokens shared by input and output.
- **Output limit:** 65,536 synchronously; up to 1,048,576 with long decode.
- **Input modalities:** Text, Image, Video, Audio, and PDF.
- **Output modality:** Text.
- **Thinking:** `low`, `medium`, `high`; default `medium`.
- **Caching:** Implicit only; explicit caching is unsupported.
- **Supported capabilities:** Function calling, structured outputs, code execution,
  computer use, file search, search grounding, Maps grounding, URL context,
  and agentic video understanding (defaults to static).
- **Consumption options:** Standard, batch, flex, and priority.
- **Unsupported capabilities:** Audio generation, image generation, and Live API.
