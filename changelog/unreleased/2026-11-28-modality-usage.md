# Usage split by output modality on the Gemini clients, and Gemini TTS counted on openai-speech

- **Date:** 2026-11-28
- **Type:** feature
- **Scope:** `google_official`, `google_genai`, `openai_speech`, `llmsdk_docs`, `tests`

[中文版](2026-11-28-modality-usage.zh.md)

## What changed

- `google-official` and `google-genai`, in Python and TypeScript, split a response's output by the modality details its usage reports ([MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.md) §5, RFC PR [#365](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/365)): when they list image, video or audio tokens, `response_tokens` is those tokens and `thoughts_tokens` is the thinking plus the rest of the output, the text. A response whose details list no such tokens is counted as before. The split is read from each response, not from the model id.
- `google-official` reads Interactions' `output_tokens_by_modality`; the text is `total_output_tokens` less the media tokens, or the whole of `total_output_tokens` when it is below them, as on `gemini-nano-banana-2.1` streamed with thought summaries, whose `total_output_tokens` leaves the image out.
- `google-genai` reads generateContent's `candidates_tokens_details` / `candidatesTokensDetails`; the text is `candidates_token_count` less the media tokens.
- The `gemini` plugin of `openai-speech` (`gemini-.*tts`, OpenRouter's `google/gemini-3.8-flash-tts` and `google/gemini-3.8-flash-lite-tts`) counts `response_tokens` as ⌈audio seconds × 25⌉ for each response, summed over the messages, the seconds taken from the 16-bit PCM's byte length and the `rate` and `channels` of its content type ([MMSP-RFC-0013](../../design/rfcs/MMSP-RFC-0013-output-priced-by-modality.md) §6). `openai-speech` counts the audio bytes of each response and hands each response's counts to its plugins through `on_wire_event` / `onWireEvent`; `prompt_tokens` stays the UTF-8 byte length of the input, and other models keep `response_tokens` at `0`.
- `llmsdk_docs/gemini_interactions/README.md` and `llmsdk_docs/openrouter_media/README.md` recorded the usage the live APIs reported on 2026-11-28 for Nano Banana, Gemini TTS, Vertex AI's `gemini-3.1-flash-image` and the Gemini API's `gemini-embedding-2`.

## Usage by output modality

| Endpoint | Upstream usage (live) | `thoughts_tokens` | `response_tokens` |
| --- | --- | --- | --- |
| `gemini-nano-banana-2.1`, `google-official`, thought summaries | `total_output_tokens` 193, `image` 1,120, `total_thought_tokens` 898 | 1,091 | 1,120 |
| `gemini-nano-banana-2.1`, `google-official` | `total_output_tokens` 1,253, `image` 1,120, `total_thought_tokens` 0 | 133 | 1,120 |
| `gemini-omni-1.2-flash`, `google-official` | `total_output_tokens` 5,793, `video` 5,793, `total_thought_tokens` 408 | 408 | 5,793 |
| `gemini-3.8-flash-tts`, `google-official` | `total_output_tokens` 68, `audio` 68 | 0 | 68 |
| `gemini-3.1-flash-image`, `google-genai` (Vertex AI) | `candidatesTokenCount` 1,154, `TEXT` 34, `IMAGE` 1,120, `thoughtsTokenCount` 633 | 667 | 1,120 |
| `gemini-3.8-flash-tts`, `google-genai` (Vertex AI) | `candidatesTokenCount` 76, `AUDIO` 76 | 0 | 76 |
| `google/gemini-3.8-flash-tts`, `openai-speech` (OpenRouter) | none; 88,320 bytes of `audio/pcm;rate=24000;channels=1` | `None` | 46 |
