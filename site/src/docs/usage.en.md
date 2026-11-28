---
description: The four token counts of a response, and how they add up.
---

The `stop` event, the last event of every stream, carries the token counts of the request in `usage_metadata`.

```json
{"cached_tokens": 120, "prompt_tokens": 412, "thoughts_tokens": 31, "response_tokens": 27}
```

| Field | Counts |
| --- | --- |
| `cached_tokens` | Input tokens read from the provider's cache |
| `prompt_tokens` | Input tokens that were not cached |
| `thoughts_tokens` | Output tokens spent on thinking |
| `response_tokens` | Output tokens of the answer |

## Totals

```text
input_tokens  = cached_tokens + prompt_tokens
output_tokens = thoughts_tokens + response_tokens
total_tokens  = input_tokens + output_tokens
```

A count the provider does not report is null. Treat it as zero.

## Where to read it

Read the counts from the `stop` event, once. `delta` events carry null, and nothing needs adding up across events.

The assistant message the stateful call records carries the same `usage_metadata`, so a stored history keeps the cost of every turn.

A response that raised `EmptyResponseError` still spent tokens. The error carries its `usage_metadata`. `IncompleteStreamError` carries the `usage_metadata` that arrived before the stream was cut short, or null.

## Multimodal and non-token billing

Non-chat endpoints — image generation, video generation, speech synthesis, speech recognition, embeddings, and web search/fetch — report their billed units in the same four fields of `usage_metadata`, and `list_supported_models` (`listSupportedModels` in TypeScript) prices each of the four, on every entry, per million of those units. The cost of a turn is:

```text
cost = (
  cached_tokens     * pricing.cached_tokens
  + prompt_tokens   * pricing.prompt_tokens
  + thoughts_tokens * pricing.thoughts_tokens
  + response_tokens * pricing.response_tokens
) / 1_000_000
```

A null count reads as zero. Where the platform publishes no cache-hit price, `pricing.cached_tokens` is the input price, and where the vendor lists no rate of its own for thinking, `pricing.thoughts_tokens` is the output price.

| Modality and client | `usage_metadata` | `pricing` in `list_supported_models` |
| --- | --- | --- |
| Text, vision, and reasoning (`openai-official`, `anthropic-official`, `google-official`, `deepseek-official`, `moonshot-official`, `zai-official`, `minimax-official`, `openai-responses`, `openai-chat`, `ant-messages`, `google-genai`) | `cached_tokens`, `prompt_tokens`, `thoughts_tokens`, and `response_tokens` report the provider's token counts. | `pricing.thoughts_tokens` and `pricing.response_tokens` both hold the output token rate. |
| Image generation (`google-official`, `google-genai`, `openai-image`, and `openai-official` for `gpt-image-*`) | `prompt_tokens` reports the input tokens. When the upstream splits the output tokens by modality and some are image tokens, `response_tokens` counts the image tokens alone and `thoughts_tokens` the thinking and the text; otherwise `response_tokens` counts the output. A model billed per image (`openai-image` on TokenDance, and OpenRouter's `bytedance-seed/seedream-*`) counts `1,000` `response_tokens` per generated image, and `0` `prompt_tokens` where the endpoint bills no input. | `pricing.response_tokens` is the image-output rate ($30/1M on `gemini-nano-banana-2.1`), and `pricing.thoughts_tokens` the vendor's text-output rate ($7.50/1M there). On a per-image model, `pricing.response_tokens` is the price of one image × 1,000 (¥0.22 → ¥220/1M on TokenDance's `seedream-5.0-lite`). |
| Video generation (`gemini-omni-1.2-flash` on `google-official`) | `prompt_tokens` reports the input, `thoughts_tokens` the thinking and any text, and `response_tokens` the video output tokens (5,792 per second at the default 720p). | `pricing.thoughts_tokens` is the text-output rate ($9/1M), `pricing.response_tokens` the video-output rate ($12/1M). |
| Speech synthesis (`openai-speech`) | `/audio/speech` streams raw audio bytes without a usage header: MMSP records the UTF-8 byte length of the input text in `prompt_tokens`. `response_tokens` is `0`, except on Gemini TTS models (`google/gemini-3.8-flash-tts`, `google/gemini-3.8-flash-lite-tts`), where it is `ceil(audio seconds * 25)`, Google's 25 audio tokens per second. | `pricing.prompt_tokens` is the price per million UTF-8 bytes (e.g. `fish-audio/drama-3`), and on Gemini TTS the text-input token rate, with the audio-output token rate in `pricing.response_tokens` ($18/1M on `google/gemini-3.8-flash-tts`). |
| Speech synthesis (`deepseek-speech`, and `deepseek-official` for `deepseek-tts`) | DeepSeek bills per character, counting each Han ideograph (CJK Unified and Compatibility Ideographs, Extensions A–J) as 2 characters and every other character as 1: MMSP records the billed character count in `prompt_tokens` and `0` in `response_tokens`. | `pricing.prompt_tokens` is the price per million billed characters (¥300/1M = ¥3 per 10,000 characters). |
| Speech synthesis (Gemini TTS on `google-official` and `google-genai`) | `prompt_tokens` and `response_tokens` report the text input and audio output tokens returned by Interactions or generateContent. | `pricing.prompt_tokens` is the text-input rate, `pricing.response_tokens` the audio-output rate ($18/1M on `gemini-3.8-flash-tts`). |
| Speech recognition (`openai-transcription`, `deepseek-transcription`, `openai-official` for `gpt-transcribe`, and `deepseek-official` for `deepseek-asr`) | Billed by audio duration in whole seconds, any fraction rounded up (`ceil(seconds)` on `openai-transcription`, `ceil(duration_ms / 1000)` on `deepseek-transcription`): MMSP records the billed seconds in `prompt_tokens` and `0` in `response_tokens`. | `pricing.prompt_tokens` is the price per million seconds (`per_second_rate * 1_000_000`, e.g. $75/1M = $0.0045/min on `gpt-transcribe`, $100/1M = $0.0001/s on `fish-audio/transcribe-1`, ¥216.67/1M = ¥0.78/hour on DeepSeek `deepseek-asr`, ¥110/1M = ¥0.00011/s on TokenDance `deepseek-asr`). |
| Embeddings (`openai-embedding`, `google-official`, `google-genai`, and `openai-official` for `text-embedding-*`) | `prompt_tokens` reports the input token count (`response_tokens` is `0` or null). | `pricing.prompt_tokens` is the price per million input tokens; `pricing.thoughts_tokens` and `pricing.response_tokens` are `0`. |
| Web search and page fetch (`jina-webtool`) | `prompt_tokens` reports the tokens Jina bills for the request (a flat 10,000 for a search, the page's tokens for a read); `response_tokens` is null. | `pricing.prompt_tokens` is Jina's price per million tokens ($0.05/1M). |
| Web search and page fetch (`deepseek-webtool`, and `deepseek-official` for `deepseek-search` and `deepseek-fetch`) | Billed per request rather than per token: MMSP counts each request as `1,000` in `prompt_tokens` (`response_tokens` is null). | `pricing.prompt_tokens` (per million prompt tokens) equals the price of 1,000 requests (¥5/1M = ¥5 per 1,000 requests). |
