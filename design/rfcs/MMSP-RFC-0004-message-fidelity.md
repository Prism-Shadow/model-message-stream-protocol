# MMSP-RFC-0004 Message Fidelity

- Feature Name: `message_fidelity`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[中文版](MMSP-RFC-0004-message-fidelity.zh.md)

## Abstract

Message fidelity is the property that a conversation recorded as `UniMessage`s is replayed to a model without loss and without change. The thinking a model produced goes back with everything that model needs to continue from it, every tool call goes back with the provider's call id, and a past turn goes out in the same wire form on every call, except where §6.4 says, so the provider's prefix cache sees the same prefix. This document specifies what a recorded message keeps, how each wire replays it, how thinking produced elsewhere is handled, and how the history and the message transforms keep the prefix identical.

## 1. Introduction

Every reasoning model degrades when its earlier thinking is missing from a tool-use loop, and several refuse the request: DeepSeek returns 400 without `reasoning_content` on a turn that called a tool; Gemini 3 returns 400 without the thought signature on the first call of a step; Claude 5.5 rejects a partially dropped thinking block. The owner asked that a message turned into a `UniMessage` and back lose nothing the model needs, above all its thinking; the audit of 2026-10-22 ran a thinking-and-tool-call turn and its replay on every official client and found the two places where that did not hold ([#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268), [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)).

A conversation is a prefix the provider caches and the caller pays for. A history that changes between turns changes the model's context and its cost without anyone deciding to: an event mutated after it was yielded, a caller's edit to a list it was given back, a second call recording a turn generated without the first. [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) made the history hold copies, one stateful call run at a time, and a message with nothing to send be refused. On timestamps the owner decided: 给历史消息加时间戳created at不会影响输入token,也不会破坏前缀缓存,所以可以放心做.

The owner's words for this document: 讲一下 fidelity 来保护思考，前缀不发生改变，是 identical 的. Stated in [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) as MMSP-RFC-0011 and the `tool_call_id` and unsigned-thinking bullets of MMSP-RFC-0008, and in [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) as MMSP-RFC-0005 and MMSP-RFC-0008.

## 2. Conventions and Terminology

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals.

- *Replay*: sending a recorded message back to a model as part of a later request.
- *Prefix*: the messages of a request before the newest one, in the wire form the client sends.
- *Stand-in*: what a client puts in a replayed turn for something the turn lacks and the provider requires (a placeholder thought signature, an empty reasoning field).
- *Fidelity*: as [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.md#5-what-a-message-carries) §5 defines it. *Stateful history*: the messages `streaming_response_stateful` keeps.

## 3. What a Message Keeps

- A recorded message keeps its items and their `fidelity`, and every later call MUST replay it from them. MMSP writes nothing onto a message it is given except `created_at` (§6.3).
- `tool_call_id` MUST hold the provider's call id where the wire carries one, and a replay MUST send it back. Where the wire carries both an item id and a call id, it holds the call id, which correlates a result to its call. A tool result without one raises `InvalidMessageError`.
- An assistant message built from a stream keeps the stream's `usage_metadata` and `finish_reason` ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#44-the-assistant-message) §4.4).

## 4. What Each Wire Needs Back

A client MUST replay the thinking its own model produced with everything that model needs to continue from it. What each wire needs back is what the client records as `fidelity`:

- a Responses reasoning item's channel and `encrypted_content`, plus the `signature` and `format` a gateway adds, and an assistant message's `phase`;
- a Messages thinking block's `signature`, and a redacted block's `data`;
- an Interactions thought step's signature;
- a generateContent part's `thought_signature`, on the part it came with;
- a Chat Completions turn's reasoning field name, with the text in that field; the text goes in both fields when the name is unknown, and `openai-chat` sends the field empty on a tool-calling turn that thought nothing once an earlier turn of the conversation has produced it;
- a gateway's encrypted reasoning block, as `encrypted_content`, `format` and `reasoning_id`, rebuilt on replay.

A field joins this list only when a probe shows the request fails or the model degrades without it. A client rebuilds a replayed assistant turn from the universal fields plus this fidelity plus the stand-ins a provider requires; it does not reproduce the wire item field for field.

## 5. Thinking Produced Elsewhere

The scope of §4 is the same model on the same endpoint. Thinking another model or endpoint produced goes back in the form the provider takes for it, or is left out where the provider rejects it, and MUST NOT go back as the assistant's own text:

- `anthropic-official` leaves out a thinking item without a signature, as the API does with blocks the model cannot read;
- a Gemini replay keeps the text as an unsigned thought and puts the placeholder signature Google documents where the API checks one: `google-official` opens the turn with it, `google-genai` signs the turn's first call with it;
- a Chat Completions replay sends the text through both reasoning fields when the item names no field;
- a Responses replay rebuilds a reasoning item with the text as `reasoning_text`;
- through `ant-messages` an unsigned thinking item goes back unsigned, the form third-party Messages servers take; Anthropic's own API refuses it.

A response that is thinking and nothing else is not recorded, because no provider takes it back: it raises `EmptyResponseError`, and a replayed message that is thinking alone is refused ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#33-before-the-request) §3.3, §5).

## 6. The Identical Prefix

### 6.1 The history holds copies

The stateful history MUST share no object with the caller or the yielded events: `streaming_response_stateful` records a deep copy of the message sent and a deep copy of the assistant message when the `stop` event arrives; `get_history` returns a copy and `set_history` stores one. The turn is recorded before the `stop` is yielded, so a caller may stop iterating at the `stop` and the next call may begin from then. A stream that ends without its `stop` appends nothing and saves no trace ([MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.md#3-when-a-trace-is-saved) §3).

### 6.2 One stateful call at a time

A second `streaming_response_stateful` on a client while one is in flight MUST raise `ConcurrentCallError` before anything is sent. A call holds the client until its `stop`, its error, the abort of its signal or the close of its generator; an aborted call releases the client at once and records nothing, even when the abort lands as its `stop` arrives ([MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.md#6-stateful-calls) §6). `streaming_response` keeps no history and runs beside a stateful call. `AutoLLMClient` forwards to the wrapped client, which holds the claim.

### 6.3 `created_at`

A message sent without `created_at` is stamped with the time it is sent, on the object itself, by `streaming_response` and by the `mmsp` client: the caller's own message, or the history's copy of one recorded without it. No message transform reads `created_at`, so it reaches no provider and leaves the input tokens and the prefix cache as they were. Nothing else is written to a message MMSP is given.

### 6.4 The wire form of a past turn

- A message transform MUST write each message from that message and the messages before it, and MUST NOT read a message after it. What it carries forward is what a later message needs from an earlier one: the reasoning field an earlier turn of an `openai-chat` conversation produced (§4), and, in the Google clients, the name of each call, which the function response that answers it repeats. A stand-in (§4, §5) is decided from the turn and the turns before it. Legacy conversion ([MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.md#7-one-shape-per-input) §7) converts a message the same way on every call and never modifies the caller's messages. So a replayed turn goes out in the same wire form on every call, and the provider's prefix cache sees the same prefix.
- An image given by URL is read again for every request by a client that inlines it (`openai-chat`, `moonshot-official`, the Google clients, `anthropic-official` on Bedrock), so it goes out the same only while the URL serves the same bytes.
- What a request carries outside its messages (the system prompt, the tools, the config) is the caller's and is sent as given; what MMSP adds to the request body depends only on the client, the model and the config. The one marker that moves is the cache breakpoint `anthropic-official` sets on Bedrock: it goes on the last content item of the last user message of each request, so a turn that carried it on one call goes out without it on the next. That is the pattern Anthropic documents for a growing conversation, in which a request reads the entry the previous request's breakpoint wrote, up to 20 blocks back (`llmsdk_docs/claude4_6/docs/prompt-caching.md`, "How automatic prefix checking works"). On the Anthropic API the client sets the top-level `cache_control` instead, and no turn carries a marker.
- A Gemini TTS request has no prefix: both Google clients send only the newest message, because the model refuses a conversation.

### 6.5 Nothing is dropped silently

A message with nothing a client can send is refused before the request goes out ([MMSP-RFC-0003](MMSP-RFC-0003-message-requests.md#33-before-the-request) §3.3); it MUST NOT be dropped and MUST NOT be sent empty, so the request and the history hold the same turns.

## 7. The `mmsp` Client

The `mmsp` client sends items and their `fidelity` to its server unchanged; the server's upstream client replays them as §4 and §5 specify.

## 8. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`; `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`; `src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`.
- The message transforms (`transform_uni_message_to_model_input` / `transformUniMessageToModelInput`) under `src_py/mmsp/<client>/client.py` and `src_ts/src/<client>/client.ts`, none of which reads `created_at` or a later message, and the fidelity their event transforms record; outside the types and the stamping, only the tracer and the playground read `created_at`, to display it.
- `src_py/tests/test_reasoning_fidelity.py` and its mirror (the exact item a replay sends); `test_reasoning_replay_without_thinking.py`, `test_tool_call_arguments.py`, `test_message_order.py` and their mirrors.
- `test_stream_protocol.py` / `stream-protocol.test.ts`: the caller's messages gain `created_at` and nothing else; the history shares no object with the caller or the stream; a second stateful call raises `ConcurrentCallError`; an aborted call releases the client and records nothing; a conversation continues the history it was given; legacy item types are converted.
- `test_mmsp_server.py` / `mmsp-server.test.ts`, which record a stateful turn through the `mmsp` client with its `created_at`.
- The second round of the tool-use case of `test_client.py` / `client.test.ts`, which replays the tool-calling turn of every model in the catalog, its thinking included.
