# The OpenAI Chat client reads Mistral's content chunks

- **Date:** 2026-11-07
- **Type:** fix
- **Scope:** `openai_chat`
- **Issue:** [#320](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/320)

[中文版](2026-11-07-openai-chat-content-chunks.zh.md)

## What changed

- A thinking model on a Mistral-compatible endpoint streams its thinking inside `delta.content` as content chunks, the thinking and the answer in one list. `transformModelOutputToUniEvent` / `transform_model_output_to_uni_event` took `delta.content` to be a string, so `StreamItems` joined chunk objects into `"[object Object]"`: the answer was lost inside the thinking, no thinking item was emitted, and a caller's history carried the text as if the model had said it.
- The chunks are now read as thinking and text in wire order — a `{type: "thinking", thinking: [{type: "text", text}]}` chunk becomes a `thinking.delta`, a `{type: "text", text}` chunk a `text.delta`, and a plain string is still one `text.delta`. A thinking delta's fidelity is `{item_id: "content", reasoning_field: "content"}`, which records that the thinking came through the content field.
- The same shape goes back: `transformUniMessageToModelInput` / `transform_uni_message_to_model_input` replay such a `thinking.done` inside `content` — `[{type: "thinking", thinking: [{type: "text", text}], closed: true}, …]` ahead of the answer — instead of through `reasoning_content`, which this endpoint rejects with `422 extra_forbidden`. It stays out of the replay field set, so a later tool-call turn is not sent an empty `reasoning_content` either.
- `tests/reasoning_fidelity` and `tests/test_reasoning_fidelity.py` cover a chunk stream's item split and its replayed message.
