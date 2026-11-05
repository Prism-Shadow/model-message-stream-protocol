> Source: https://openrouter.ai/docs/api_reference/errors-and-debugging.md (fetched 2026-11-04; excerpt: error codes, provider errors, streaming error formats, typed codes and the Chat Completions format; the Responses and Messages formats and the debug option are left out)

> ## Documentation Index
> Fetch the complete documentation index at: https://openrouter.ai/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Errors and Debugging

> API Errors and Debugging

For errors, OpenRouter returns a JSON response with the following shape:

```typescript lines theme={null}
type ErrorResponse = {
  error: {
    code: number;
    message: string;
    metadata?: Record<string, unknown>;
  };
};
```

The HTTP Response will have the same status code as `error.code`, forming a request error if:

* Your original request is invalid
* Your API key/account is out of credits

Otherwise, the returned HTTP response status will be `200` and any error occurred while the LLM is producing the output will be emitted in the response body or as an SSE data event.

Example code for printing errors in JavaScript:

```typescript lines theme={null}
const request = await fetch('https://openrouter.ai/...');
console.log(request.status); // Will be an error code unless the model started processing your request
const response = await request.json();
console.error(response.error?.code); // Will be an error code
console.error(response.error?.message);
```

## Error codes

* **400**: Bad Request (invalid or missing params, CORS)
* **401**: Invalid credentials (OAuth session expired, disabled/invalid API key)
* **402**: Your account or API key has insufficient credits. Add more credits and retry the request.
* **403**: Forbidden (insufficient permissions, guardrail block, or moderation flag)
* **408**: Your request timed out
* **429**: You are being rate limited
* **502**: Your chosen model is down or we received an invalid response from it
* **503**: There is no available model provider that meets your routing requirements

## Retry-After header

On `429` and `503` responses, and on `402` responses whose `error.metadata.limit_source` is `openrouter_in_flight_budget` (see [In-flight spending budget](https://openrouter.ai/docs/api_reference/limits.md#in-flight-spending-budget)), OpenRouter may include a standard HTTP `Retry-After` response header indicating how many seconds to wait before retrying. A `402` without the header is not a wait-and-retry case; see [Handling 402 errors](https://openrouter.ai/docs/api_reference/limits.md#handling-402-errors).

```http lines theme={null}
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

The OpenAI SDK, Anthropic SDK, Vercel AI SDK, and OpenRouter SDK already respect this header for backoff on the statuses each SDK retries automatically. None of them retries a `402` on its own, so for the in-flight budget case catch the error, read `Retry-After`, and retry explicitly. If you're using `fetch` directly, honor it before retrying:

```typescript lines theme={null}
const res = await fetch('https://openrouter.ai/api/v1/responses', { ... });
if (res.status === 429 || res.status === 503 || res.status === 402) {
  const retryAfter = Number(res.headers.get('Retry-After'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    // retry the request
  }
}
```

## Moderation errors

If your input was flagged, the `error.metadata` will contain information about the issue. The shape of the metadata is as follows:

```typescript lines theme={null}
type ModerationErrorMetadata = {
  reasons: string[]; // Why your input was flagged
  flagged_input: string; // The text segment that was flagged, limited to 100 characters. If the flagged input is longer than 100 characters, it will be truncated in the middle and replaced with ...
  provider_name: string; // The name of the provider that requested moderation
  model_slug: string;
};
```

## Budget errors

When a guardrail budget, a workspace budget, or the key's own limit is spent, the request is rejected with a `403` before it reaches a provider. The message ends with the figures (`$X of $Y used; resets <ISO instant>.`), and `error.metadata` carries the same values as fields so you can branch on them:

```json lines theme={null}
{
  "error": {
    "code": 403,
    "message": "Budget limit exceeded (weekly limit). Contact your org admin. $52.00 of $50.00 used; resets 2026-10-12T00:00:00.000Z.",
    "metadata": {
      "limit_source": "openrouter_guardrail_budget",
      "remedy_hint": "Wait for the budget window to reset (see metadata.resets_at), or ask your org admin to raise the guardrail budget.",
      "scope": "workspace_default_member",
      "limit_usd": 50,
      "spend_usd": 52,
      "resets_at": "2026-10-12T00:00:00.000Z"
    }
  }
}
```

| Field | Meaning |
| - | - |
| `limit_source` | `openrouter_guardrail_budget`, `openrouter_workspace_budget`, or `openrouter_key_limit` |
| `scope` | Which layer blocked: `workspace_default_member`, `workspace_default_key`, `member`, `api_key`, `workspace`, or `key_limit`, as listed by `GET /api/v1/key` |
| `limit_usd` | The budget's limit in USD |
| `spend_usd` | The spend counted against it in the current window |
| `resets_at` | ISO 8601 UTC instant the window rolls over, or `null` for a lifetime budget |
| `remedy_hint` | A one-line next step for people reading logs; branch on `limit_source`, not on this text |

`GET /api/v1/key` reports the same budgets before they block, under `budgets` and `effective_budget`; see [Budget limits](https://openrouter.ai/docs/api_reference/limits.md#budget-limits).

## Guardrail errors

On inference endpoints (`/chat/completions`, `/responses`, `/messages`), a request can be blocked before it reaches a provider — for example by a content filter or prompt-injection detector configured via [guardrails](https://openrouter.ai/docs/guides/features/guardrails.md). When this happens, the response is a `403` with a message describing the block reason. The OpenRouter-shaped body below applies to `/chat/completions` and `/responses`; on `/messages` the block is returned as an Anthropic `permission_error` envelope (see [Anthropic Messages](#anthropic-messages-apiv1messages) below), with `openrouter_metadata` still carried at the top level when opted in:

```json lines theme={null}
{
  "error": {
    "code": 403,
    "message": "Request blocked: prompt injection patterns detected",
    "metadata": {
      "patterns": ["ignore all previous instructions"]
    }
  }
}
```

When you opt in to [router metadata](https://openrouter.ai/docs/guides/features/router-metadata.md) via the `X-OpenRouter-Experimental-Metadata: enabled` header, the 403 response also includes the full `openrouter_metadata` object with routing context and a `pipeline` array detailing the guardrail stages that ran:

```json expandable lines theme={null}
{
  "error": {
    "code": 403,
    "message": "Request blocked: prompt injection patterns detected",
    "metadata": {
      "patterns": ["ignore all previous instructions"]
    }
  },
  "openrouter_metadata": {
    "requested": "openai/gpt-4o",
    "strategy": "direct",
    "region": "iad",
    "summary": "available=1",
    "attempt": 1,
    "is_byok": false,
    "endpoints": {
      "total": 1,
      "available": [
        { "provider": "OpenAI", "model": "openai/gpt-4o", "selected": false }
      ]
    },
    "pipeline": [
      {
        "type": "guardrail",
        "name": "regex_pi_detection",
        "guardrail_id": "grd_abc123",
        "guardrail_scope": "api-key",
        "summary": "Blocked: prompt injection detected (1 pattern matched)",
        "data": {
          "action": "blocked",
          "detected": true,
          "engines": ["regex"],
          "patterns": ["ignore all previous instructions"]
        }
      }
    ]
  }
}
```

The `openrouter_metadata` object follows the same shape as on successful responses — see [Pipeline Stages](https://openrouter.ai/docs/guides/features/router-metadata.md#pipeline-stages) for the full stage type and field reference.

## Provider errors

OpenRouter normalizes every upstream provider error into the stable, typed `error_type` vocabulary documented under [Typed Error Codes](#typed-error-codes). The same `error_type` values describe what went wrong whether the provider error arrives in a non-streaming response body or as a mid-stream SSE event. Native protocol codes (the Anthropic `error.type`, the Responses `error.code`) are best-effort and can differ between formats — `error_type` is the field to rely on across all of them.

For Chat Completions, a provider error that interrupts generation carries `error_type` inside `error.metadata`:

```json lines theme={null}
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded",
    "metadata": {
      "error_type": "rate_limit_exceeded",
      "provider_code": "rate_limited"
    }
  }
}
```

The same value is carried on mid-stream errors and on the Anthropic and Responses skins — see [Skin-Specific Error Formats](#skin-specific-error-formats) for the exact wire location in each format.

### Masking and raw provider details

When a request fails with a `500`, the `message` is replaced with a generic string and `provider_code` and `openrouter_metadata` are omitted, but `error_type` is still present (`server`).

For non-500 errors, the upstream provider's own error code is surfaced in `error.metadata.provider_code` when available. Opt-in routing context (which provider was selected, fallback attempts, etc.) is carried in the `openrouter_metadata` object when the request sets `X-OpenRouter-Metadata` — it follows the same shape as on successful responses (routing-summary fields only; see [Pipeline Stages](https://openrouter.ai/docs/guides/features/router-metadata.md#pipeline-stages)).

## When no content is generated

Occasionally, the model may not generate any content. This typically occurs when:

* The model is warming up from a cold start
* The system is scaling up to handle more requests
* A reasoning model spent the whole `max_tokens` budget on reasoning. The response is a `200` with `finish_reason: "length"`, empty `content`, and `usage.completion_tokens_details.reasoning_tokens` close to `usage.completion_tokens`. Retrying does not help; raise `max_tokens` or cap reasoning instead. See [Reasoning tokens and max\_tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens.md#reasoning-tokens-and-max_tokens).

Warm-up times usually range from a few seconds to a few minutes, depending on the model and provider.

If you encounter persistent no-content issues, consider implementing a simple retry mechanism or trying again with a different provider or model that has more recent activity.

In some cases, you may still be charged for the prompt processing cost by the upstream provider, even if no content is generated.

## Streaming error formats

When using streaming mode (`stream: true`), errors are handled differently depending on when they occur:

### Pre-stream errors

Errors that occur before any tokens are sent follow the standard error format above, with appropriate HTTP status codes. At this stage the HTTP response hasn't been committed yet, so OpenRouter can:

* Return a proper HTTP error status (4xx/5xx)
* Silently retry with a different provider endpoint if [fallback routing](https://openrouter.ai/docs/guides/routing/provider-selection.md) is enabled
* Apply rate-limit or auth checks before any work begins

You'll see pre-stream errors for issues like invalid API keys, malformed requests, or when every available provider endpoint is exhausted before streaming starts.

### Mid-stream errors

OpenRouter sends you the HTTP `200 OK` status and headers as soon as the provider accepts the request. That happens before the model produces a single token, and an HTTP status is final once sent.

Every failure after that point is therefore reported inside the response instead of in the status. A streaming request receives an SSE error event; a non-streaming request receives an error body. This includes provider errors that arrive before any token. Failover also stops once part of the answer has reached you, since your application already holds output from the first provider.

Common causes of mid-stream errors:

* **Provider disconnect** — the upstream connection drops after partial output (network issue, provider crash, load balancer timeout)
* **Provider timeout** — the model stops responding mid-generation and the read deadline expires
* **Token limit hit during generation** — the model reaches `max_tokens` or the context window fills up while producing output
* **Output content filter** — a content moderation system flags generated text after some of it was already streamed
* **Provider overload** — the upstream returns a rate-limit or capacity error after beginning to stream

> [!NOTE]
>
> If an attempt fails before any tokens reach you, OpenRouter automatically tries a backup provider. The `200 OK` has already been sent by then, so the status stays `200` even when every provider fails — the last error reaches you in the response body.

On Chat Completions (`/api/v1/chat/completions`), mid-stream errors are sent as Server-Sent Events (SSE) with a unified structure that includes both the error details and a completion choice. The Responses API uses its own event types; see [Responses API](#responses-api-apiv1responses).

```typescript expandable lines theme={null}
type MidStreamError = {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  provider: string;
  error: {
    code: number;       // HTTP status code (e.g. 400, 429, 502)
    message: string;
    metadata?: {
      error_type: string;     // Typed error code — see table below
      provider_code?: string; // Original upstream error code (omitted on 500s)
    };
  };
  choices: [{
    index: 0;
    delta: { content: '' };
    finish_reason: 'error';
    native_finish_reason?: string;
  }];
};
```

Example SSE data:

```text lines theme={null}
data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1234567890,"model":"openai/gpt-4o","provider":"OpenAI","error":{"code":429,"message":"Rate limit exceeded","metadata":{"error_type":"rate_limit_exceeded"}},"choices":[{"index":0,"delta":{"content":""},"finish_reason":"error"}]}
```

Key characteristics:

* The error appears at the **top level** alongside standard response fields
* `error.metadata.error_type` carries a typed code you can switch on programmatically — see [Typed Error Codes](#typed-error-codes) for the full list
* A `choices` array is included with `finish_reason: "error"` to properly terminate the stream
* The HTTP status remains `200 OK`, because the headers were sent before the error occurred
* The stream is terminated after this event
* On 500-class errors, `error.message` is replaced with a generic string and `provider_code` is omitted to prevent leaking upstream details

#### Non-streaming requests

Non-streaming requests send the status at the same point. If the provider returns headers and then fails, you receive a `200 OK` whose JSON body holds only an `error` object and no `choices`; its `id` identifies the generation when you report the failure. Check the body for an `error` field even on a `200`, rather than relying on the status alone.

## Typed error codes

When a provider error reaches your application, OpenRouter tags it with a canonical `error_type` string — both on the non-streaming response body and on mid-stream SSE events. Use this value, not the HTTP status code alone, to programmatically distinguish error categories. It is stable across all three API skins even when the native protocol code is lossy.

Where `error_type` appears depends on the skin and path:

* **Chat Completions**: `error.metadata.error_type` — on the mid-stream error chunk (see [Mid-Stream Errors](#mid-stream-errors)) and on the non-streaming response when a provider error interrupts generation.
* **Anthropic Messages**: `error.error_type` on the SSE `error` event and the non-streaming error envelope.
* **Responses**: top-level `error_type` on the failed response, for both the streaming `response.failed` event and the non-streaming JSON body.

The HTTP status each `error_type` maps to is listed in the tables below.

### Token and length limits

| `error_type` | HTTP Status | Description |
| - | - | - |
| `context_length_exceeded` | 400 | The combined input and output tokens exceed the model's context window. |
| `max_tokens_exceeded` | 400 | Generation stopped because the output token limit (`max_output_tokens` on the Responses API, `max_tokens` or `max_completion_tokens` on Chat Completions) was reached. |
| `token_limit_exceeded` | 400 | A token budget enforced by OpenRouter (e.g. credit-based cap) was exceeded. |
| `string_too_long` | 400 | A single string field in the request (system prompt, user message, etc.) exceeded the provider's per-field character limit. |

### Authentication and authorization

| `error_type` | HTTP Status | Description |
| - | - | - |
| `authentication` | 401 | The API key is missing, invalid, or revoked. |
| `permission_denied` | 403 | The key is valid but lacks the required permission or the request was blocked by a [guardrail](https://openrouter.ai/docs/guides/features/guardrails.md). |
| `payment_required` | 402 | The account or API key has insufficient credits. [Add credits](https://openrouter.ai/credits) and retry. |

### Rate limiting and availability

| `error_type` | HTTP Status | Description |
| - | - | - |
| `rate_limit_exceeded` | 429 | Request- or token-level rate limit hit. Respect the `Retry-After` header before retrying. |
| `provider_overloaded` | 503 | The upstream provider is temporarily overloaded. Retry after a short delay. |
| `provider_unavailable` | 502 | The upstream provider returned an invalid or empty response. OpenRouter may auto-retry with another provider if fallback routing is enabled. |

### Request validation

| `error_type` | HTTP Status | Description |
| - | - | - |
| `invalid_request` | 400 | A request parameter is malformed or missing. |
| `invalid_prompt` | 400 | A specific message in the request (`input` on the Responses API, `messages` on Chat Completions) is invalid (e.g. unsupported role, empty content). |
| `not_found` | 404 | The requested resource (model, file, etc.) does not exist. |
| `precondition_failed` | 412 | A precondition header (e.g. `If-Match`) was not satisfied. |
| `payload_too_large` | 413 | The request body exceeds the maximum allowed size. |
| `unprocessable` | 422 | The request is syntactically valid but semantically unprocessable. |

### Content policy

| `error_type` | HTTP Status | Description |
| - | - | - |
| `content_policy_violation` | 403 | The input or output was flagged by a content filter that runs separately from the model (provider- or OpenRouter-level), such as Gemini's `SAFETY` block. |
| `refusal` | 403 | The provider reported a model refusal as an error rather than as output (e.g. Anthropic's "refused to respond" / usage-policy error envelopes). `error.message` carries the provider's explanation when one is available. |

Both policy types share one status: the request was understood and declined, so it is a 403 regardless of whether the model or a filter around it made the call, and regardless of the provider's own wire status. The two `error_type` values only tell you which mechanism declined it. `metadata.provider_name`, `metadata.provider_code`, and `metadata.raw` identify who declined and carry the provider's verbatim payload. The status is the same for every provider and skin, whether the block is the HTTP response or arrives mid-stream (in which case it is the `code` inside the error body, since the HTTP line was already committed).

A refusal that the model produces as its own completed output is not an error. When the provider answers successfully with a refusal (e.g. Anthropic's `stop_reason: "refusal"`), each API keeps its native successful shape: Chat Completions returns `message.refusal` with `finish_reason: "content_filter"`, and the Responses API returns `status: "incomplete"` with `incomplete_details.reason: "content_filter"` and a `refusal` content part. Fallback to another model still runs before any output is returned when routing allows it.

### Image errors

| `error_type` | HTTP Status | Description |
| - | - | - |
| `invalid_image` | 400 | An image in the request is corrupt or unreadable. |
| `image_too_large` | 400 | An image exceeds the provider's maximum file size or pixel dimensions. |
| `image_too_small` | 400 | An image is below the provider's minimum pixel dimensions. |
| `unsupported_image_format` | 400 | The image format is not supported by the provider. |
| `image_not_found` | 404 | The referenced image URL or file ID could not be resolved. |
| `image_download_failed` | 400 | OpenRouter could not download the image from the provided URL (DNS failure, timeout, non-200 response, etc.). |

### Generic

| `error_type` | HTTP Status | Description |
| - | - | - |
| `server` | 500 | An unexpected internal error. The upstream error message is masked on this type. |
| `timeout` | 504 | The provider did not respond within the allowed time. |
| `unmapped` | 500 | An upstream error that doesn't map to any known category. `error.metadata.provider_code` may contain the original code. |

## Skin-specific error formats

OpenRouter exposes three API skins. Each translates the same internal provider error types into its own wire format, for non-streaming responses and in-stream errors alike. In every case `error_type` is the stable field; the wire location differs per skin.

### Chat Completions (`/api/v1/chat/completions`)

Mid-stream errors appear as a `chat.completion.chunk` with a top-level `error` object (shape shown [above](#mid-stream-errors)). The `error.metadata.error_type` field carries the typed code.

For non-streaming requests where a provider error occurs, the error is embedded in the final response alongside any partial content:

```json lines theme={null}
{
  "choices": [{
    "message": { "role": "assistant", "content": "partial output..." },
    "finish_reason": "error",
    "error": {
      "code": 502,
      "message": "Provider disconnected mid-stream",
      "metadata": { "error_type": "provider_unavailable" }
    }
  }]
}
```
