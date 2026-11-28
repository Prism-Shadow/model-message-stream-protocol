# MMSP-RFC-0013 Output Priced by Modality

- Feature Name: `modality_prices`
- Start Date: 2026-11-28
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: change
- Supersedes: [MMSP-RFC-0012](MMSP-RFC-0012-thinking-priced-as-output.md)

[中文版](MMSP-RFC-0013-output-priced-by-modality.zh.md)

## Abstract

Every registry row is priced, and its **`ModelPricing`** holds **four required prices per million**, one for each usage bucket (`cached_tokens`, `prompt_tokens`, `thoughts_tokens`, `response_tokens`), so a turn costs **the sum of each count times its price**. On a response whose upstream splits its output by modality, the **thinking and the text are counted in `thoughts_tokens`** and the **image, video or audio tokens alone in `response_tokens`**, and every quantity a platform bills is counted, **by a documented rule** where the endpoint reports none.

## 1. Introduction

- **Two output prices on one answer**: Google lists `gemini-nano-banana-2.1` at $1.50 input, $7.50 text output and thinking, and $30 image output (read 2026-11-19), and `gemini-omni-1.2-flash` at $9 text output against $12 video output (read 2026-11-06); OpenRouter quotes `google/gemini-nano-banana-2.1` at $7.50 `completion` and $30 `image_output` (read 2026-11-19). With one output price ([MMSP-RFC-0012](MMSP-RFC-0012-thinking-priced-as-output.md)), the thinking and the text of those answers were billed at the image or video rate.
- **Owner decision, 2026-11-28, on modalities**: The text and the thinking share one price, so they share one bucket, and the media output takes the other ("对于输出价格不同模态不一样的模型，把推理和输出的文本都可以归并到推理 token，图片或者视频单列输出 token。MMSP 先读取上游的模态明细，再把同价的正文文本和推理合到 thoughts_tokens，把图片或视频单独放进 response_tokens。这样就可以表示模态的价格了。").
- **Rows without a price**: At dev [fe517a8](https://github.com/Prism-Shadow/model-message-stream-protocol/commit/fe517a8) (2026-11-28), fourteen rows had no `pricing`: Google's `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts` and `gemini-embedding-2`; OpenRouter's `google/gemini-3.8-flash-tts` and `google/gemini-3.8-flash-lite-tts`, billed by audio output tokens that `/audio/speech` does not report; SiliconFlow's `Qwen/Qwen3-Embedding-8B`; Vertex AI's `gemini-3.1-flash-image` and `gemini-3.8-flash-tts`; TokenDance's `minimax-m3`; and ModelScope's `deepseek-ai/DeepSeek-V4.1-Flash`, `Qwen/Qwen3.8-27B` and `Qwen/Qwen3.8-Flash-Next`. A consumer could not price a turn of any of them.
- **Owner decision, 2026-11-28, on prices**: No price is left out, embeddings are priced on input, and the Model Index shows four tiers ("而且 MMSP 的索引必须表示清楚模型价格，不能省略。比如 TTS、image、embedding 也要有价格，embedding 的放 input 里面。"; "模型索引的价格列也应该写缓存、输入、推理、输出四档价格。"; "MMSP 的义务目前也包括必须让下游知道模型的token量,以及快速获取费用,所以费用不能空.").
- **Per-image prices stored per token**: TokenDance bills its image models per image (`qwen-image-2.1-turbo` ¥0.1 and `qwen-image-2.1-pro` ¥0.25, read 2026-11-28; `seedream-5.0-lite` ¥0.22, read 2026-11-04), and so does OpenRouter for `bytedance-seed/seedream-5-5` ($0.02, read 2026-11-16) and `bytedance-seed/seedream-5-0-flash` ($0.018, read 2026-11-04). The registry stored each per-image price over the tokens of one size (16,384 for TokenDance's 2048x2048, about 4,096 for OpenRouter's 1K), so a larger image computed at several times its flat price.
- **Why this supersedes MMSP-RFC-0012**: MMSP-RFC-0012 ([#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359)) and its implementation ([#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360)) removed the `thoughts_tokens` price on 2026-11-20. Neither was released: 0.5.12 still carried the key. This RFC restores the key and gives it the text of media responses, which reverses MMSP-RFC-0012's one rule, so it replaces that RFC whole.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Usage buckets**: The four counts of a `stop` event's `usage_metadata`: `cached_tokens`, `prompt_tokens`, `thoughts_tokens` and `response_tokens` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5).
- **Price**: A registry row's `pricing.<bucket>`, per million counts of that bucket, in the currency `list_supported_models` / `listSupportedModels` was asked for.
- **Modality details**: The part of an upstream's usage that splits the output tokens by modality, such as Interactions' `output_tokens_by_modality`, generateContent's `candidates_tokens_details`, and the `image_tokens` / `audio_tokens` of OpenAI-style `output_tokens_details` / `completion_tokens_details`.
- **Media output tokens**: The image, video and audio output tokens that the modality details report.
- **Billed quantity**: A unit a platform charges for on a request: tokens, images, UTF-8 bytes, characters, seconds or requests.

## 3. The Four Prices

- **Four required keys**: `ModelPricing` (`src_py/mmsp/registry.py`, `src_ts/src/registry.ts`) MUST hold `currency` and four required prices: `cached_tokens`, `prompt_tokens`, `thoughts_tokens` and `response_tokens`. `list_supported_models` / `listSupportedModels` MUST return all four on every row, in USD and in CNY.
- **Every row priced**: Every registry row MUST carry `pricing` with all four keys; a row without a price MUST NOT be added.
- **What each key stores**:

| Key | Stores | Where the platform publishes no such price |
| --- | --- | --- |
| `cached_tokens` | The cache-hit input price. | The input price: a cached token is billed as input. |
| `prompt_tokens` | The non-cached input price. | — |
| `thoughts_tokens` | The price of thinking and of text output. | The output price. |
| `response_tokens` | The output price; on a row whose output is image, video or audio, the price of that output (§5). | — |

- **Embeddings**: An embedding row MUST be priced on `prompt_tokens`, the input, and MUST store `0` in `thoughts_tokens` and `response_tokens`.
- **Free endpoints**: A row on an endpoint that bills nothing (ModelScope API-Inference, a self-hosted vLLM server) MUST store `0` in every key, and its comment MUST say so.

## 4. The Cost of a Turn

A turn's cost, in the currency of the prices, is:

```text
cost = ( cached_tokens   × pricing.cached_tokens
       + prompt_tokens   × pricing.prompt_tokens
       + thoughts_tokens × pricing.thoughts_tokens
       + response_tokens × pricing.response_tokens ) / 1,000,000
```

- **Null counts**: A count that is `None` / `null` MUST read as `0`.
- **One formula everywhere**: Every consumer in this repository MUST state and compute the cost so, and MUST NOT price one bucket at another's price: the status probe (`.github/status/probe.py`), the `pricing` note of `/models.json` (`site/src/pages/models.json.ts`), the usage docs (`site/src/docs/usage.en.md` / `usage.zh.md`) and the skills (`skills/mmsp-python/`, `skills/mmsp-typescript/`, `.agents/skills/mmsp-dev/`).

## 5. Output by Modality

- **Split per response**: When a response's modality details report media output tokens, the client MUST count `response_tokens` as those media output tokens alone, and `thoughts_tokens` as the thinking tokens plus the text output tokens.
- **Otherwise unchanged**: A response without modality details, or whose modality details report no media output tokens, MUST be counted as before: `thoughts_tokens` = the thinking tokens, `response_tokens` = the text.
- **Read from the upstream**: The split MUST come from the modality details the upstream reports for that response, not from the model id.
- **Prices of a media row**: A row whose output is image, video or audio MUST store the vendor's text-output rate in `thoughts_tokens` where the vendor lists one, else its output price, and the media output price in `response_tokens`:

| Row | Client | `thoughts_tokens` | `response_tokens` |
| --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | `google-official` | $7.50 (text output and thinking) | $30 (image output) |
| `google/gemini-nano-banana-2.1` | `openai-image` (OpenRouter) | $7.50 (`completion`) | $30 (`image_output`) |
| `gemini-omni-1.2-flash` | `google-official` | $9 (text output) | $12 (video output) |

## 6. Every Billed Quantity Counted

- **No null for a billed quantity**: A client MUST count every quantity its row's platform bills, and the bucket that holds it MUST NOT be `None` / `null`. A bucket that holds nothing the platform bills (such as `cached_tokens` on an endpoint without a prompt cache) stays `None` / `null` where the endpoint does not report it.
- **One unit per bucket**: A count MUST be in the unit its price is per, so that §4 gives the bill.
- **Derived counts**: Where the endpoint reports no count of a billed quantity, the client MUST derive one by a rule of the table below ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#32-streaming-everything) §3.2):

| Billing | Where | Count | Price stored |
| --- | --- | --- | --- |
| **Per image** | `openai-image` on TokenDance (every model on its `openai:image-generations` protocol) and on OpenRouter's `bytedance-seed/seedream-*` | `response_tokens` = 1,000 per generated image, whatever tokens the gateway reports; `prompt_tokens` = `0` where the endpoint bills no input. | The per-image price × 1,000 in `response_tokens` (¥0.1 → ¥100, ¥0.25 → ¥250, ¥0.22 → ¥220, $0.02 → $20 per million). |
| **Audio tokens of Gemini TTS** | `openai-speech` through its `gemini` plugin (`gemini-.*tts`) | `response_tokens` = ⌈audio seconds × 25⌉, Google's published 25 audio tokens per second (`llmsdk_docs/gemini4/docs/pricing.md`), the seconds computed from the PCM byte length and the `rate` and `channels` of its MIME type (16-bit samples); `prompt_tokens` stays the UTF-8 byte length of the input. | The audio output price per token in `response_tokens`; the text input price per token in `prompt_tokens`. |
| **UTF-8 bytes** | `openai-speech` | `prompt_tokens` = the UTF-8 byte length of the input. | Per million bytes. |
| **Billed characters** | `deepseek-speech` | `prompt_tokens` = the characters DeepSeek bills (Han = 2, other = 1). | Per million characters. |
| **Seconds** | `openai-transcription`, `deepseek-transcription` | `prompt_tokens` = the audio seconds, rounded up to a whole second. | Per million seconds. |
| **Per request** | `deepseek-webtool` | `prompt_tokens` = 1,000 per request the endpoint bills, `0` per request it does not. | The price of 1,000 billed requests. |

## 7. The Model Index

- **Four columns**: The Model Index (`/models/`, `site/src/components/ModelCatalog.astro`) MUST show every row's four prices in the order Cached / Input / Thinking / Output (缓存 / 输入 / 推理 / 输出), that is `cached_tokens`, `prompt_tokens`, `thoughts_tokens`, `response_tokens`.
- **`/models.json`**: MUST carry all four keys on every row, and its `pricing` note MUST state the formula of §4.

## 8. Drawbacks

- **A text-only answer of a media model**: The split is decided per response, so a `gemini-nano-banana-2.1` answer that returns text alone keeps its text in `response_tokens` and is billed at $30 per million rather than $7.50. This is recorded, not fixed.
- **`thoughts_tokens` holds text on media responses**: A caller that reads `thoughts_tokens` as thinking alone over-reads on those responses, and one that reads `response_tokens` as the whole answer under-reads; the whole output of a turn stays `thoughts_tokens + response_tokens`.
- **Per-image counts are not tokens**: A per-image response counts 1,000 whatever its size, so token throughput computed from it (the status probe's tokens per second) measures images, not the gateway's tokens.
- **Estimated speech**: The Gemini TTS count on `openai-speech` is computed from the audio length, not read from a bill, and its input is counted in UTF-8 bytes but priced per token, so the input cost computed is above the bill.
- **Input stays one price**: A reference image is input, priced at `prompt_tokens`. Where a vendor prices image input apart, the cost computed is below the bill: OpenAI lists `gpt-image-2.6-sunburst` image input at $8 per million against $5 for text (`llmsdk_docs/openai_images/`).

## 9. Rationale and Alternatives

- **Reuse `thoughts_tokens` rather than add an image-price key**: A fifth price would need a fifth usage count that every client and consumer carries and that few rows set. The vendors that price media apart list thinking and text output at one rate, so merging the two loses nothing, and `ModelPricing` stays keyed one-to-one by the usage buckets.
- **Split per response rather than per model**: A per-model trigger would price a media model's text-only answer at the text rate, but it needs a list of media models in every client's usage code, read from the model id ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#61-explicit-matching) §6.1), and it miscounts any model the list misses. The modality details come with the response, so the split works on every model whose upstream reports them, new ones included.
- **Estimate Gemini TTS rather than omit its price**: An omitted price leaves a billed row that no consumer can price, which §3 forbids. Google states its TTS prices with the same rate (25 tokens a second makes $9 per million $0.00225 per 10 s of audio).
- **1,000 per image rather than the gateway's tokens**: The gateway's tokens grow with the image size while a per-image bill does not. Counting 1,000 per image extends the per-request rule of [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#32-streaming-everything) §3.2 ([#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)), so a price per million reads as the price of 1,000 images.
- **Default rather than omit `cached_tokens` and `thoughts_tokens`**: Every consumer computes with four prices and needs no fallback of its own; the defaults are what the platform bills when it lists no other rate.
- **Edit MMSP-RFC-0012 in place**: Would leave one RFC holding a rule and its reversal; replacing a decision whole is a new RFC that supersedes the old one ([design/README.md](../README.md)).
