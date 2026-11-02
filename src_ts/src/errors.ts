// Copyright 2025 Prism Shadow. and/or its affiliates
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CLIENT_CREDENTIALS } from "./credentials";
import { FinishReason, UsageMetadata } from "./types";

function previewToolCallArguments(raw: string): string {
  const maxLength = 160;
  if (raw.length <= maxLength) {
    return raw;
  }
  const edgeLength = 72;
  return `${raw.slice(0, edgeLength)}...[truncated]...${raw.slice(-edgeLength)}`;
}

export class MMSPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MMSPError";
  }
}

/**
 * Raised when a UniConfig parameter value is not supported by the target model client.
 *
 * Thinking levels never raise this by design: every client maps each ThinkingLevel
 * onto the closest level the model supports. Parameters such as temperature and
 * tool_choice may reject unsupported values with this error.
 */
export class UnsupportedParameterError extends MMSPError {
  readonly client: string;
  readonly parameter: string;

  constructor(args: { client: string; parameter: string; message: string }) {
    super(args.message);
    this.name = "UnsupportedParameterError";
    this.client = args.client;
    this.parameter = args.parameter;
  }
}

/**
 * Raised at construction when a client has no key it may use: either it is given a base URL
 * without a key and the environment's key may not go there (only the client's default endpoint
 * and the endpoint `baseUrlEnv` names take `apiKeyEnv`, see environmentCredential in
 * `credentials`), or, with `baseUrl` null, it cannot call its endpoint without a key and is given
 * none, neither passed nor in `apiKeyEnv`.
 */
export class ApiKeyRequiredError extends MMSPError {
  readonly client: string;
  readonly clientType: string;
  readonly apiKeyEnv: string;
  readonly baseUrlEnv: string;
  readonly baseUrl: string | null;

  constructor(args: {
    client: string;
    clientType: string;
    baseUrl: string | null;
  }) {
    const { apiKeyEnv, baseUrlEnv, defaultBaseUrl } =
      CLIENT_CREDENTIALS[args.clientType];
    super(
      args.baseUrl === null
        ? `${apiKeyEnv} is required for ${args.client}: pass apiKey or set ${apiKeyEnv}.`
        : `apiKey is required for ${args.client} with baseUrl ${args.baseUrl}: ` +
            `${apiKeyEnv} is sent only to ${defaultBaseUrl} or to the endpoint ${baseUrlEnv} names. ` +
            `Pass apiKey, or drop baseUrl and set ${apiKeyEnv}, plus ${baseUrlEnv} for an endpoint ` +
            `other than ${defaultBaseUrl}.`,
    );
    this.name = "ApiKeyRequiredError";
    this.client = args.client;
    this.clientType = args.clientType;
    this.apiKeyEnv = apiKeyEnv;
    this.baseUrlEnv = baseUrlEnv;
    this.baseUrl = args.baseUrl;
  }
}

/**
 * Raised when a client cannot perform an operation at all, whatever it is passed.
 *
 * Distinct from UnsupportedParameterError, which rejects a UniConfig parameter value:
 * this one reports a capability the routed client does not have, such as listing models
 * through an SDK client that carries no models endpoint.
 */
export class UnsupportedOperationError extends MMSPError {
  readonly client: string;
  readonly operation: string;

  constructor(args: { client: string; operation: string; message: string }) {
    super(args.message);
    this.name = "UnsupportedOperationError";
    this.client = args.client;
    this.operation = args.operation;
  }
}

/**
 * Raised when a completed response carries no non-thinking content and no tool calls.
 *
 * Models occasionally finish a turn with thinking output only (reasoning models in
 * particular); replaying such an assistant message on the next turn fails with a 400
 * error, so the response is rejected as soon as the stream completes.
 */
export class EmptyResponseError extends MMSPError {
  readonly client: string;
  readonly finishReason: string | null;
  // the tokens the rejected response still cost, since no stop event carries them
  readonly usageMetadata: UsageMetadata | null;

  constructor(args: {
    client: string;
    finishReason: string | null;
    usageMetadata?: UsageMetadata | null;
  }) {
    super(
      `${args.client} returned no content other than thinking ` +
        `(finish_reason=${JSON.stringify(args.finishReason)}).`,
    );
    this.name = "EmptyResponseError";
    this.client = args.client;
    this.finishReason = args.finishReason;
    this.usageMetadata = args.usageMetadata ?? null;
  }
}

/**
 * Raised when the provider's stream ends before its usage or its finish reason arrived.
 *
 * The stream was cut short, so the request is worth retrying. It is thrown in place of the stop
 * event, after the items that did arrive, and carries the usage or finish reason that did, so the
 * tokens can still be counted.
 */
export class IncompleteStreamError extends MMSPError {
  readonly client: string;
  readonly missing: string[];
  readonly finishReason: FinishReason | null;
  readonly usageMetadata: UsageMetadata | null;

  constructor(args: {
    client: string;
    missing: string[];
    finishReason: FinishReason | null;
    usageMetadata: UsageMetadata | null;
  }) {
    super(
      `${args.client}'s stream ended without ${args.missing.join(" and ")}.`,
    );
    this.name = "IncompleteStreamError";
    this.client = args.client;
    this.missing = args.missing;
    this.finishReason = args.finishReason;
    this.usageMetadata = args.usageMetadata;
  }
}

/**
 * Raised when a client produces a stream that breaks the streaming protocol: a content item
 * that is not a delta, a second different fidelity within one item, a tool call whose first
 * delta lacks its name or id, or a delta event carrying usage or a finish reason.
 *
 * It always reports a bug in the client rather than in the provider's output, so it is
 * raised in every mode instead of being repaired into a stream that breaks the contract.
 */
export class StreamProtocolError extends MMSPError {
  readonly client: string;

  constructor(args: { client: string; message: string }) {
    super(`${args.client} broke the streaming protocol: ${args.message}`);
    this.name = "StreamProtocolError";
    this.client = args.client;
  }
}

export class ToolCallArgumentParseError extends MMSPError {
  readonly client: string;
  readonly toolName: string;
  readonly toolCallId: string;
  readonly rawArgumentsLength: number;
  readonly rawArgumentsPreview: string;

  constructor(args: {
    client: string;
    toolName: string;
    toolCallId: string;
    rawArguments: string;
    reason: string;
  }) {
    const preview = previewToolCallArguments(args.rawArguments);
    super(
      `Invalid streamed tool call arguments from ${args.client} for tool "${args.toolName}" ` +
        `(tool_call_id="${args.toolCallId}", length=${args.rawArguments.length}, ` +
        `preview=${JSON.stringify(preview)}): ${args.reason}`,
    );
    this.name = "ToolCallArgumentParseError";
    this.client = args.client;
    this.toolName = args.toolName;
    this.toolCallId = args.toolCallId;
    this.rawArgumentsLength = args.rawArguments.length;
    this.rawArgumentsPreview = preview;
  }
}

/**
 * Raised by the mmsp client for anything its server reported: a refusal before the stream
 * (`status` is the HTTP status) or an error event inside it (`status` is the upstream's own when
 * the error carries one); `errorType` is the server-side class name; `error` the object as sent.
 */
export class UpstreamError extends MMSPError {
  readonly client: string;
  readonly status: number | null;
  readonly errorType: string | null;
  readonly error: Record<string, unknown>;

  constructor(args: {
    client: string;
    status: number | null;
    errorType: string | null;
    message: string;
    error?: Record<string, unknown> | null;
  }) {
    super(args.message);
    this.name = "UpstreamError";
    this.client = args.client;
    this.status = args.status;
    this.errorType = args.errorType;
    this.error = args.error ? { ...args.error } : {};
  }
}

/**
 * Raised by AutoLLMClient when neither the client type nor the model id names a client.
 */
export class RoutingError extends MMSPError {
  readonly model: string;
  readonly clientType: string | null;

  constructor(args: {
    model: string;
    clientType: string | null;
    message: string;
  }) {
    super(args.message);
    this.name = "RoutingError";
    this.model = args.model;
    this.clientType = args.clientType;
  }
}

/**
 * Raised when a message cannot be sent as it is: an item of an unknown kind, a tool result
 * without tool_call_id, an image that is not valid base64 or cannot be fetched, a TTS script
 * without its speaker labels, or a message with nothing the wire can carry.
 */
export class InvalidMessageError extends MMSPError {
  readonly client: string;
  readonly itemType: string | null;
  readonly messageIndex: number | null;

  constructor(args: {
    client: string;
    message: string;
    itemType?: string | null;
    messageIndex?: number | null;
  }) {
    super(args.message);
    this.name = "InvalidMessageError";
    this.client = args.client;
    this.itemType = args.itemType ?? null;
    this.messageIndex = args.messageIndex ?? null;
  }
}

/**
 * Raised when a well-formed item is one the model cannot take: an image on a text-only model, a
 * non-text item for embeddings or speech. Distinct from UnsupportedParameterError, which rejects
 * a UniConfig value.
 */
export class UnsupportedContentError extends MMSPError {
  readonly client: string;
  readonly itemType: string;

  constructor(args: { client: string; itemType: string; message: string }) {
    super(args.message);
    this.name = "UnsupportedContentError";
    this.client = args.client;
    this.itemType = args.itemType;
  }
}

/**
 * Raised with MMSP_DEBUG set when a client does not recognize a wire event; without it the event
 * is skipped (MMSP-RFC-0003).
 */
export class UnknownEventError extends MMSPError {
  readonly client: string;
  readonly event: string;

  constructor(args: { client: string; event: string }) {
    // a preview, cut as tool call arguments are: an unknown frame may carry a whole image
    const event = previewToolCallArguments(args.event);
    super(`${args.client} does not recognize the event ${event}`);
    this.name = "UnknownEventError";
    this.client = args.client;
    this.event = event;
  }
}

/**
 * Raised when a provider reports an error inside an open stream (Gemini Interactions' `error`
 * event), with the provider's code and message.
 */
export class ProviderStreamError extends MMSPError {
  readonly client: string;
  readonly code: number | string | null;

  constructor(args: {
    client: string;
    code: number | string | null;
    message: string;
  }) {
    super(args.message);
    this.name = "ProviderStreamError";
    this.client = args.client;
    this.code = args.code;
  }
}

/**
 * Raised when streamingResponseStateful is called while another stateful call on the same client
 * has not ended: two turns cannot be recorded in one history at once.
 */
export class ConcurrentCallError extends MMSPError {
  readonly client: string;

  constructor(args: { client: string }) {
    super(
      `${args.client} has a stateful call in flight; wait for its stop event or its error.`,
    );
    this.name = "ConcurrentCallError";
    this.client = args.client;
  }
}

export function parseToolCallArguments(
  rawArguments: string | undefined,
  client: string,
  toolName: string,
  toolCallId: string,
): Record<string, unknown> {
  const raw = rawArguments || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ToolCallArgumentParseError({
      client,
      toolName,
      toolCallId,
      rawArguments: raw,
      reason,
    });
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ToolCallArgumentParseError({
      client,
      toolName,
      toolCallId,
      rawArguments: raw,
      reason: "Expected a JSON object.",
    });
  }

  return parsed as Record<string, unknown>;
}
