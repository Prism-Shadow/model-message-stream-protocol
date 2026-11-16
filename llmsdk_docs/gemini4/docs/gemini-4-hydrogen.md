# Gemini 4 Hydrogen

> Source: https://aistudio.google.com/docs/models/gemini-4-hydrogen.md (snapshot 2026-11-16)

- **Model code:** `gemini-4-hydrogen` (stable; November 2026).
- **Context window:** 1,048,576 tokens shared by input and output.
- **Output limit:** 65,536 synchronously; up to 1,048,576 with long decode.
- **Input modalities:** Text, Image, Video, Audio, and PDF.
- **Output modality:** Text.
- **Thinking:** `low`, `medium`, `high`, `xhigh`; default `high`.
- **Caching:** Implicit only; explicit caching is unsupported.
- **Supported capabilities:** Function calling, structured outputs, code execution,
  computer use, file search, search grounding, Maps grounding, URL context,
  and agentic video understanding (defaults to static).
- **Consumption options:** Standard, batch, flex, and priority.
- **Unsupported capabilities:** Audio generation, image generation, and Live API.
