# Client plugins in the specifications

- **Date:** 2026-11-11
- **Type:** process
- **Scope:** `design`
- **PR:** [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)

[中文版](2026-11-11-client-plugins-rfcs.zh.md)

## What changed

- [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.md) Protocol Conversion, edited in place, specified plugins in §2 and the new §9 (Conformance became §10). A compatible client speaks its protocol in its transforms as its reference client does, never branching there on its base URL or on a model id beyond its own protocol's markers, and what one endpoint or one vendor's models need beyond the protocol is a plugin. A plugin is a `ClientPlugin` subclass in its own file under the client's `plugins/` folder, listed in the folder's `PLUGINS`, and declares `hosts` (each matching itself and its subdomains) and/or `models` (a regular expression searched in the model id, case-insensitive). It is enabled when every condition it declares matches, the client building the list once in its constructor. Callers can neither add a plugin nor turn one off. The client calls `on_request` after the config and message transforms, `on_wire_event` before the event transform and `on_event` after it, each changing its argument in place. A plugin turns its endpoint's wire into the shape the transforms read and back, may keep what it read of its endpoint for the life of its client, and makes its requests through the client's SDK object.
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests: §6.1 limited a compatible client's transforms to its own protocol's markers and named the `gpt` plugins of `openai-chat` and `openai-responses` for GPT-6's `none` and GPT-5.6 and GPT-6's image `detail`. §6.3 had `openai-chat` send `reasoning_effort` on Mistral's endpoint through its `mistral` plugin, for a model Mistral's model list says reasons: `low` for `low`, `high` for `medium` and `high`, `xhigh` and `max` as they are, nothing for `none`.
- [MMSP-RFC-0004](../../design/rfcs/MMSP-RFC-0004-message-fidelity.md) Message Fidelity: §4 added that Mistral's endpoint, which refuses both reasoning fields, takes a Chat Completions turn's thinking back as a thinking chunk ahead of its content, and no field where the text is empty.
- `AGENTS.md` and the mmsp-dev skill stated the plugin rule.
