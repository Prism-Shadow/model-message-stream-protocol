# History copies, one stateful call at a time, and messages with nothing to send

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `base_client`, `mmsp`, `openai_embedding`
- **PR:** [#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291)
- **Breaking:** yes — `get_history()` and `set_history()` copy the history deeply, a second `streaming_response_stateful` while one is in flight raises `ConcurrentCallError`, and a message with nothing a client can send raises `InvalidMessageError` where it was dropped or sent empty

[中文版](2026-10-23-history-copies-and-empty-messages.zh.md)

## What changed

- `streaming_response_stateful` / `streamingResponseStateful` recorded deep copies of the message sent and of the assistant message, `get_history` / `getHistory` returned a deep copy and `set_history` / `setHistory` stored one, so the history shared no object with the caller or with the yielded events. Python used `copy.deepcopy`; TypeScript a copy that keeps a `Buffer` a `Buffer`, since `structuredClone` turns one into a bare `Uint8Array`.
- `streaming_response_stateful` raised `ConcurrentCallError` before sending anything while another stateful call on the same client had not ended. A call ended at its `stop` event, once its turn was recorded, at its error, or when its generator was closed. `AutoLLMClient` forwarded, so the wrapped client held the call; `streaming_response` was unaffected.
- `streaming_response` raised `InvalidMessageError` with `message_index` for a message whose `content_items` was empty after legacy normalization, before the request went out.
- Every message transform raised `InvalidMessageError` (`message <i> has nothing <Client> can send`) for a message whose wire form held nothing, or thinking alone: `openai_chat` (and so `openai_chat_vllm_adapter`), `zai_official` and `moonshot_official` where they dropped it; `anthropic_official` (the message ending `once its unsigned thinking is left out`) and `ant_messages` where they sent `content: []` or thinking blocks alone; `openai_official`, `openai_responses`, `deepseek_official` and `minimax_official` where a message yielded no item or a reasoning item alone; `google_official` where it yielded no step or thought steps alone; `google_genai` where it sent `parts=[]` or thought parts alone; `openai_embedding` where it sent `" "` for a message without text.
- `openai_embedding` paired each vector with its input by the vector's `index` instead of the order of `data`.
- The `mmsp` client stamped `created_at` on a message without one, through the base class's `_stamp_created_at` / `stampCreatedAt`, and raised `IncompleteStreamError` (`missing` both fields) when its server's stream ended, by `[DONE]` or by the end of the body, before a `stop` event, so its stateful call recorded nothing.
- Python stamped a message whose `created_at` was `None`, as TypeScript did one whose `created_at` was `null`; the class-level `_history = []` default of Python's `LLMClient` was removed.
- `test_stream_protocol.py` / `stream-protocol.test.ts` covered the caller's messages after a call, history isolation, the overlapping stateful call, an N-turn run from a given history, the empty message and the embedding order; `test_message_order.py` / `message-order.test.ts` an empty and a thinking-only message on every client; `test_mmsp_server.py` / `mmsp-server.test.ts` `[DONE]` before `stop` and `created_at` through the `mmsp` client.
- The client page of the site described the history copies, the one stateful call at a time and the messages that raise.

## Compatibility

- Change the recorded history through `set_history()` / `setHistory()`: editing a message `get_history()` returned, or one passed to `set_history()` or `streaming_response_stateful()`, no longer changes it.
- Run one stateful call at a time per client: read the stream to its `stop` event, or close it (`await stream.aclose()` in Python; `return()` or leaving `for await` in TypeScript), before the next `streaming_response_stateful`. Give each concurrent conversation its own client, or use the stateless `streaming_response`.
- Leave an empty message, or one of thinking alone, out of the list you send; `InvalidMessageError.message_index` / `messageIndex` names it. For embeddings, send no message without text.
