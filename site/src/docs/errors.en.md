---
description: The errors MMSP raises, what each one carries, and what to do about it.
---

Every error MMSP raises is an `MMSPError`. In Python it is a subclass of `ValueError`; in TypeScript it extends `Error`.

A stream ends with its `stop` event or with an exception, never both. When one is raised, the `stop` event is not sent and the stateful history stays as it was.

## While streaming

| Error | Raised when | Carries |
| --- | --- | --- |
| `ToolCallArgumentParseError` | The arguments of a tool call are malformed, cut short, or not a JSON object. Raised in place of the `tool_call.done`. | `client`, the tool name, the tool call id, the length and a preview of the raw arguments |
| `EmptyResponseError` | The response finished with thinking and nothing else. Sent back on the next turn, such a message fails with a 400. Raised in place of the `stop` event. | `client`, the finish reason, and `usage_metadata`, so the tokens can still be counted |
| `StreamProtocolError` | A client produced a stream that breaks [the grammar](/docs/streaming/). This is a bug in MMSP, not in the model's output. | `client` |

For `ToolCallArgumentParseError`, log the preview and retry or re-prompt the model. Never run a tool from partial arguments.

Python names the fields `tool_name`, `tool_call_id`, `raw_arguments_length`, `raw_arguments_preview`, `finish_reason` and `usage_metadata`; TypeScript names them `toolName`, `toolCallId`, `rawArgumentsLength`, `rawArgumentsPreview`, `finishReason` and `usageMetadata`.

## Before the request

| Error | Raised when | Carries |
| --- | --- | --- |
| `UnsupportedParameterError` | A `UniConfig` value the model rejects, such as `temperature` on a model that fixes it. | `client`, `parameter` |
| `UnsupportedOperationError` | A call the endpoint cannot serve, such as listing models on Amazon Bedrock. | `client`, `operation` |

Thinking levels never raise. Every client maps the level you ask for to the closest one the model supports.

## Through an MMSP server

The [`mmsp` client](/docs/server/) raises one error for anything its server reports.

| Error | Raised when | Carries |
| --- | --- | --- |
| `UpstreamError` | The server refused the request (a wrong key, a model not in its table, a malformed body), or its client raised an error | `client`, `status`, `error_type`, `message`, `error` |

`client` is `MmspClient`. `status` is the HTTP status of a refusal, else the upstream's own, such as a 429, when the error names one. `error_type` is the server-side class, such as `AuthenticationError`, `NotFoundError`, `EmptyResponseError`, `UnsupportedParameterError` or `RuntimeError`. `error` is the error object as the server sent it, with that error's fields, such as `parameter` or `usage_metadata`. TypeScript names them `errorType` and `error`.

## Output MMSP does not recognize

Gateways put their own frames into a stream: heartbeats, cost tickers. MMSP skips what it does not recognize, so one such frame cannot end a long generation.

Set the environment variable `MMSP_DEBUG` to anything other than `0`, `false`, `no` or `off` and it raises instead. That is what you want while adding a provider.
