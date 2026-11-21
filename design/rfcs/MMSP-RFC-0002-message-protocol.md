# MMSP-RFC-0002 Message Protocol

- Feature Name: `message_protocol`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339), [#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)
- Kind: spec

[中文版](MMSP-RFC-0002-message-protocol.zh.md)

## Abstract

MMSP is one unified message protocol across all models, built on three shapes: **`UniConfig`** (in), **`UniMessage`** (in/out), and **`UniEvent`** (out) over a closed set of content item kinds in `types.py` / `types.ts`. Items carry only universal fields and a lean **`fidelity`** object for replay, while **`mmsp`** (Python) and **`@prismshadow/mmsp`** (TypeScript) operate as one identical protocol.

## 1. Introduction

- **One format and two-package parity**: Callers use one message format and stream grammar, switching models by changing a string. Provider-specific keys or divergent package behaviors break this contract. A wire audit fixed two SDK divergences—a keyword rejected by the OpenAI Python SDK ([#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)) and a literal `extra_body` not unwrapped by `openai-node` ([#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267))—now enforced by shared e2e tests and one model catalog ([#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)).
- **Lean `fidelity` ("转换只保留必要的部分，冗余字段不需要保留")**: Replayed turns must preserve model behavior without cloning raw wire items into histories and traces. [#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) added `fidelity` for upstream reasoning fields, and [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) reduced whole gateway reasoning blocks to the three keys that rebuild them.
- **RFC lineage**: Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) (MMSP-RFC-0002, MMSP-RFC-0009, part of MMSP-RFC-0008, second half of MMSP-RFC-0012) and [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) (MMSP-RFC-0002, MMSP-RFC-0004). Item order is now [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#6-order) §6.

| Date / PR | Change & Reason |
| :--- | :--- |
| **2026-11-02** ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)) | **Web search & fetch (`webtool`)**: Added `webtool` (`webdata`) and `UniConfig.webtool_config` (`count`), modeled on embedding ("在mmsp里面增加search和fetch的能力,实现方式和embedding类似"). Search stores summaries only ("search的content显示摘要,不要用need content参数 jina要加no content", §3.4). |
| **2026-11-06** ([#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)) | **Video in `inline_data`**: Added Gemini Omni video generation ("支持一下google omni的视频生成能力") via `inline_data`. URI videos return as `text` holding the URI (§3.4). |
| **2026-11-16** ([#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)) | **Whole-frame PCM streaming**: Ensured part-by-part playback ("音频输出是真正的音频流式吗?就是说我能不能每次只听到一部分"). DeepSeek chunks split 16-bit samples (74/418 fragments had odd byte counts), so raw PCM (`audio/l16`) fragments hold whole frames (§3.4). |
| **2026-11-17** ([#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)) | **Tool-call `arguments` as JSON text**: Kept `tool_call.arguments` as the JSON string the model wrote ("这个丢精度确实会有问题,在中间多做一次精度转换就会丢东西,UniMessage的工具参数还是保留字符串类型吧"), preventing number precision loss (`9007199254740993` -> `9007199254740992` in JS `number` / Python `float`) on replay ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md), §3.4). |
| **2026-11-21** ([#__PR__](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/__PR__)) | **CI tests the smallest model of each newest generation**: Tested one text model per official endpoint, the smallest of the vendor's newest generation (`gpt-6-luna`, `claude-haiku-5-5`, `gemini-4-hydrogen`, `glm-5.3-flash`, `MiniMax-M3.1-Flash`, `deepseek-flash`, `kimi-k3.1-pro`), and dropped the larger tiers `gpt-6.2-sol`, `gpt-6.1-terra` and `claude-sonnet-5-5` ("之前说官方端点模型测最新一代,但是gpt-sol gpt-terra gpt-luna不需要重复测试,只需要测试最新一代的小参数模型就行,但是不同模态的比如image,tts还是要测.比如测 gpt-6-luna claude-haiku-5-5 gemini-4-hydrogen glm5.3flash MiniMax-M3.1-Flash deepseek flash但是aws bedrock还是只能用sonnet 4.6"). The larger tiers repeated the cases the smallest one already runs. Other modalities keep their own cases, and Amazon Bedrock keeps `global.anthropic.claude-sonnet-4-6`, the only model its key reaches (§7). |

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Item**: One entry of `content_items` in a message or event.
- **Complete item**: An item with a `.done` type.
- **Fragment**: An item with a `.delta` type.
- **Universal field**: Any item field other than `fidelity` in `types.py` / `types.ts` (e.g., `text`, `thinking`, `arguments`, `tool_call_id`).
- **Fidelity**: An item's `fidelity` object for wire data outside universal fields (§5).
- **Public stream**: Defined in [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#2-conventions-and-terminology) §2.
- **Replay**: Defined in [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#2-conventions-and-terminology) §2.

## 3. The Three Shapes

### 3.1 `UniConfig`

- **Optional keys**: Request configuration is a `UniConfig` of optional keys in `types.py` / `types.ts`.
- **Uniform meaning**: Each key MUST mean the same thing on every client. How clients send, ignore, or refuse keys is [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#6-request-parameters) §6.

### 3.2 `UniMessage`

- **Fields**: `role` (`user` or `assistant`), `content_items`, and optional `usage_metadata`, `finish_reason`, and `created_at` (epoch ms).
- **Complete items only**: Messages MUST hold `.done` items only. The base class builds assistant messages from stream `.done` items. Non-`.done` caller items are refused ([MMSP-RFC-0007](MMSP-RFC-0007-error-types.md#31-before-the-request) §3.1), except pre-0.5.0 history item types, which are converted ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7).
- **Order & metadata**: Item order is preserved ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#6-order) §6). Stream-built assistant messages carry `usage_metadata` and `finish_reason` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#44-the-assistant-message) §4.4); hand-built messages MAY omit both.

### 3.3 `UniEvent`

- **Fields**: `role`, `event_type` (`delta` or `stop`), `content_items`, `usage_metadata`, `finish_reason`, and `created_at`.
- **`delta` event**: In the public stream, MUST carry one item (`.delta` or `.done`) and neither usage nor finish reason.
- **`stop` event**: The single `stop` event MUST carry no items and both usage and finish reason ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#4-the-stream-grammar) §4). Client yields to the base class are in [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1.

### 3.4 Content Items

- **Closed set**: Messages and events MUST NOT carry any item kind outside this table (including provider types).

| Category | Kinds & Rules |
| :--- | :--- |
| **Complete (`.done`)** | `text.done`, `image_url.done`, `inline_data.done`, `thinking.done`, `inline_thinking.done`, `tool_call.done`, `tool_result.done`, `embedding.done`, `webtool.done`. |
| **Fragment (`.delta`)** | `.delta` forms of all complete kinds **except** `image_url` and `tool_result` (written by callers, never streamed). |
| **`inline_data` media** | `mime_type` names image, audio, or video. Image/video arrives whole (one fragment per item). Audio streams as fragments of one item. URI videos return as `text` holding the URI. |
| **Raw PCM (`audio/l16`)** | Carries `rate` and `channels`. Each fragment MUST hold whole frames (one 16-bit sample per channel) for immediate playback. Split frame bytes wait for the next fragment, and trailing bytes flush at stream end. |
| **`tool_call` (`arguments`)** | `arguments` is a string: the JSON text of the call's argument object as written by the model (fragments are pieces of that text, and `.done` is their join; [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#43-items) §4.3). Nothing between provider and caller re-parses and re-serializes it: replays send it as-is on string-argument wires (Responses, Chat Completions) and parse it only on object-argument wires (Messages `input`, generateContent `args`, Interactions `arguments`); where a provider delivers an object (Gemini), the text is that object's JSON. Callers parse the text to run the tool. |
| **`webtool` (`webdata`)** | List of `WebData` (`title`, `content`, `url` strings). **Search**: MUST keep rank order, with `content` as the endpoint summary (never page body), or `[]` when empty. **Fetch**: MUST hold the one page read, with `content` as Markdown and `url` as the page address (or sent URL if none returned). |

## 4. Provider Features

- **Entry paths**: Provider features MUST enter MMSP as a `UniConfig` key, an item universal field, or opaque item `fidelity` (§5)—never as a client-specific key or field.
- **RFC gated**: Any shape change (item kind/field, `UniConfig` key, `UniMessage` or `UniEvent` field) MUST go through an RFC.

## 5. What a Message Carries

- **Replay-only `fidelity`**: Items hold universal fields plus only the `fidelity` needed for replay (e.g., thinking signature, encrypted reasoning, phase, or upstream reasoning field name; [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#4-what-each-wire-needs-back) §4).
- **Forbidden data**: `fidelity` MUST NOT hold copies of universal fields, regenerated/ignored provider IDs, unused fields, or whole wire items/lists under wire names.
- **Canonical keys**: Clients MUST use these exact names: `signature`, `encrypted_content`, `format`, `channel`, `phase`, `reasoning_field`, `reasoning_id` (kept only for gateway encrypted reasoning blocks whose ID the gateway needs back).
- **`fidelity.item_id` stripping**: Used internally during streaming; `StreamItems` MUST strip `item_id` before emission so it never reaches consumers, traces, or histories.
- **Opacity & legacy**: Consumers SHOULD pass `fidelity` back unchanged. Legacy in-item shapes remain readable until 0.6.0 ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7).

## 6. One Protocol in Two Packages

- **Behavioral parity**: `mmsp` and `@prismshadow/mmsp` MUST expose the same clients, mappings, error classes, and stream under the same names (up to language casing/idiom). Divergent or missing behavior is a bug.
- **Identical wire bodies**: Both packages MUST send identical request bodies. Untyped SDK keys use `extra_body` in OpenAI/Anthropic Python SDKs and top-level body keys in TypeScript SDKs.
- **Single-PR changes**: Every change MUST land in both packages in one PR with mirrored tests.

## 7. Conformance

- **Types & base client**: `src_py/mmsp/types.py`, `src_ts/src/types.ts`, `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, and `concat_uni_events_to_uni_message` / `concatUniEventsToUniMessage` (`.done` items only).
- **Stream items & grammar**: `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts` (one fidelity per item, strips `item_id`) and `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts` (rejects leftover `item_id`).
- **Paired unit tests (`src_py/tests/` & `src_ts/tests/`)**: `test_request_body.py` / `request-body.test.ts` (Anthropic SDK wire bodies) and `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts` (exact replayed reasoning items, no ID or partial ciphertext).
- **Shared e2e contract (`src_py/tests/test_client.py` & `src_ts/tests/client.test.ts`)**:
  - Models enter via `.github/ci/models.json` with capability flags and key variables.
  - No test branches on model name, and no model gets its own test file.
  - A failing shared test means the client is wrong until proven otherwise; broader test edits need explicit owner approval per change.
- **Catalog & routing**: `.github/ci/models.json` (with `.github/ci/plan.py`, `.github/ci/README.md`, `.github/workflows/ci.yml`) holds the live model cases:
  - **One text model per vendor**: For each official client on its vendor's own endpoint, the catalog MUST carry one text model, the smallest model of the vendor's newest generation, and MUST NOT carry that generation's larger tiers.
  - **Every other modality**: Each other modality the vendor serves (image generation, speech, transcription, video generation, embedding, web tools) MUST keep its own case.
  - **Amazon Bedrock**: Keeps its case on the one Claude model the CI key reaches.
  - **Outside this rule**: Compatible-client, gateway, and `slow` cases.
  - **Routing**: Older generations and untested tiers stay supported and routed ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#3-client-types) §3), verified by the routing case in `test_client.py` / `client.test.ts`.
