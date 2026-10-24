# Typed error classes, relayed through the MMSP server with their fields

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `errors`, `wire`
- **PR:** [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)

[中文版](2026-10-23-typed-error-classes.zh.md)

## What changed

- `RoutingError`, `InvalidMessageError`, `UnsupportedContentError`, `UnknownEventError`, `ProviderStreamError` and `ConcurrentCallError` were added to `errors.py` / `errors.ts` and exported from `mmsp` and `@prismshadow/mmsp`. Each is an `MMSPError`, so a `ValueError` in Python and an `Error` in TypeScript; `ProviderStreamError` is also a `RuntimeError` in Python.
- `ApiKeyRequiredError` took `base_url=None` / `baseUrl: null` for a client given no key at all, with the message `<P>_API_KEY is required for <Client>: pass api_key or set <P>_API_KEY.` (`apiKey` in TypeScript).
- `to_wire_error` / `toWireError` sent every MMSP error with its fields: the six new classes, `ApiKeyRequiredError` and `UpstreamError` were added to the six already sent, so the `mmsp` client's `UpstreamError` names each in `error_type` / `errorType` and carries its fields in `error`.
- `test_mmsp_server.py` / `mmsp-server.test.ts` relayed every `MMSPError` subclass through the MMSP server and checked its `error_type` and fields at the `mmsp` client, and checked that every class is exported and caught as `ValueError` / `Error`, `ProviderStreamError` also as `RuntimeError`.
- The errors page of the site and the API references of the `mmsp-python` and `mmsp-typescript` skills listed the new classes.

## Error classes

| Class | Raised for | Python fields | TypeScript fields |
| --- | --- | --- | --- |
| `RoutingError` | neither the client type nor the model id names a client | `model`, `client_type` | `model`, `clientType` |
| `InvalidMessageError` | a message that cannot be sent as it is: an unknown item, a tool result without `tool_call_id`, an invalid image, a TTS script without speaker labels, a message with nothing to send | `client`, `item_type`, `message_index` | `client`, `itemType`, `messageIndex` |
| `UnsupportedContentError` | a well-formed item the model cannot take | `client`, `item_type` | `client`, `itemType` |
| `UnknownEventError` | a wire event a client does not recognize, with `MMSP_DEBUG` set | `client`, `event` (a preview cut to 72 characters at each end) | `client`, `event` |
| `ProviderStreamError` | an error the provider reports inside an open stream | `client`, `code` | `client`, `code` |
| `ConcurrentCallError` | a stateful call while another on the same client is in flight | `client` | `client` |
