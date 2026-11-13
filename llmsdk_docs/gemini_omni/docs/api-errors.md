> Source: https://aistudio.google.com/docs/api-errors.md (snapshot 2026-11-06)
>
> The site's "AI Agent Context" preamble removed; everything else verbatim.

# API errors

This page provides a reference for all Interactions API error codes, describes the
error response format, and explains how the API delivers errors for different request types.

## Standard API error codes  {% id="api-error-codes" %}

These general request-level error codes correspond to standard HTTP status codes.
Use the `code` field in your application logic to handle errors programmatically.

| Code | HTTP Status | Description | Recommended action |
| :--- | :--- | :--- | :--- |
| `invalid_request` | 400 Bad Request | The request payload is malformed or contains invalid parameters. | Check your request syntax and parameters against the [API reference](https://ai.google.dev/api/interactions-api). |
| `failed_precondition` | 400 Bad Request | The request cannot be processed because a prerequisite is not met (for example, disabled billing). | Verify project billing status or account prerequisites. |
| `out_of_range` | 416 Requested Range Not Satisfiable | Request parameter is outside the valid range. | Check parameter values and limits. |
| `parameter_unknown` | 400 Bad Request | The request contains an unknown parameter. | Remove the unrecognized parameter and retry. |
| `authentication` | 401 Unauthorized | The API key is missing, invalid, or expired. | Verify your [API key](/docs/api-key). |
| `payment_required` | 402 Payment Required | Your Prepay credit balance is depleted. | [Add credits](/docs/billing#buy-credits) to your billing account, or turn on [auto-reload](/docs/billing#auto-reload). Don't retry: the request won't succeed until credits are added. |
| `permission_denied` | 403 Forbidden | Your API key lacks permission for this resource, or your project is restricted or requires verification or billing changes. | Check your API key permissions, [verification status](/docs/verification), and billing status. See [Project restricted or unavailable](/docs/troubleshooting#project-unavailable). |
| `not_found` | 404 Not Found | The requested resource was not found. | Verify the resource path and parameters. |
| `model_not_found` | 404 Not Found | The specified model was not found. | Verify the model name or fall back to a different model. |
| `already_exists` | 409 Conflict | The entity you attempted to create already exists. | Check if the resource already exists before re-creating. |
| `aborted` | 409 Conflict | The operation was aborted due to a conflict or concurrency check failure. | Retry the request at a higher application level. |
| `rate_limit_exceeded` | 429 Too Many Requests | You have exceeded the per-minute or per-second request or token limit. | Wait and retry with exponential backoff. |
| `quota_exceeded` | 429 Too Many Requests | You have exceeded your daily quota. | Wait until the quota resets or request a quota increase. |
| `too_many_requests` | 429 Too Many Requests | You have made too many requests in a short period of time. | Wait and retry with exponential backoff. |
| `cancelled` | 499 Client Closed Request | The client cancelled the request before it completed. | No action needed. This usually means the client disconnected. |
| `api_error` | 500 Internal Server Error | An unexpected error occurred on the server. | Retry the request. If it persists, contact support. |
| `unimplemented` | 501 Not Implemented | The operation or feature is not implemented or supported. | Check API capabilities or switch to a supported feature. |
| `service_unavailable` | 503 Service Unavailable | The service is temporarily overloaded or down. | Wait and retry with exponential backoff. |
| `deadline_exceeded` | 504 Gateway Timeout | The request didn't finish within the deadline. | Remove or increase client deadline setting to use the server default. |

{% callout type="note" %}
  Any error code not listed above falls back to the `snake_case` version of the HTTP status.

{% /callout %}

## Generation blocked codes  {% id="generation-blocked-codes" %}

These error codes indicate that policy, safety, or content restrictions blocked the model's output. When you receive one of these codes, modify your input and retry.

| Code | Description |
| :--- | :--- |
| `safety` | Safety violations (harmful content) blocked the request. |
| `recitation` | Copyright or recitation restrictions blocked the request. |
| `language` | An unsupported language blocked the request. |
| `prohibited_content` | Prohibited content guidelines blocked the request. |
| `spii` | Sensitive Personally Identifiable Information restrictions blocked the request. |
| `blocklist` | Prohibited terms on a blocklist blocked the request. |
| `image_safety` | Safety violations blocked image generation. |
| `image_prohibited_content` | Prohibited content guidelines blocked image generation. |
| `image_recitation` | Copyright or recitation restrictions blocked image generation. |
| `image_other` | Unspecified reasons blocked image generation. |
| `content_blocked` | An unspecified policy reason blocked the request. |

## Generation error codes  {% id="generation-error-codes" %}

These error codes indicate a structural issue with the model's generated output (such as a malformed function call or an undeclared tool call).

| Code | Description |
| :--- | :--- |
| `malformed_function_call` | The model produced a function call that could not be parsed. |
| `malformed_tool_call` | The model produced a tool call that could not be parsed. |
| `unexpected_tool_call` | The model called a tool that was not declared in the request. |
| `no_image` | The model was unable to generate an image. |
| `too_many_tool_calls` | The model generated more tool calls than allowed. |
| `missing_thought_signature` | The response is missing a required thought signature. |

## Error response format  {% id="error-schema" %}

All errors from the Interactions API return an `error` object containing a `code` and `message`. For example, passing an unsupported tool type returns:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The value 'invalid_tool_type_xyz' is not supported for 'type' at 'tools[0]'. Supported values: 'function', 'code_execution', 'mcp_server', 'filesystem', 'google_maps', 'google_search', 'bash', 'computer_use', 'file_search', 'url_context'."
  }
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | string | A machine-readable error code in `snake_case`. |
| `message` | string | A human-readable description of what went wrong. |

## How errors are delivered  {% id="error-delivery" %}

The API delivers errors differently depending on whether you make a standard HTTP request or a streaming (SSE) request.

### Standard HTTP requests  {% id="http-errors" %}

For standard (non-streaming) requests, the API sets the HTTP response status code (such as `400 Bad Request`, `401 Unauthorized`, or `429 Too Many Requests`) and returns an `error` object in the JSON response body:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The value 'invalid_tool_type_xyz' is not supported for 'type' at 'tools[0]'."
  }
}
```

### Streaming (SSE) requests  {% id="sse-errors" %}

For streaming requests (`stream: true`), the API sends error events over the Server-Sent Events (SSE) stream with `event_type` set to `"error"`. The `error` field contains the same `code` and `message` structure:

```json
{
  "event_type": "error",
  "error": {
    "code": "not_found",
    "message": "Failed to get completed interaction: Result not found."
  }
}
```

For the full SSE event schema, see the [Interactions API Reference](https://ai.google.dev/api/interactions-api).

## What's next  {% id="whats-next" %}

* [API troubleshooting](/docs/troubleshooting): Resolve common issues and error scenarios.
* [Rate limits](/docs/rate-limits): Learn about request limits and quota handling.

