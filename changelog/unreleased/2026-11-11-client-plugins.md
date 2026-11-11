# Client plugins, and Mistral's thinking chunks and reasoning effort on openai-chat

- **Date:** 2026-11-11
- **Type:** fix
- **Scope:** `base_client`, `plugin`, `openai_chat`, `openai_responses`, `ant_messages`, `tests`, `site`
- **PR:** pending
- **Issue:** [#320](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/320), [#321](https://github.com/Prism-Shadow/model-message-stream-protocol/issues/321)

[中文版](2026-11-11-client-plugins.zh.md)

## What changed

- Both packages gained `ClientPlugin` and `enabled_plugins` / `enabledPlugins` (`src_py/mmsp/plugin.py`, `src_ts/src/plugin.ts`), as [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.md) §9 specifies. The base class keeps a client's enabled plugins as `_plugins`. `openai-chat`, `openai-responses` and `ant-messages` build theirs from their `plugins/` folder and call `on_request` / `onRequest` before the SDK call, `on_wire_event` / `onWireEvent` before the event transform and `on_event` / `onEvent` after it.
- `openai-chat` read Mistral's thinking, streamed as content chunks inside `delta.content`, as `reasoning_content` thinking, where the chunks had been joined into the text as `[object Object]` in TypeScript. It sent that thinking back as a thinking chunk ahead of the turn's content, never as a reasoning field, which Mistral refuses with 422 `extra_forbidden`. And it sent `reasoning_effort` to a model Mistral's model list marks `capabilities.reasoning`, reading the list once per client. All three come from its `mistral` plugin, enabled on `mistral.ai`, ported from [#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322) and [#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323) by ParaN3xus.
- The correction of OpenRouter's completion tokens moved out of the transforms of `openai-chat` and `ant-messages` into their `openrouter` plugins. GPT-6's `none` as `low` on `openai-responses`, and the image `detail: "high"` for GPT-5.6 and GPT-6 on `openai-chat` and `openai-responses`, moved into their `gpt` plugins. What each sends is unchanged.

## Configuration behavior

| Key | Client and endpoint | Sent |
| --- | --- | --- |
| `thinking_level` | `openai-chat` on `mistral.ai`, a model whose `capabilities.reasoning` is true | `reasoning_effort`: `low` for `low`, `high` for `medium` and `high`, `xhigh`, `max`; nothing for `none` |
| `thinking_level` | `openai-chat` on `mistral.ai`, any other model | nothing |
