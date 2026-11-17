# MMSP-RFC-0009 Protocol Conversion

- Feature Name: `protocol_conversion`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)
- Kind: spec

[中文版](MMSP-RFC-0009-protocol-conversion.zh.md)

## Abstract

Every client uses **MMSP** as its **intermediate representation**: requests convert from MMSP to the wire, wire events convert back to MMSP, and conversations cross providers only via MMSP. This spec defines the **three transforms**, **item order**, **single-shape inputs** (with legacy normalization), the **base class** stream pipeline, and **client plugins**—all written as direct code with no extra layer.

## 1. Introduction

- **MMSP as IR** (`写一下把 MMSP 作为 IR 的转换逻辑，实现代码减少抽象，尽量直观`): Each client is just two conversions (to wire and back), so conversations move across clients without coupling wire shapes.
- **Direct, diff-friendly code** (`转换代码尽量减少抽象，保持易懂`; `base client也减少一些抽象,尽量让代码容易看懂`, [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297)): Clients are reviewed as diffs against a reference client; extra helpers or dual-shape shims hide provider quirks and cause Python/TypeScript drift.
- **Prior bugs & drafts**:
  - **Order bug** ([#185](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/185)): A Responses transform placed collected text after an earlier tool call, triggering DeepSeek's `"No tool output found for tool call"`.
  - **0.5.5 gateway reasoning block** ([#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287)): Moved 0.5.5's whole reasoning block to shared fidelity keys while keeping read support for the 0.5.5 shape.
  - **Earlier numbers**: Drafted as MMSP-RFC-0012 ([#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)) and MMSP-RFC-0013 ([#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)), with ordering then in MMSP-RFC-0002.
- **2026-11-11 — Client plugins** ([#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322), [#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323), [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)): Reviewing Mistral thinking chunks and `reasoning_effort` in `openai-chat`, the owner moved endpoint/model quirks into built-in plugins matched by `model_id` or `base_url` (`每个client都可以有n个plugin,每个plugin可以用模型id或者baseurl来匹配和启用`), along with OpenRouter usage fixes (`openai-chat`, `ant-messages`) and GPT-5.6/GPT-6 rules (`openai-chat`, `openai-responses`) (§2, §9).
- **2026-11-17 — Legacy object `arguments`** ([#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)): After keeping `tool_call.arguments` as the model's JSON text ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#34-content-items) §3.4; `这个丢精度确实会有问题,在中间多做一次精度转换就会丢东西,UniMessage的工具参数还是保留字符串类型吧`), object `arguments` recorded by releases up to 0.5.8 was added to the legacy shapes normalized in §7.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Intermediate representation**: `UniConfig`, `UniMessage` and `UniEvent` with their content items ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#3-the-three-shapes) §3).
- **Wire**: A provider's request and event shapes, as typed by its SDK.
- **Provider client**: Every client except `mmsp` (which talks to an MMSP server).
- **Transform**: One of the three conversion methods in §4.
- **Reference client**: The baseline for same-protocol diffs (`openai-official` for Responses, `openai-chat` for Chat Completions).
- **Adapter**: A protocol-client subclass overriding only server differences (e.g., `openai-chat-vllm-adapter` on `openai-chat`).
- **Fidelity**: Defined in [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5.
- **Plugin**: Endpoint- or vendor-specific logic in `<client>/plugins/`, enabled when its `hosts` and `models` match (§9).

## 3. MMSP as the Intermediate Representation

- **MMSP boundary**: Every request MUST convert `UniConfig` and `UniMessage`s to the wire, and every wire event (or non-streaming response) MUST convert to a `UniEvent` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1). No provider shape enters a message or event ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#34-content-items) §3.4).
- **No cross-provider conversion**: Clients MUST NOT convert directly between provider wires. Callers MAY continue recorded conversations across clients via MMSP items and `fidelity` ([MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#4-what-each-wire-needs-back) §4, §5).
- **Stateless conversion**: Conversion MUST be stateless across requests and events:
  - Responses clients (`openai-official`, `openai-responses`, `deepseek-official`, `minimax-official`) and Interactions (`google-official`) send `store: false` and no prior response id.
  - A client's only memory is the base class's stateful MMSP history, sent whole on each call.
- **`mmsp` server wire**: `POST /v1/stream` takes `{"model", "messages", "config"}` and streams SSE with bytes as base64 (`wire.py` / `wire.ts`). The `mmsp` client's transforms are identity up to base64; the server's upstream client converts to the provider.

## 4. The Three Transforms

- **Three methods**: Every client MUST convert in `transform_uni_config_to_model_config` (`transformUniConfigToModelConfig`), `transform_uni_message_to_model_input` (`transformUniMessageToModelInput`), and `transform_model_output_to_uni_event` (`transformModelOutputToUniEvent`, one wire event at a time).
- **`_streaming_response_internal` / `_streamingResponseInternal`**:
  - MUST call the config and message transforms, send the request, and yield each wire event's transform result.
  - MAY combine config and messages (Chat Completions system prompt, `anthropic-official` Bedrock cache breakpoint, Gemini TTS single turn) or refine an event from earlier stream state (`google-genai` reporting `tool_call` when generateContent reports `STOP`).
  - **Exception**: Google embedding (`_embed_messages_internal` / `_embedMessagesInternal`) builds `embedContent` directly.
- **No shared conversion code**: Clients MUST NOT share conversion code except via `utils`, the base class, or an adapter. Private helpers SHOULD match the reference client (plus image fetching) and SHOULD be copied across clients for clean diffs.

## 5. Direct Code

- **Inline access**: Read SDK attributes directly (`model_output.delta`, `model_output.item.call_id`) and keep field access, usage math, and error text inline.
- **No shims or tiny helpers**: SHOULD extract blocks only when inlining buries flow (never for a few lines), and MUST NOT write shims accepting both dicts and SDK objects.

## 6. Order

The message transform MUST preserve assistant item order (`thinking -> text -> tool_call`) wherever the wire supports it:

| Protocol | How Order Is Preserved |
| --- | --- |
| **Messages / generateContent / Interactions** | Single ordered list of content blocks, parts, or steps. |
| **Responses-style** | Reasoning, function calls, and tool results are separate input items while text collects into a message item; collected text MUST be appended as a message item before any such entry. |
| **Chat Completions** | Text, reasoning, and tool calls live in separate fields of one message (unordered). |

## 7. One Shape per Input

- **Single active shape**: Apart from the legacy shapes below, transforms MUST take one shape per input: SDK-typed wire events and `.done` message items ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#32-unimessage) §3.2). Nothing redundant is kept ([MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5).
- **Pre-0.5.0 item types (read until 0.6.0)**: `normalize_legacy_messages` / `normalizeLegacyMessages` MUST convert unsuffixed types (`text`, `tool_call`, …) to `.done` and drop stray `partial_tool_call` before provider transforms run:
  - Copies converted messages and returns current messages as-is (never mutating caller data); warns once per process.
  - Runs in `streaming_response`, stateful calls, `set_history`, and tracer loads ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#7-reading-traces) §7).
- **Legacy item internals (read until 0.6.0)**: (1) `bytes` thought signatures, (2) channel-less reasoning items, (3) 0.5.5 whole gateway reasoning blocks, and (4) tool-call `arguments` recorded as an object by releases up to 0.5.8 (which `normalize_legacy_messages` / `normalizeLegacyMessages` serializes to JSON text). A tool call id equal to the function name is **not** legacy (`google-genai` still records it when id is missing, and both Google clients omit it on replay).

## 8. The Base Class

- **Top-to-bottom pipeline**: `streaming_response` / `streamingResponse` MUST build the public stream in one method: stamp `created_at`, normalize legacy types, validate messages, feed deltas to `StreamItems`, merge usage/finish reason, close the last item, raise `IncompleteStreamError` or `EmptyResponseError` if needed ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#5-how-a-stream-ends) §5), build `stop`, save the trace ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved) §3), and yield `stop` (with abort handling and race comments inline).
- **No extra layers**: No class or helper layer other than `StreamItems` MUST stand between client events and the public stream.
- **`mmsp` override**: Stamps `created_at` and forwards the server's stream, leaving legacy conversion and validation to the server's upstream client ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#7-the-mmsp-client) §7).

## 9. Plugins

- **Boundary**: Compatible clients ([MMSP-RFC-0005](MMSP-RFC-0005-client-routing.md#2-conventions-and-terminology) §2) MUST match their reference client's transforms and MUST NOT branch on base URL or model id. Endpoint/vendor quirks (renamed fields, custom stream chunks, extra parameters, wrong usage counts) MUST be plugins. Official clients, adapters, and `google-genai` branch on their own models in client code ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#61-explicit-matching) §6.1).
- **Definition & matching**: Subclasses `ClientPlugin` (`src_py/mmsp/plugin.py` / `src_ts/src/plugin.ts`) in `<client>/plugins/<name>.py` / `.ts`, ordered by `PLUGINS`. MUST declare `hosts` (matches host + subdomains) and/or `models` (case-insensitive regex on model id); enabled when all declared rules match.
- **Instantiation & lock-in**: Built once in the constructor (`enabled_plugins` / `enabledPlugins`, stored as `_plugins` on the base class) with model id, SDK base URL, and SDK object. Callers MUST NOT add or disable plugins (`AutoLLMClient` and constructors take no plugin argument).
- **Hooks**: Called only in `_streaming_response_internal` / `_streamingResponseInternal` in `PLUGINS` order, mutating arguments in place and returning nothing:

| Hook | Timing & Target |
| --- | --- |
| `on_request(config, request)` / `onRequest(config, request, signal)` | After config/message transforms, before send (MAY `await`); mutates SDK kwargs (with wire messages). |
| `on_wire_event(wire_event)` / `onWireEvent(wireEvent)` | On each wire event before the event transform. |
| `on_event(event)` / `onEvent(event)` | On the `UniEvent` from the event transform. |

- **Wire translation & statelessness**: MUST translate endpoint shapes to/from transform shapes so items, `fidelity`, and stream rules stay in the transforms and base class ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#41-what-a-client-yields) §4.1, [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.md#4-what-each-wire-needs-back) §4; e.g., Mistral thinking chunks `<->` `reasoning_content`). Conversion stays stateless (§3): plugins MAY cache endpoint metadata (e.g., whether a model reasons) per client, never conversation state, and use the client's SDK, base URL, credential ([MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.md#4-resolution) §4), and abort signal ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#3-interrupting-a-stream) §3).

## 10. Conformance

- **Diff review**: Against reference clients per `.agents/skills/mmsp-dev/SKILL.md`.
- **Implementation**: `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`, `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`, `src_py/mmsp/wire.py` / `src_ts/src/wire.ts`, `src_py/mmsp/plugin.py` / `src_ts/src/plugin.ts`, and `<client>/client.py` / `.ts` + `<client>/plugins/`.
- **Tests**: `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts` (legacy normalization), `test_message_order.py` / `message-order.test.ts` (wire order), `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts` (replay + Mistral chunks), `test_mmsp_server.py` / `mmsp-server.test.ts` (server parity), and `test_plugins.py` / `plugins.test.ts` (plugin matching + hook order).
