# MMSP-RFC-0004 Message Fidelity

- Feature Name: `message_fidelity`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)
- Kind: spec

[中文版](MMSP-RFC-0004-message-fidelity.zh.md)

## Abstract

Message fidelity ensures that conversations recorded as **`UniMessage`** objects replay to models without loss or mutation. Every model's **thinking** (with required signatures or ciphertext) and **`tool_call_id`** return intact, and past turns serialize to the exact same wire **prefix** on every call (except where §6.4 notes) so provider prefix caches hit reliably.

## 1. Introduction

- **Lossless thinking & tool-call replay**: Reasoning models degrade or fail in tool loops when earlier thinking is lost: DeepSeek returns `400` without `reasoning_content` on tool-calling turns, Gemini 3 returns `400` without the first call's thought signature, and Claude 5.5 rejects partially dropped thinking blocks. The 2026-10-22 audit across all official clients fixed the two remaining gaps ([#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268), [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)).
- **Identical cached prefix ("讲一下 fidelity 来保护思考，前缀不发生改变，是 identical 的")**: Mutating yielded events, editing returned history lists, or overlapping stateful calls silently alters context and breaks paid prefix caches. [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) enforced deep-copied histories, single-flight stateful calls, and empty-message rejection, while stamping `created_at` off the wire ("给历史消息加时间戳created at不会影响输入token,也不会破坏前缀缓存,所以可以放心做").
- **RFC lineage**: Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) (MMSP-RFC-0011 and the `tool_call_id` and unsigned-thinking rules of MMSP-RFC-0008) and [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) (MMSP-RFC-0005, MMSP-RFC-0008).

| Date / PR | Change & Reason |
| :--- | :--- |
| **2026-11-11** ([#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322), [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)) | **Mistral thinking chunk replay**: Mistral streams thinking as content chunks and rejects replayed reasoning fields with `422 extra_forbidden`. Amended §4 so an `openai-chat` plugin ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#9-plugins) §9) replays Mistral thinking as a leading chunk. |

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- **Replay**: Sending a recorded message back to a model in a later request.
- **Prefix**: Request messages before the newest one, in the wire form the client sends.
- **Stand-in**: A placeholder inserted into a replayed turn for something the turn lacks and the provider requires (e.g., placeholder thought signature or empty reasoning field).
- **Fidelity**: Defined in [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5.
- **Stateful history**: The messages kept by `streaming_response_stateful`.

## 3. What a Message Keeps

- **Items & `fidelity`**: A recorded message keeps its items and their `fidelity`, and every later call MUST replay from them. MMSP writes nothing onto a given message except `created_at` (§6.3).
- **`tool_call_id`**: MUST hold the provider's call ID (not the item ID when the wire carries both), and a replay MUST send it back. A tool result without one raises `InvalidMessageError`.
- **Stream metadata**: Stream-built assistant messages keep `usage_metadata` and `finish_reason` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#44-the-assistant-message) §4.4).

## 4. What Each Wire Needs Back

- **Same-model replay**: A client MUST replay thinking its own model produced with everything that model needs to continue.

| Wire | Replayed Fidelity & Rules |
| :--- | :--- |
| **Responses** | Reasoning item `channel` and `encrypted_content`, gateway `signature` and `format`, and assistant message `phase`. |
| **Messages** | Thinking block `signature`, and redacted block `data`. |
| **Interactions** | Thought step `signature`. |
| **`generateContent`** | Part `thought_signature`, on the exact part it came with. |
| **Chat Completions (`openai-chat`)** | Turn's `reasoning_field` name with the text in that field (or both fields when unknown). Once an earlier turn produced the field, `openai-chat` sends it empty on tool-calling turns that thought nothing. **Mistral**: rejects both fields; takes text back as a thinking chunk ahead of content, and sends nothing when empty. |
| **Gateway Encrypted Block** | Recorded as `encrypted_content`, `format`, and `reasoning_id`, rebuilt on replay. |

- **Probe admission rule**: A field joins this table only when a probe shows the request fails or the model degrades without it. Clients rebuild turns from universal fields + `fidelity` + required stand-ins, never field-for-field wire clones.

## 5. Thinking Produced Elsewhere

- **No text fallback**: Thinking from another model or endpoint goes back in the form the target provider accepts or is omitted when rejected—it MUST NOT go back as assistant `text`.

| Client or Wire | Handling of Foreign or Unsigned Thinking |
| :--- | :--- |
| **`anthropic-official`** | Omits thinking items without a `signature` (matching API handling of unreadable blocks). |
| **Gemini (`google-official`, `google-genai`)** | Keeps text as an unsigned thought and adds Google's documented placeholder signature where checked (`google-official` opens the turn with it; `google-genai` signs the turn's first call with it). |
| **Chat Completions (`openai-chat`)** | Sends text through both reasoning fields when the item names no field. |
| **Responses** | Rebuilds a reasoning item with text as `reasoning_text`. |
| **`ant-messages`** | Sends unsigned thinking back unsigned (accepted by third-party Messages servers; refused by Anthropic's API). |

- **Thinking-only refusal**: A response containing only thinking is never recorded and raises `EmptyResponseError` because no provider accepts it back. Replayed thinking-only messages are refused ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#33-before-the-request) §3.3, §5).

## 6. The Identical Prefix

### 6.1 The history holds copies

- **Deep copies only**: The stateful history MUST share no object with the caller or yielded events. `streaming_response_stateful` deep-copies the sent message and the assistant message on `stop`; `get_history` and `set_history` copy on read and write.
- **Recorded before `stop`**: The turn is recorded before `stop` is yielded so callers can stop iterating at `stop` and start the next call immediately. Streams ending without `stop` append nothing and save no trace ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved) §3).

### 6.2 One stateful call at a time

- **`ConcurrentCallError`**: A second `streaming_response_stateful` while one is in flight MUST raise `ConcurrentCallError` before sending anything (`AutoLLMClient` forwards the lock to its wrapped client; stateless `streaming_response` runs alongside freely).
- **Release & abort**: A call holds the client until `stop`, error, signal abort, or generator close. An aborted call releases the client immediately and records nothing, even if abort lands as `stop` arrives ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#6-stateful-calls) §6).

### 6.3 `created_at`

- **Off-wire timestamp**: `streaming_response` and the `mmsp` client stamp `created_at` in place on any message sent without one (caller object or history copy). No message transform reads `created_at`, leaving input tokens and prefix caches untouched.

### 6.4 The wire form of a past turn

- **Forward-only transforms**: Each message MUST be serialized from that message and earlier messages only—transforms MUST NOT read later messages. Forward state is limited to an earlier `openai-chat` turn's `reasoning_field` (§4), Google call names repeated by function responses, and stand-ins (§4, §5). Legacy conversion ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7) is deterministic and non-mutating, keeping replayed prefixes identical.
- **URL images**: Clients that inline URL images (`openai-chat`, `moonshot-official`, Google clients, `anthropic-official` on Bedrock) re-read the URL per request, staying identical while the URL serves identical bytes.
- **Outer fields & Bedrock breakpoint**: System prompts, tools, and config go out as given. The only moving marker is the Bedrock cache breakpoint `anthropic-official` puts on the last item of the last user message, matching Anthropic's 20-block lookback design (`llmsdk_docs/claude4_6/docs/prompt-caching.md`, "How automatic prefix checking works"). On the Anthropic API, top-level `cache_control` is used and no turn carries a marker.
- **Gemini TTS**: Both Google clients send only the newest message because the model refuses multi-turn conversations.

### 6.5 Nothing is dropped silently

- **Refuse empty messages**: A message with nothing a client can send is refused before the request ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#33-before-the-request) §3.3); it MUST NOT be dropped or sent empty, keeping requests and histories aligned.

## 7. The `mmsp` Client

- **Unchanged forwarding**: The `mmsp` client sends items and `fidelity` to its server unchanged; the server's upstream client replays them per §4 and §5.

## 8. Conformance

- **Core & legacy modules**: `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`, `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`, and `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`.
- **Message transforms**: `transform_uni_message_to_model_input` / `transformUniMessageToModelInput` in `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts` (never reading `created_at` or later messages; only the tracer and playground read `created_at` for display).
- **Replay & order tests**: `src_py/tests/test_reasoning_fidelity.py`, `test_reasoning_replay_without_thinking.py`, `test_tool_call_arguments.py`, `test_message_order.py`, and their TypeScript mirrors.
- **Stream protocol tests (`test_stream_protocol.py` / `stream-protocol.test.ts`)**: Verify `created_at`-only stamping, deep-copy isolation, `ConcurrentCallError`, abort cleanup, history continuation, and legacy conversion.
- **MMSP server tests (`test_mmsp_server.py` / `mmsp-server.test.ts`)**: Record stateful turns with `created_at` through the `mmsp` client.
- **Shared e2e tool-use replay (`test_client.py` / `client.test.ts`)**: Round 2 replays the tool-calling turn (with thinking) for every catalog model.
