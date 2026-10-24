---
description: The errors MMSP raises, what each one carries, and what to do about it.
---

Every error MMSP raises is an `MMSPError`, named for what went wrong. In Python it is a subclass of `ValueError`, and `ProviderStreamError` is also a `RuntimeError`; in TypeScript it extends `Error`. Code that catches those built-in classes keeps catching every MMSP error.

A stream ends with its `stop` event or with an exception, never both. When one is raised, the `stop` event is not sent and the stateful history stays as it was.

## While streaming

| Error | Raised when | Carries |
| --- | --- | --- |
| `ToolCallArgumentParseError` | The arguments of a tool call are malformed, cut short, or not a JSON object. Raised in place of the `tool_call.done`. | `client`, the tool name, the tool call id, the length and a preview of the raw arguments |
| `EmptyResponseError` | The response finished with thinking and nothing else. Sent back on the next turn, such a message fails with a 400. Raised in place of the `stop` event. | `client`, the finish reason, and `usage_metadata`, so the tokens can still be counted |
| `IncompleteStreamError` | The provider's stream ended before its usage or its finish reason arrived. The stream was cut short, so retry. Raised in place of the `stop` event. | `client`, `missing`, and the `finish_reason` and `usage_metadata` that did arrive |
| `StreamProtocolError` | A client produced a stream that breaks [the grammar](/docs/streaming/). This is a bug in MMSP, not in the model's output. | `client` |
| `ProviderStreamError` | The provider reported an error inside an open stream, such as Gemini Interactions' `error` event. | `client`, `code`, and the provider's message |

For `ToolCallArgumentParseError`, log the preview and retry or re-prompt the model. Never run a tool from partial arguments.

Python names the fields `tool_name`, `tool_call_id`, `raw_arguments_length`, `raw_arguments_preview`, `finish_reason` and `usage_metadata`; TypeScript names them `toolName`, `toolCallId`, `rawArgumentsLength`, `rawArgumentsPreview`, `finishReason` and `usageMetadata`.

## Before the request

| Error | Raised when | Carries |
| --- | --- | --- |
| `UnsupportedParameterError` | A `UniConfig` value the model rejects, such as `temperature` on a model that fixes it. | `client`, `parameter` |
| `UnsupportedContentError` | A well-formed item the model cannot take: an image on a text-only model, an item other than text for embeddings or speech. | `client`, `item_type` |
| `InvalidMessageError` | A message cannot be sent as it is: an item of an unknown kind, a tool result without `tool_call_id`, an image that is not valid base64 or cannot be fetched, a TTS script without its speaker labels, or a message with nothing the wire can carry. | `client`, `item_type`, `message_index` |
| `UnsupportedOperationError` | A call the endpoint cannot serve, such as listing models on Amazon Bedrock. | `client`, `operation` |
| `ConcurrentCallError` | `streaming_response_stateful` was called while another stateful call on the same client had not ended. Two turns cannot be recorded in one history at once: wait for the first one's `stop` event or its error. | `client` |
| `RoutingError` | Neither the `client_type` nor the model id names a client: an unknown `client_type`, or none and a model id of no known family ([model selection](/docs/models/)). Raised by `AutoLLMClient`. | `model`, `client_type` |
| `ApiKeyRequiredError` | A client was built with a `base_url` and no `api_key`, and the URL is not the client's default endpoint, so the environment's key may not go there ([the rule](/docs/client/)); or a client that cannot call its endpoint without a key got none, neither passed nor in its `<P>_API_KEY`, and `base_url` is `None`. Raised by the constructor. | `client`, `client_type`, `api_key_env`, `base_url_env`, `base_url` |

`item_type` and `message_index` are `None` when the error is not about one item or one message. `ApiKeyRequiredError`'s message names the fix: pass the key, or set the variable; for a `base_url`, drop it and set the variables. TypeScript names the fields `itemType`, `messageIndex`, `clientType`, `apiKeyEnv`, `baseUrlEnv` and `baseUrl` (`null` where Python has `None`), and the method `streamingResponseStateful`.

Thinking levels never raise. Every client maps the level you ask for to the closest one the model supports.

## Through an MMSP server

The [`mmsp` client](/docs/server/) raises one error for anything its server reports.

| Error | Raised when | Carries |
| --- | --- | --- |
| `UpstreamError` | The server refused the request (a wrong key, a model not in its table, a malformed body), or its client raised an error | `client`, `status`, `error_type`, `message`, `error` |

`client` is `MmspClient`. `status` is the HTTP status of a refusal, else the upstream's own, such as a 429, when the error names one. `error_type` is the server-side class, such as `AuthenticationError`, `NotFoundError`, `EmptyResponseError`, `InvalidMessageError` or `RuntimeError`. `error` is the error object as the server sent it: every MMSP error arrives with its fields, in Python's names, such as `parameter`, `item_type` or `usage_metadata`. TypeScript names them `errorType` and `error`.

## Output MMSP does not recognize

Gateways put their own frames into a stream: heartbeats, cost tickers. MMSP skips what it does not recognize, so one such frame cannot end a long generation.

Set the environment variable `MMSP_DEBUG` to anything other than `0`, `false`, `no` or `off` and it raises `UnknownEventError` instead, carrying `client` and `event`, a preview of the frame. That is what you want while adding a provider.
