# MMSP-RFC-0003 Message Requests

- Feature Name: `message_requests`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316), [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318), [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)
- Kind: spec

[中文版](MMSP-RFC-0003-message-requests.zh.md)

## Abstract

A message request is the one way a model is called: an asynchronous stream of `UniEvent` produced by `streaming_response` or `streaming_response_stateful`, with one grammar closed by the base class, a run of `delta` events each carrying one item and then exactly one `stop` event carrying the usage and the finish reason. This document specifies the call, the stream grammar, how a stream ends, and how the request's parameters are mapped: every thinking level is usable on every client, and every other `UniConfig` value is sent by an explicit mapping or refused before the request goes out.

## 1. Introduction

A host serving many conversations must never block its loop on a provider, and a caller must never mistake a cut-off answer for a complete one. Before the second streaming protocol ([#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)) each client closed its own items, so the fixes for one provider's stream ([#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218), [#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)) landed one client at a time. On 2026-10-22 a GLM-5.3-Flash stream in CI ended without its usage chunk ([run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)); a probe showed the provider's last chunk carries the finish reason and the usage together every time, so the stream had been cut short, which is what a caller wants to retry ([#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)).

A caller sets a `ThinkingLevel` once and changes models by name; a client that raised for a level would send the caller back to branching on the model. [#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) clamped the levels per Gemini model, [#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) mapped `max` per vendor, [#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) closed the gap where `none` sent nothing and Claude Opus 5 still thought, and [#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) turned thinking off with `none` on the Kimi K3 series. A request built from a fuzzy match sends one generation another's parameters; the audit behind [#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) found the configuration page wrong on most keys and rewrote it from both transforms.

The owner's words: 支持全部思考等级; 模型请求参数不模糊匹配; and, for this document, 要求异步和流式，任何思考等级不能报错，请求参数尽量精确. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0003, MMSP-RFC-0006, MMSP-RFC-0010 and the version rule of MMSP-RFC-0004, and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0003, MMSP-RFC-0005 (the `stop` event), MMSP-RFC-0010 and MMSP-RFC-0011.

On 2026-11-02 the owner asked for web search and page fetch, done the way embedding is: 在mmsp里面增加search和fetch的能力,实现方式和embedding类似. DeepSeek's Search and Fetch and Jina's Search and Reader each answer a request in one JSON. Jina also offers an event stream, but it sends the whole page again each time more of it has loaded, never a part, so there is nothing in it to stream; the clients read the JSON, and a web tool is requested the way an embedding is, each message one request and one item. On what a search asks for, the owner's words: search的content显示摘要,不要用need content参数 jina要加no content. [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308) amended this specification in place, with the web tool endpoints added to §3.2, `webdata` to the growing fields of §2, the `-search` and `-fetch` markers to §6.1, and the models that do not think to §6.3.

On 2026-11-02 OpenAI released GPT-6.1 Terra, and the owner asked for it: GPT 6.1 terra更新了. Unlike GPT-6 Astra and GPT-6.1 Sol, Terra takes the `none` effort, so `none` runs as its own off switch on both Responses clients. The probes for it found two gaps on every GPT-6 model: the list form of `tool_choice` went out without the `type` that OpenAI and OpenRouter require (400 `Missing required parameter: 'tool_choice.type'`), and an image above 30,000 patches was refused, because only GPT-5.6 was sent `detail: "high"`. The owner also mapped `enhance` to OpenAI's 12-hour cache lifetime, which GPT-5.6 and later take on the Responses API and GPT-5.5 refuses. [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313) amended this specification in place, with Terra's `none` and the generation's `detail` in §6.1 and §6.3, and the allowed-tools list and the 12-hour cache in §6.4.

On 2026-11-04 the owner asked for image generation, speech and transcription through OpenAI's formats, served by OpenAI, OpenRouter and TokenDance, each by a compatible client: `openai-image`, `openai-speech` and `openai-transcription`. The captures decided what each reads. OpenAI answers a streamed image request with one `image_generation.completed` event holding the whole image, OpenRouter ignores `stream`, and TokenDance sends events of its own, so an image is read from one JSON; a speech endpoint sends its audio bytes as it makes them, the first after about 0.7 s; a transcription endpoint answers in one JSON. The owner fixed the mappings: `image_config` becomes the `size` of Gemini's table of 1K and 2K sizes, every one of which keeps OpenAI's size rules; `tts_config` becomes the one `voice`; and the usage is the endpoint's tokens for an image, the input's UTF-8 bytes for speech, which Fish Audio bills by, and the audio's seconds for a transcription. A TokenDance model that refuses a 1K size answers with its own error. [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316) amended this specification in place, with the media endpoints added to §3.2, the failed download to §5, the models that do not think to §6.3, and the size and the voice to §6.4.
On 2026-11-06 the owner asked for Gemini Omni's video generation: 支持一下google omni的视频生成能力. Gemini Omni 1.2 Flash answers through the Interactions API with one video, an MP4 with its audio, sent whole in one stream delta. The owner kept Google's defaults (16:9, 720p, 10 seconds) without a new configuration key, and a video delivered by URI is returned as its URI; editing a video over several turns was left out. The probes found that Omni takes only the `low` and `high` thinking levels and counts the video's own tokens against `max_output_tokens`, so a limit sized for text fails only after the video has been made. [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318) amended this specification in place, with the `gemini-omni` marker in §6.1, the unsent `max_tokens` in §6.2 and Omni's levels in §6.3.

On 2026-11-11 the owner moved what one endpoint or one vendor's models need of a compatible client into plugins ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#9-plugins) §9), and with them the Mistral handling contributed in [#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322) and [#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323): Mistral turns a model's reasoning on only when asked, through `reasoning_effort`, on a scale with no `medium`, and its model list says which models reason. [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__) amended this specification in place, with the compatible clients' model ids in §6.1 and `openai-chat`'s levels on Mistral in §6.3.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Client stream*: the events a client's `_streaming_response_internal` / `_streamingResponseInternal` yields. *Public stream*: the events the base class yields to the caller.
- *Fragment*, *complete item*: as [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#2-conventions-and-terminology) §2 defines them. *Growing field*: the one field a kind's fragments extend (`text`, `thinking`, `arguments`, `data`, `embedding`, `webdata`).
- *Official client*, *compatible client*: as [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#2-conventions-and-terminology) §2 defines them.
- *Generation*: the models of a vendor that take the same request (`"4-6"`, `"gpt-6"`).

## 3. The Call

### 3.1 Two entry points

A model MUST be called only through `streaming_response` and `streaming_response_stateful` (`streamingResponse` and `streamingResponseStateful` in TypeScript), asynchronous generators of `UniEvent`. There is no synchronous call and no call that returns a whole response. `list_models` is the one other request a client makes to its endpoint ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#5-listing-models) §5).

### 3.2 Streaming everything

A client MUST read the provider's streaming endpoint wherever the provider has one. An embedding endpoint does not stream: its vectors go out as items, then one `stop` carrying the input count the endpoint reports as `prompt_tokens` and `finish_reason` `stop`. `openai-embedding` pairs each vector with its input by the vector's `index`.

A web tool endpoint does not stream either: it answers a request in one JSON. An event stream that sends the whole answer again as the page loads, as Jina's does, is not a streaming endpoint in this sense, and the client MUST read the JSON instead. A web tool client MUST send one request per message, the message's text items joined being the query or the URL. Each answer goes out as one `webtool` item as it arrives, a search that found nothing included, then one `stop` carrying `finish_reason` `stop` and, as `prompt_tokens`, what the endpoint bills summed over the requests: the tokens it reports, or 1 for each request where it bills by the request. A search MUST ask for each result's summary and MUST NOT ask for its page's body.

An image generation endpoint does not stream either: `openai-image` MUST read its JSON and MUST NOT ask for a stream or send `response_format`. A speech endpoint streams the audio's bytes, and `openai-speech` MUST yield each chunk as it arrives, as an `inline_data` fragment of the one item a message's speech is. A transcription endpoint answers in one JSON. Each of the three clients MUST send one request per message, as a web tool client does: an image's prompt and speech's input are the message's text items joined, and any other item raises `UnsupportedContentError`; a transcription's file is the message's one audio `inline_data` item, a text, image or other item raising `UnsupportedContentError` and a second audio item `InvalidMessageError`.

- An image is read from the answer's `b64_json`, else downloaded from its `url` with no credential ([MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md#7-links-in-an-answer) §7). Its MIME type is the answer's `media_type`, else `image/` and its `output_format`, else the type its bytes show.
- Speech keeps the endpoint's default format and sends no `response_format`. Headerless PCM, `audio/pcm` in the response's `content-type`, goes out as `audio/l16; rate=<rate>; channels=<channels>` with the rate and channels of that header; any other format goes out under its `content-type`.
- A transcription is uploaded in OpenAI's multipart form, its `file` named with the extension of its MIME type and its `model`, with no `prompt`. Headerless PCM (`audio/l16`, `audio/pcm`) is sent as WAV, built from the rate and channels of its MIME type; PCM whose MIME type names no rate raises `InvalidMessageError`. The text goes out as one `text` item.

Then one `stop` carries `finish_reason` `stop` and the usage summed over the requests. For an image, `prompt_tokens` is the endpoint's `input_tokens` or `prompt_tokens` and `response_tokens` its `output_tokens` or `completion_tokens`, whichever it reports, a count it does not report staying `None`. For speech, whose endpoint reports no usage, `prompt_tokens` is the UTF-8 byte length of the input and `response_tokens` 0. For a transcription, `prompt_tokens` is the `usage.seconds` the endpoint reports, rounded up to a whole second, and `response_tokens` 0.

### 3.3 Before the request

Before anything is sent, `streaming_response` stamps `created_at` on each message that lacks it ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#63-created_at) §6.3), converts legacy item types ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7), and checks that every message has something to send. A message with no items, or one the client's message transform cannot send (thinking alone), MUST raise `InvalidMessageError` with its `message_index` before the provider's request goes out ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1).

## 4. The Stream Grammar

### 4.1 What a client yields

- The client stream MUST yield one `UniEvent` per event of the provider's stream: deltas only, never a complete item. Its `stop` events carry the usage and the finish reason wherever the wire reports them, in pieces; a `delta` event carries neither.
- A wire event with nothing universal is the empty delta event. An end-of-item event closes nothing: it yields only what it adds, such as the fidelity of a completed reasoning item. An event a client does not recognize MUST be skipped, so a gateway's own frames cannot end a generation; with `MMSP_DEBUG` set it raises `UnknownEventError` instead.
- A client that reads a completed item from the wire (MiniMax's tool calls) streams it as one fragment and MUST NOT also stream its deltas.

### 4.2 What the base class does

- The base class hands each delta to `StreamItems` (`stream_items.py` / `streamItems.ts`), which decides where each item ends and closes it with its complete item when the next item begins or the client stream ends.
- It merges the usage and finish reason of the client's `stop` events field by field into the one public `stop`: a later count replaces an earlier one, a 0 stays 0, a count the provider does not report is `None`, and no count is required to be a number.

### 4.3 Items

- Every item streams as contiguous fragments followed by its one complete item. Items MUST NOT interleave.
- `StreamItems` alone builds the complete item, from the fragments that went out: its growing field is the join of theirs; a tool call's arguments are parsed from the joined JSON; its other fields are the first fragment's; its `fidelity` is the one the fragments carried. At most one fragment of an item carries its fidelity, and the complete item repeats it.

### 4.4 The assistant message

The complete items in order, with the `stop` event's `usage_metadata` and `finish_reason`, are the assistant message. `concat_uni_events_to_uni_message`, the stateful history and the tracer copy both fields onto it.

## 5. How a Stream Ends

- A stream MUST end with its `stop` event or with an exception, never both.
- The `stop` event MUST carry a `usage_metadata` object and a set `finish_reason`. A provider stream that ends without one of them raises `IncompleteStreamError` in place of the `stop`, after the events before it, so no caller sees a `stop` without them and no history or trace records the turn. The error names the client and the missing field or fields and carries the usage or finish reason that did arrive, so the tokens can still be counted.
- A response with no item but thinking, or with no item at all, raises `EmptyResponseError` in place of the `stop`, because no provider takes it back ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#5-thinking-produced-elsewhere) §5).
- What a client yields against this grammar raises `StreamProtocolError` in every mode: a complete item, usage on a delta event, two different fidelity payloads on one item, or a tool call whose first fragment lacks its name or call id. It is a bug in the client and MUST NOT be repaired. `IncompleteStreamError` is not one (the provider cut the stream), and neither is `EmptyResponseError` (a response without content).
- An exception an SDK raises inside an open stream propagates as it is ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4); the Interactions API's `error` event, which neither Interactions SDK raises, raises `ProviderStreamError`, and so does the download of a generated image's `url` that answers with an HTTP error, the status as the error's code. An abort ends the stream as [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md) specifies.

## 6. Request Parameters

### 6.1 Explicit matching

- What a client sends for a model MUST be decided by an explicit match, never a guess. Inside an official client, generations are told apart by the version in the id (`"4-6"`; `"gpt-6"` and neither `"gpt-6-luna"` nor `"gpt-6.1-terra"`; `"gpt-5.6"`; `"k2."`; `"m3.1"`; `"glm-5.3"`), kept in named tuples or plain conditions; the first row that matches applies. A tier or modality marker (`-pro`, `-image`, `tts`, `gemini-omni`, `embedding`, `-search`, `-fetch`) selects the model's kind the same way. A bare family substring such as `"claude"` or `"gpt"` MUST NOT decide anything. A new generation adds a row or a condition, never a looser match.
- A compatible client reads the model id only where what it sends differs by model, and then by an explicit name or marker too. Its transforms read only the markers of its own protocol: `deepseek-webtool` searches or fetches by the `-search` or `-fetch` in the id, and `google-genai`, whose protocol serves Google's models only, tells them apart as `google-official` does. What one vendor's models need of a protocol that serves many is a plugin matched by an explicit pattern ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#9-plugins) §9): the `gpt` plugin of `openai-responses` turns `none` into `low` on GPT-6 except Luna and GPT-6.1 Terra, and the `gpt` plugins of `openai-chat` and `openai-responses` ask for `detail: "high"` on an image GPT-5.6 or GPT-6 would otherwise refuse. The vLLM adapter picks a chat template's thinking switch from its own table and falls back to Qwen3's.
- Which client a model id reaches is [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md).

### 6.2 Values with no setting

A `UniConfig` value a client cannot send for the model MUST raise `UnsupportedParameterError`, naming the client and the parameter, before the request goes out. A key a client has no use for is ignored. `thinking_level` is the exception (§6.3).

`max_tokens` is not sent to Gemini Omni: the video's own tokens count against Google's `max_output_tokens` (57,920 for the default video), so a limit sized for text would fail only after the video had been generated.

### 6.3 Thinking levels

- A client MUST NOT reject a `ThinkingLevel`: no client raises `UnsupportedParameterError` for `thinking_level`, on any model.
- Each official client maps every level onto a setting of the model's generation from a fixed table, without a warning: the level itself where the model has it; another level the model accepts where it has not (Claude 4.6 runs `xhigh` at `high`; Gemini runs `xhigh` and `max` at `high`, and Gemini Omni, which takes only `low` and `high`, runs `medium` at `high` too); for `none`, the model's own off switch where it has one (`disabled` on Claude Sonnet 5, `none` on GPT-6 Luna, GPT-6.1 Terra and the Kimi K3 series); for `none` on a model with no off switch, the least thinking it allows (the lowest effort on Claude Opus 5.5, `between_tools` on Claude Sonnet 5.5, `minimal` or `low` on Gemini). A model that does not think, such as an embedding model, a web tool or a model of `openai-image`, `openai-speech` or `openai-transcription`, has no such setting, and the level is ignored.
- Through a compatible client the endpoint decides what a level runs as, and MAY refuse the value: `ant-messages` sends `disabled` for `none`; `openai-responses` sends the level as its effort, with `none` as `low` on GPT-6 except Luna and GPT-6.1 Terra; `openai-chat` sends no level, except on Mistral's endpoint, where its `mistral` plugin sends `reasoning_effort` for a model Mistral's model list says reasons (`low` for `low`, `high` for `medium` and `high`, `xhigh` and `max` as they are, nothing for `none`), and nothing for any other model; its vLLM adapter sends only its chat template's switch; the `mmsp` client forwards the level to its server.

### 6.4 Values with another form

Where a protocol has another form for a value, the mapping says which: a list of tool names is `allowed_tools`, with `mode: "auto"` on `openai-chat` and `mode: "required"` on `openai-official` and `openai-responses`; a list of one name is `{type: "tool", name}` on `ant-messages`; an unset `max_tokens` is 64000 on the Anthropic clients; `prompt_caching` `enhance` is `prompt_cache_options: {ttl: "12h"}` on `openai-official` for GPT-5.6 and later.

`tts_config` is `voice` on `openai-speech`: the `voice` of its one entry, and no `voice` without it, so the endpoint speaks in its default voice; more than one entry raises `UnsupportedParameterError`. `image_config` is `size` on `openai-image`, from the table below: an `aspect_ratio` without `image_size` takes its 1K size, an `image_size` without `aspect_ratio` takes 1:1, and no `image_config` sends no `size`. Every size of the table is a multiple of 16 on both sides, holds 655,360 to 8,294,400 pixels, has no edge longer than 3840 and no ratio beyond 3:1, as OpenAI requires.

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

This document states the specification; [`site/src/docs/configuration.en.md`](../../site/src/docs/configuration.en.md) writes down what every client sends, ignores or raises on for every key, and each thinking-level row has a case in the mapping tests of both packages. A row MUST change in the same PR as the code that changes it.

## 7. The `mmsp` Client

The `mmsp` client has a `streaming_response` of its own: it stamps `created_at` and sends the messages and the config to its server as given, without converting legacy item types or checking that each message has something to send; the server's client does the rest of §3.3 and §6. It forwards its server's public stream as sent, its `stop` included. It raises `IncompleteStreamError` itself when the server's stream ends before a `stop`, and receives a server-side `IncompleteStreamError` as `UpstreamError` with that `error_type` and the error's fields ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#4-relay-through-the-server) §4).

## 8. Conformance

- `src_py/mmsp/base_client.py`, `src_py/mmsp/stream_items.py`, `src_ts/src/baseClient.ts`, `src_ts/src/streamItems.ts`; `IncompleteStreamError` in `errors.py` / `errors.ts` and its case in `wire.py` / `wire.ts`.
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`, which the shared e2e tests apply to every stream, checking that each complete item equals the join of its fragments.
- `test_stream_protocol.py`, `test_stream_items.py`, `test_unknown_events.py`, `test_empty_response.py`, `test_message_order.py` (an empty and a thinking-only message through the clients' message transforms) and their Jest mirrors; `test_mmsp_server.py` / `mmsp-server.test.ts`, which check that the stream through the server equals the upstream stream.
- The config transforms (`transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`) under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`; `test_thinking_level_mapping.py` / `thinking-level-mapping.test.ts`, which pin each generation's row; `test_request_body.py` / `request-body.test.ts`.
- `site/src/docs/configuration.en.md` / `configuration.zh.md`; the docstring of `UnsupportedParameterError`; review against `.agents/skills/mmsp-dev/SKILL.md`, which stops to ask before a non-obvious mapping is coded.
