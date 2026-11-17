# MMSP-RFC-0002, 0003 and 0009 kept a tool call's arguments as JSON text

- **Date:** 2026-11-17
- **Type:** process
- **Scope:** `design`
- **PR:** [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)

[中文版](2026-11-17-tool-call-arguments-text-rfc.zh.md)

## What changed

- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) Message Protocol, edited in place in both languages, with the case added to its Introduction. §3.4 made a `tool_call` item's `arguments` a string, the JSON text of the call's arguments as the model wrote it, which a replay sends as it is where the wire takes a string and parses only where the wire takes an object.
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests, edited in place in both languages, with the case added to its Introduction. §4.3 had `StreamItems` keep the joined text, `{}` where the fragments joined to nothing, once it parses as a JSON object, in place of the parsed object; §3.3 had a tool call whose `arguments` is not the JSON text of an object raise `InvalidMessageError` before the request.
- [MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.md) Protocol Conversion, edited in place in both languages, with the case added to its Introduction. §7 read a tool call's `arguments` recorded as an object, as releases up to 0.5.8 recorded them, until 0.6.0, `normalize_legacy_messages` turning it into its JSON text.
