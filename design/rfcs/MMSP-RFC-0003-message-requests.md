# MMSP-RFC-0003 Message Requests

- Feature Name: `message_requests`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316), [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318), [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330), [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339), [#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349)
- Kind: spec

[中文版](MMSP-RFC-0003-message-requests.zh.md)

## Abstract

A message request is the only way a model is called: an asynchronous `UniEvent` stream produced by **`streaming_response`** or **`streaming_response_stateful`** under one base-class grammar—a sequence of **`delta`** events (one item per event) followed by exactly one **`stop`** event carrying usage and finish reason. Every **`ThinkingLevel`** works on every client, and every other **`UniConfig`** value is either mapped explicitly or rejected before the request goes out.

## 1. Introduction

- **Async stream closed by the base class**: Hosts MUST NOT block their event loop on a provider, and callers MUST NOT mistake a truncated stream for a complete answer. Before the v2 stream protocol ([#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)), each client closed its own items ([#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)); after a GLM-5.3-Flash CI stream ended without its final usage+finish chunk on 2026-10-22 ([run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)), [#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272) made a missing `stop` raise so callers can retry.
- **Universal `ThinkingLevel` & explicit parameter matching**: Callers set `ThinkingLevel` once and switch models by name ([#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) clamped Gemini levels, [#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) mapped `max` per vendor, [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) stopped Claude Opus 5 thinking on `none`, [#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) disabled thinking on `none` for Kimi K3). Fuzzy model matching sends one generation another's parameters ([#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) rewrote the configuration matrix from both language transforms).
- **Origin & earlier numbering**: Enforces the core rules *support all thinking levels*, *no fuzzy parameter matching*, and *async streaming with exact parameters* (numbered as MMSP-RFC-0003/0004/0006/0010 in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) and MMSP-RFC-0003/0005/0010/0011 in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)).

| Date / PR | Change & Reason |
| --- | --- |
| 2026-11-02 ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)) | **Web search & fetch (`webtool`)**: DeepSeek Search/Fetch and Jina Search/Reader answer in one JSON (Jina's event stream resends the full page on load, so JSON is used); searches request summary only (`no content` on Jina, no `need content`). Amended §2 (`webdata`), §3.2, §6.1 (`-search`, `-fetch`), and §6.3. |
| 2026-11-02 ([#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313)) | **GPT-6.1 Terra & GPT-6 fixes**: Added native `none` effort on Terra (unlike GPT-6 Astra / GPT-6.1 Sol), fixed `tool_choice` list missing `type` (400 error on OpenAI/OpenRouter), extended `detail: "high"` (>30,000 patches) from GPT-5.6 to GPT-6, and mapped `enhance` to 12h cache TTL on GPT-5.6+ (refused on GPT-5.5). Amended §6.1, §6.3, and §6.4. |
| 2026-11-04 ([#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)) | **OpenAI media clients (`openai-image`, `openai-speech`, `openai-transcription`)**: Served by OpenAI, OpenRouter, and TokenDance. Image reads single JSON; speech streams audio bytes (~0.7 s TTFB); transcription reads single JSON. Mapped `image_config` to 1K/2K `size`, `tts_config` to `voice`, and per-modality usage (tokens, UTF-8 bytes for Fish Audio, audio seconds). Amended §3.2, §5, §6.3, and §6.4. |
| 2026-11-06 ([#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)) | **Gemini Omni video generation**: Gemini Omni 1.2 Flash on Interactions API returns a single MP4+audio stream delta (or URI as URI; multi-turn editing excluded) with Google defaults (16:9, 720p, 10s). Omni accepts only `low`/`high` thinking and counts video tokens against `max_output_tokens`. Amended §6.1 (`gemini-omni`), §6.2 (unsent `max_tokens`), and §6.3. |
| 2026-11-11 ([#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)) | **Compatible-client plugins & Mistral reasoning**: Moved vendor/endpoint-specific compatible-client logic into plugins ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#9-plugins) §9), including Mistral `reasoning_effort` ([#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322), [#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323): opt-in reasoning, no `medium`, gated by model list). Amended §6.1 and §6.3. |
| 2026-11-16 ([#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)) | **`video_config`, DeepSeek TTS/ASR & Gemini 4 Hydrogen**: Added `video_config` (`aspect_ratio`, `resolution`, `duration`; `4K` sent as `4k`) and renamed `image_config.image_size` to `resolution`; added streaming raw-PCM `deepseek-speech` (~1 s TTFB) and JSON `deepseek-transcription` (16-bit PCM WAV or Ogg Opus); added Gemini 4 Hydrogen levels (accepts `xhigh`, refuses `minimal`/`max`). Amended §3.2, §6.2, §6.3, and §6.4. |
| 2026-11-17 ([#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)) | **Per-request billing counted as 1,000 tokens**: A request billed by the request counts as `1,000` prompt tokens ("按次收费的都算1次为1000token吧,这样价格就正常一些") so DeepSeek Search/Fetch (¥5 per 1,000 requests) is priced at ¥5/M tokens rather than ¥5,000/M while keeping per-request cost unchanged (§3.2). |
| 2026-11-17 ([#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)) | **Tool-call `arguments` kept as JSON text**: Kept `tool_call.arguments` as the model's JSON text ("UniMessage的工具参数还是保留字符串类型吧") after `9007199254740993` turned into `9007199254740992` on parse; `StreamItems` and pre-request validation check that it parses as a JSON object while keeping the text (§3.3, §4.3). |
| 2026-11-19 ([#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349)) | **Gemini Nano Banana 2.1 thinking levels**: `gemini-nano-banana-2.1` accepts `minimal`, `medium`, and `high` (refusing `low`, `xhigh`, and `max`); `google-official` and `google-genai` map `"gemini-nano-banana"` models to `("minimal", "medium", "high")` with ties rounding up (`low` → `medium`). Amended §6.1 and §6.3. |

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Client stream**: the events a client's `_streaming_response_internal` / `_streamingResponseInternal` yields.
- **Public stream**: the events the base class yields to the caller.
- **Fragment** & **complete item**: as defined in [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#2-conventions-and-terminology) §2.
- **Growing field**: the one field a kind's fragments extend (`text`, `thinking`, `arguments`, `data`, `embedding`, `webdata`).
- **Official client** & **compatible client**: as defined in [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#2-conventions-and-terminology) §2.
- **Generation**: the models of a vendor that take the same request (`"4-6"`, `"gpt-6"`).

## 3. The Call

### 3.1 Two entry points

A model MUST be called only through `streaming_response` and `streaming_response_stateful` (`streamingResponse` and `streamingResponseStateful` in TypeScript), asynchronous generators of `UniEvent`. There is no synchronous or whole-response call; `list_models` is the only other endpoint request ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#5-listing-models) §5).

### 3.2 Streaming everything

A client MUST read the provider's streaming endpoint wherever the provider has one. Non-chat endpoints follow the rules below, followed by one `stop` event with `finish_reason: "stop"` and the summed usage:

| Endpoint | Request & Streaming | Output Item & Format | Usage in `stop` |
| --- | --- | --- | --- |
| **Embedding** (`openai-embedding`, etc.) | Non-streaming JSON; `openai-embedding` pairs each vector with its input by `index`. | One `embedding` item per vector. | `prompt_tokens` = reported input count. |
| **Web tools** (`-search`, `-fetch`) | One JSON request per message (joined text items = query/URL); Jina's full-page-resend event stream is not a stream and MUST NOT be used. Search MUST ask for summary only, MUST NOT ask for page body. | One `webtool` item per answer as it arrives (empty searches included). | `prompt_tokens` = reported tokens summed, or `1,000` per request when billed per request (so price per 1M tokens equals the price of 1,000 requests). |
| **Image generation** (`openai-image`) | One JSON request per message (joined text items = prompt); MUST NOT ask for `stream` or send `response_format`. | Image read from `b64_json`, else downloaded from `url` without credentials ([MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md#7-links-in-an-answer) §7). MIME = `media_type`, else `image/<output_format>`, else sniffed from bytes. | `prompt_tokens` = `input_tokens` or `prompt_tokens`; `response_tokens` = `output_tokens` or `completion_tokens` (unreported stays `None`). |
| **Speech (TTS)** (`openai-speech`, `deepseek-speech`) | One streaming request per message (joined text items = input). `openai-speech` omits `response_format`; `deepseek-speech` sends `format: "pcm"` and omits `filter_markdown`. | Each chunk yielded as an `inline_data` fragment of the message's single speech item. Headerless `audio/pcm` goes out in whole frames ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#34-content-items) §3.4) as `audio/l16; rate=<rate>; channels=<channels>`; other formats keep `content-type`. | `prompt_tokens` = UTF-8 byte length (`openai-speech`) or billed characters (`deepseek-speech`: Han = 2, other = 1); `response_tokens` = `0`. |
| **Transcription (ASR)** (`openai-transcription`, `deepseek-transcription`) | One JSON request per message (single audio `inline_data` item). `openai-transcription` sends multipart `file` (MIME extension) + `model` (no `prompt`); `deepseek-transcription` sends `file` only (WAV/Ogg Opus as-is; headerless `audio/l16` or `audio/pcm` wrapped in WAV from MIME rate/channels). | One `text` item per message. | `prompt_tokens` = `usage.seconds` or `duration_ms` in seconds rounded up to a whole second; `response_tokens` = `0`. |

- **Input validation on media endpoints**: Non-text items on image/speech raise `UnsupportedContentError`. On transcription, non-audio items raise `UnsupportedContentError`, a second audio item raises `InvalidMessageError`, and headerless PCM without a `rate` in its MIME type raises `InvalidMessageError`.

### 3.3 Before the request

Before sending, `streaming_response`:
- **Stamps `created_at`** on any message lacking it ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#63-created_at) §6.3).
- **Converts legacy item types** ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7).
- **Validates sendable content & tool-call arguments**: An empty message, one the client's transform cannot send (e.g. thinking alone), or one holding a tool call whose `arguments` is not the JSON text of an object MUST raise `InvalidMessageError` with `message_index` before the request goes out ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1).

## 4. The Stream Grammar

### 4.1 What a client yields

- **Deltas only**: A client stream MUST yield one `UniEvent` per provider event—deltas only, never a complete item. `stop` events carry usage and finish reason (possibly across pieces); `delta` events carry neither.
- **Empty, end-of-item, and unknown events**: A wire event without universal content yields an empty delta; an end-of-item event closes nothing and yields only new fields (e.g. reasoning `fidelity`). Unrecognized events MUST be skipped (or raise `UnknownEventError` when `MMSP_DEBUG` is set).
- **Wire-completed items**: A client receiving a completed item on the wire (e.g. MiniMax tool calls) yields it as a single fragment and MUST NOT also yield its deltas.

### 4.2 What the base class does

- **Closes items via `StreamItems`**: Handed each delta, `StreamItems` (`stream_items.py` / `streamItems.ts`) closes each item with its complete item when the next item starts or the client stream ends.
- **Merges `stop` metadata**: Merges client `stop` events field-by-field into the single public `stop` (later counts replace earlier ones, `0` stays `0`, unreported counts stay `None`, and counts need not be numbers).

### 4.3 Items

- **Contiguous, non-interleaving**: Every item streams as contiguous fragments followed by its single complete item; items MUST NOT interleave.
- **Built from fragments**: `StreamItems` joins the growing field, keeps tool-call `arguments` as the joined JSON text itself (or `{}` when fragments join to nothing) after checking that it parses as a JSON object ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#34-content-items) §3.4), takes other fields from the first fragment, and copies `fidelity` (at most one fragment carries `fidelity`, repeated on the complete item).

### 4.4 The assistant message

The ordered complete items plus the `stop` event's `usage_metadata` and `finish_reason` form the assistant message, copied onto it by `concat_uni_events_to_uni_message`, stateful history, and the tracer.

## 5. How a Stream Ends

- **`stop` or exception (exclusive)**: A stream MUST end with either its `stop` event or an exception, never both.
- **`IncompleteStreamError`**: The `stop` event MUST carry `usage_metadata` and a set `finish_reason`. If a provider stream ends missing either, the base class raises `IncompleteStreamError` in place of `stop` (naming the client and missing field(s), while attaching any partial usage/finish reason for token accounting) so incomplete turns never enter history or traces.
- **`EmptyResponseError`**: A response with no items, or only thinking items, raises `EmptyResponseError` in place of `stop` ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#5-thinking-produced-elsewhere) §5).
- **`StreamProtocolError`**: Raised in every mode if a client violates the stream grammar (yielding a complete item, usage on a delta, two different fidelity payloads on one item, or a tool call whose first fragment lacks name or call id). This is a client bug and MUST NOT be repaired (`IncompleteStreamError` and `EmptyResponseError` are not protocol bugs).
- **SDK, stream, download, and abort errors**: In-stream SDK exceptions propagate as-is ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4); Interactions API `error` events and HTTP errors when downloading a generated image `url` raise `ProviderStreamError` (with the HTTP status as `code`). Aborts follow [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md).

## 6. Request Parameters

### 6.1 Explicit matching

- **Official clients**: Model generations MUST be matched explicitly by version or modality markers in named tuples or plain conditions (first match wins), with the default fallback set to the minimum safe subset accepted by the vendor's newest models (`("low", "medium", "high")` on `google-official` and `google-genai`; `none` -> `low` on `openai-official`, `anthropic-official`, and `minimax-official`; forced thinking + `low`/`high`/`max` on `zai-official`). Older or specialized generations are matched explicitly: e.g. `"4-6"`, `"4-7"`, `"4-8"`, `"opus-5"` / `"sonnet-5"` (excluding `"-5-5"`), `"sonnet-5-5"`, `"gpt-5."`, `"gpt-6-luna"`, `"gpt-6.1-terra"`, `"k2."`, `"minimax-m3"` (excluding `"m3."`), `"glm-4."` / `"glm-5.1"` / `"glm-5.2"` / `"glm-5"` / `"glm-5v"`, `"gemini-4-hydrogen"` / `"gemini-4-neon"`, `"gemini-3-flash"` / `"gemini-3.1-flash-lite"` / `"gemini-3.5"` / `"gemini-3.6"` / `"gemini-robotics"`, and modality/tier markers `-pro`, `gemini-nano-banana`, `-image`, `tts`, `gemini-omni`, `embedding`, `-search`, `-fetch`. Bare family substrings (`"claude"`, `"gpt"`) MUST NOT decide anything; new generations add a row or condition, never a looser match.
- **Compatible clients**: Read the model id only where wire payloads differ by model, using explicit markers of their own protocol (`-search`/`-fetch` on `deepseek-webtool`; Google model markers on `google-genai`, matching `google-official`). Vendor-specific rules on multi-vendor protocols belong in explicit-pattern plugins ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#9-plugins) §9): the `gpt` plugin on `openai-responses` maps `none` to `low` unless the model matches `("gpt-5.", "gpt-6-luna", "gpt-6.1-terra")`, and on `openai-chat`/`openai-responses` sets `detail: "high"` on images for GPT-5.6 and GPT-6+; the `gemini` plugin on `openai-speech` (`gemini-.*tts`) defaults `voice` to `"Kore"` when `tts_config` is omitted. The vLLM adapter selects a chat template's thinking switch from its table, falling back to Qwen3's.
- **Client routing**: See [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md).

### 6.2 Values with no setting

- **Unsupported vs. ignored keys**: A `UniConfig` value a client cannot send for the target model MUST raise `UnsupportedParameterError` (naming client and parameter) before the request goes out. Keys a client never uses are ignored. `thinking_level` is the sole exception (§6.3).
- **`video_config`**: Sent only to Gemini Omni; `google-official` raises `UnsupportedParameterError` on any other model, and clients without a video model ignore it.
- **`max_tokens` on Gemini Omni**: Not sent to Gemini Omni because video tokens count against Google's `max_output_tokens` (57,920 for default video), which would fail after video generation if sized for text.

### 6.3 Thinking levels

A client MUST NOT reject a `ThinkingLevel`: no client ever raises `UnsupportedParameterError` for `thinking_level` on any model.

| Client Category | Target Models | `thinking_level` Mapping Rules |
| --- | --- | --- |
| **Official clients** | Thinking models | Mapped silently per generation table, defaulting to the minimum safe subset of the vendor's newest models: native level if supported; nearest accepted level otherwise (**Claude 4.6**: `xhigh` -> `high`; **Gemini**: `xhigh`/`max` -> `high`, except **Gemini 4 Hydrogen** and **Gemini 4 Neon** keep `xhigh` and map `max` -> `xhigh`, and **Gemini Omni** accepts only `low`/`high` and maps `medium` -> `high`). For `none`: native off switch where available (`disabled` on **Claude Sonnet 5**; `none` on **GPT-6 Luna**, **GPT-6.1 Terra**, **Kimi K3**), else minimum thinking (lowest effort on **Claude Opus 5.5**, `between_tools` on **Claude Sonnet 5.5**, `minimal` or `low` on **Gemini**). |
| **Any client** | Non-thinking models | Ignored on embedding models, web tools, `openai-image`, `openai-speech`, `openai-transcription`, `deepseek-speech`, and `deepseek-transcription`. |
| **Compatible clients** | Endpoint-dependent (endpoint MAY refuse) | **`ant-messages`**: `none` -> `disabled`. **`openai-responses`**: sends level as effort (`none` -> `low` on `gpt-` models except GPT-5.x, GPT-6 Luna, and GPT-6.1 Terra). **`openai-chat`**: sends nothing, except on Mistral (`mistral` plugin sends `reasoning_effort` for reasoning models in Mistral's model list: `low` -> `low`, `medium`/`high` -> `high`, `xhigh`/`max` as-is, `none` omitted; non-reasoning models omit it) and vLLM (sends chat template switch only). **`mmsp`**: forwards level to server. |

### 6.4 Values with another form

| Parameter | Client / Scope | Wire Mapping & Rules |
| --- | --- | --- |
| **`tool_choice` (list of names)** | `openai-chat`, `openai-official`, `openai-responses`, `ant-messages` | `allowed_tools` with `mode: "auto"` (`openai-chat`) or `mode: "required"` (`openai-official`, `openai-responses`); a single-name list on `ant-messages` becomes `{type: "tool", name}`. |
| **Unset `max_tokens`** | Anthropic clients | Defaults to `64000`. |
| **`prompt_caching: "enhance"`** | `openai-official` (GPT-5.6+) | Mapped to `prompt_cache_options: {ttl: "12h"}`. |
| **`tts_config`** | `openai-speech`, `deepseek-speech` | Single entry's `voice` mapped to `voice` (`openai-speech`) or `voice_id` (`deepseek-speech`); omitted when unset so the endpoint uses its default voice (except the `gemini` plugin on `openai-speech`, which defaults `voice` to `"Kore"`); >1 entry raises `UnsupportedParameterError`. |
| **`image_config`** | Google clients, `openai-image` | `resolution` maps to Gemini `image_size` on both Google clients. On `openai-image`, maps to `size` from the table below (`aspect_ratio` alone -> `1K`; `resolution` alone -> `1:1`; unset -> no `size`). Every table entry is a multiple of 16 on both sides, 655,360–8,294,400 px, max edge <= 3840, ratio <= 3:1. |
| **`video_config`** | Gemini Omni (`google-official`, `google-genai`) | Mapped to `response_format` `video` entry: `aspect_ratio` and `resolution` as given (except `4K` -> `4k`), `duration` in seconds as `"<n>s"`. Only provided fields are sent; unset sends no `response_format` (Google defaults: 16:9, 720p, 10s). Invalid values (e.g. `1:1`, 2s) are refused by Google's error. |

| `aspect_ratio` | `1K` | `2K` |
| --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` |
| `2:3` | `848x1264` | `1696x2528` |
| `3:2` | `1264x848` | `2528x1696` |
| `3:4` | `896x1200` | `1792x2400` |
| `4:3` | `1200x896` | `2400x1792` |
| `9:16` | `768x1376` | `1536x2752` |
| `16:9` | `1376x768` | `2752x1536` |
| `21:9` | `1584x672` | `3168x1344` |

### 6.5 The configuration page

[`site/src/docs/configuration.en.md`](../../site/src/docs/configuration.en.md) records what every client sends, ignores, or raises on for every key, with every thinking-level row pinned by mapping tests in both packages. Any row change MUST land in the same PR as the code change.

## 7. The `mmsp` Client

The `mmsp` client implements its own `streaming_response`:
- **Request forwarding**: Stamps `created_at` and forwards messages and config as given without converting legacy items or validating message emptiness (performed by the server's client per §3.3 and §6).
- **Stream & error relay**: Forwards the server's public stream (including `stop`) verbatim. Raises `IncompleteStreamError` locally if the server stream drops before `stop`, and surfaces a server-side `IncompleteStreamError` as `UpstreamError` with `error_type` and fields preserved ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4).

## 8. Conformance

- **Base stream & errors**: `src_py/mmsp/base_client.py`, `src_py/mmsp/stream_items.py`, `src_ts/src/baseClient.ts`, `src_ts/src/streamItems.ts`; `IncompleteStreamError` in `errors.py` / `errors.ts` and `wire.py` / `wire.ts`.
- **Shared e2e grammar check**: `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, verifying on every e2e stream that each complete item equals the join of its fragments.
- **Stream & server unit tests**: `test_stream_protocol.py`, `test_stream_items.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_message_order.py` (empty and thinking-only messages) and their Jest mirrors; `test_mmsp_server.py` / `mmsp-server.test.ts`.
- **Config transforms & tests**: `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig` in `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`; `test_thinking_level_mapping.py` / `thinking-level-mapping.test.ts` and `test_request_body.py` / `request-body.test.ts`.
- **Documentation & review gates**: `site/src/docs/configuration.en.md` / `configuration.zh.md`, `UnsupportedParameterError` docstring, and `.agents/skills/mmsp-dev/SKILL.md` (requiring confirmation before coding non-obvious mappings).
