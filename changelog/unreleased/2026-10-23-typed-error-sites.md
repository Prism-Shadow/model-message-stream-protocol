# Every bare raise in both packages retyped to an MMSP error

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `ant_messages`, `anthropic_official`, `deepseek_official`, `google_genai`, `google_official`, `minimax_official`, `moonshot_official`, `openai_chat`, `openai_embedding`, `openai_official`, `openai_responses`, `zai_official`, `auto_client`, `utils`
- **PR:** [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)

[中文版](2026-10-23-typed-error-sites.zh.md)

## What changed

- Every site in `src_py/mmsp` and `src_ts/src` outside `integration/` that raised a bare `ValueError` / `RuntimeError` / `NotImplementedError` or threw a bare `Error` raised the MMSP class for it instead, with the class's fields set. Each class is an `MMSPError`, so a `ValueError` in Python and an `Error` in TypeScript, and `ProviderStreamError` is also a `RuntimeError` in Python.
- The message text stayed as it was, except where the class composes its own: the missing-key refusal of the four OpenAI-SDK vendor clients read `<P>_API_KEY is required for <Client>: pass api_key or set <P>_API_KEY.` (`apiKey` in TypeScript) instead of `<P>_API_KEY is required for <Client>.`, and an unknown wire event under `MMSP_DEBUG` read `<Client> does not recognize the event <preview>` instead of `Unknown output: <event>`.
- `speaker_turns` / `speakerTurns` in `utils` took the client's name as a third argument, for the error it raises.
- `AutoLLMClient._streaming_response_internal` raised `UnsupportedOperationError` instead of `NotImplementedError` (Python); the TypeScript `_streamingResponseInternal` threw it instead of an `Error`.
- `test_message_order.py` / `message-order.test.ts` checked on every client that a tool result without `tool_call_id` and an item of an unknown kind raise `InvalidMessageError` with `item_type`; the unknown-event, credential, image-detail and routing tests asserted the new classes and that each is still the built-in it replaced.
- The mmsp-dev skill named the class for each kind of refusal, and the API references of the `mmsp-python` and `mmsp-typescript` skills named `RoutingError` for a model id of no known family.

## Raised for

| Site | Class | Fields |
| --- | --- | --- |
| an unknown client type, a model id of no known family, a client type with no class (`auto_client`) | `RoutingError` | `model`, `client_type` (`None` when nothing named one) |
| a Vertex AI service-account key given to `google_official` | `RoutingError` | `model`, `client_type="google-official"` |
| no key for `deepseek_official`, `minimax_official`, `moonshot_official`, `zai_official` | `ApiKeyRequiredError` | `client`, `client_type`, `base_url=None` |
| an image that is not valid base64 or cannot be fetched | `InvalidMessageError` | `client`, `item_type="image_url"` |
| a tool result without `tool_call_id` | `InvalidMessageError` | `client`, `item_type="tool_result"` |
| an item of an unknown kind | `InvalidMessageError` | `client`, `item_type` = the item's type |
| a two-speaker TTS script without its speaker labels | `InvalidMessageError` | `client`, `item_type="text"` |
| an image on a text-only DeepSeek or GLM model, in a message or a tool result | `UnsupportedContentError` | `client`, `item_type="image_url"` / `"tool_result"` |
| an item other than text for Gemini TTS or OpenAI embeddings | `UnsupportedContentError` | `client`, `item_type` = the item's type |
| an unknown wire event with `MMSP_DEBUG` set | `UnknownEventError` | `client`, `event` |
| a Gemini Interactions `error` event | `ProviderStreamError` | `client`, `code` |
| `AutoLLMClient`'s internal streaming method | `UnsupportedOperationError` | `client="AutoLLMClient"`, `operation` |
