# The Chat Completions client keeps OpenRouter's encrypted reasoning_details fragment

- **Date:** 2026-10-22
- **Type:** fix
- **Scope:** `openai_chat`, `tests`, `site`
- **PR:** [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)

[中文版](2026-10-22-openai-chat-reasoning-details.zh.md)

## What changed

- `OpenaiChatClient`, and `OpenaiChatVllmAdapterClient` with it, read `delta.reasoning_details`. A `reasoning.summary` or `reasoning.text` fragment streamed as thinking text. The `reasoning.encrypted` fragment was recorded as received, as the thinking item's `fidelity.reasoning_details`. On OpenRouter that fragment carries GPT's encrypted reasoning (`format: openai-responses-v1`) and Gemini's thought signature (`format: google-gemini-v1`, under the id of the call it signs). This follows [MMSP-RFC-0011](../../design/rfcs/MMSP-RFC-0011-thinking-round-trip.md).
- A replayed assistant turn sent the recorded fragments back as `reasoning_details`, in item order, next to the thinking text. Before, OpenRouter accepted the turn without them and the model went on without its reasoning.
- For a chunk that carried `reasoning_details`, the client read the fragments, not the `reasoning` field that mirrors them. A thinking item from OpenRouter therefore recorded no `reasoning_field`, and its text went back through both `reasoning_content` and `reasoning`, which OpenRouter treats as one field. Endpoints that send no `reasoning_details` kept their `reasoning_content` / `reasoning` handling.
- Listed the fragment on the site's fidelity page.
