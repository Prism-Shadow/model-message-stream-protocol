# The Chat Completions client records a gateway's encrypted reasoning block under the shared fidelity keys

- **Date:** 2026-10-23
- **Type:** refactor
- **Scope:** `openai_chat`, `tests`, `site`, `skills`
- **PR:** [#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287)

[中文版](2026-10-23-openai-chat-generic-fidelity.zh.md)

## What changed

- `OpenaiChatClient`, and `OpenaiChatVllmAdapterClient` with it, recorded a `reasoning.encrypted` block of `delta.reasoning_details` as the thinking item's `fidelity.encrypted_content`, with the block's `format` and, as `reasoning_id`, its `id`. The block's `type` and `index` were not recorded. Before, the block was kept whole as `fidelity.reasoning_details`.
- A replayed assistant turn rebuilt the block from those keys as `reasoning_details`, in item order, as `{type: reasoning.encrypted, data, format, id}`. A thinking item whose `encrypted_content` carries no `format` sent no block.
- A `reasoning.summary` or `reasoning.text` block streamed as thinking text, with no fidelity, as before.
- The client read `reasoning_details` as a Chat Completions extension, from whichever endpoint sends it; the comments that named a gateway were reworded.
- Thinking items recorded by 0.5.5 with `fidelity.reasoning_details` were replayed as received, until 0.6.0.
- The fidelity page and the mmsp-dev skill name the keys.
