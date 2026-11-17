# A tool call's arguments are the JSON text the model wrote

- **Date:** 2026-11-17
- **Type:** feature
- **Scope:** `types`, `stream_items`, `legacy`, `base_client`, every client that sends tool calls, `integration`
- **PR:** [#340](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/340)
- **Breaking:** yes — `tool_call.done`'s `arguments` is a string, the JSON text of an object, in place of the parsed object

[中文版](2026-11-17-tool-call-arguments-text.zh.md)

## What changed

- `tool_call.done` carried `arguments` as the joined JSON text of its fragments, `{}` where they joined to nothing, in both packages, as [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) §3.4 and [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) §4.3 specify. `StreamItems` still checked that the text parses as a JSON object, raising `ToolCallArgumentParseError` where it did not, but no longer kept the parsed object. An integer such as 9007199254740993 and a decimal of more than 17 digits came out as the model wrote them, where the parse had turned them into 9007199254740992 in TypeScript and into the nearest float in both languages.
- The Responses and Chat Completions clients (`openai-official`, `openai-responses`, `openai-chat` and its vLLM adapter, `deepseek-official`, `minimax-official`, `moonshot-official`, `zai-official`) replayed the text as it was. The Anthropic clients and both Google clients parsed it only to build the object their wire takes, Messages' `input`, generateContent's `args` and Interactions' `arguments`. The two packages now send the same arguments on the Chat Completions and Responses wires, which had differed in their spacing.
- `streaming_response` raised `InvalidMessageError`, with `item_type` `tool_call.done` and the `message_index`, before the request, for a tool call whose `arguments` was not the JSON text of an object.
- `normalize_legacy_messages` turned a tool call's `arguments` recorded as an object, as releases up to 0.5.8 recorded it, into its JSON text, warning once per process, read until 0.6.0 ([MMSP-RFC-0009](../../design/rfcs/MMSP-RFC-0009-protocol-conversion.md) §7).
- The playground and the tracer showed the arguments as the model wrote them, with no parse to pretty-print them.
- The docs, the README, the examples and both skills parsed the arguments before running a tool.

## Compatibility

- A caller that reads `arguments` parses it first: `json.loads(item["arguments"])` in Python, `JSON.parse(item.arguments)` in TypeScript.
- A caller that builds a `tool_call.done` by hand passes the JSON text. An object is still accepted until 0.6.0, with a deprecation warning, and a history or a trace saved by 0.5.8 replays unchanged.
- What a wire that takes an object receives is unchanged: there the text is parsed at the boundary, and TypeScript keeps a number to 53 bits. What Gemini delivers as an object is serialized as before, holding what Gemini kept.
