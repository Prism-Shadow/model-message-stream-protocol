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

/**
 * MMSP over HTTP, as the MMSP server serves it and the mmsp client speaks it.
 *
 * A client's base URL ends with `/v1`, and the client appends `/stream` and `/models`.
 * `POST /v1/stream` takes `{"model", "messages", "config"}` and answers with server-sent events:
 * one `data: <UniEvent JSON>` per public event, then `data: [DONE]`. `GET /v1/models` lists the
 * models of the server's table in OpenAI's list shape (`{"object": "list", "data": [{"id": ...},
 * ...]}`), and a model id not in the table is a 404 NotFoundError. `GET /v1/metrics` reports the
 * server's request counts and latencies, which its dashboard at `/` shows. A server with keys wants
 * `Authorization: Bearer <key>` on every `/v1/` request. JSON has no bytes, so every Buffer goes
 * out as base64 text, and only the `data` of `inline_data.*` and `inline_thinking.*` items, the
 * protocol's byte fields, is decoded back. While the model is silent, the server writes an SSE
 * comment every KEEPALIVE_SECONDS, which a reader skips; it keeps proxies and clients from timing
 * out a long thought. An error is `{"error": {"type", "message", ...fields}}`: the body of an HTTP
 * error before a stream starts, an event followed by `data: [DONE]` once it has. The five MMSP
 * errors cross with their fields and are raised again as themselves; anything else becomes an
 * UpstreamError.
 */

import {
  EmptyResponseError,
  MMSPError,
  StreamProtocolError,
  ToolCallArgumentParseError,
  UnsupportedOperationError,
  UnsupportedParameterError,
  UpstreamError,
} from "./errors";

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 25752;
// a base URL ends with it, as OpenAI's and vLLM's do
export const API_PREFIX = "/v1";
export const DEFAULT_BASE_URL = "http://127.0.0.1:25752/v1";
// what a client appends to its base URL
export const STREAM_ROUTE = "/stream";
export const MODELS_ROUTE = "/models";
// what the server serves: API_PREFIX and the route
export const STREAM_PATH = "/v1/stream";
export const MODELS_PATH = "/v1/models";
export const METRICS_PATH = "/v1/metrics";
export const KEEPALIVE_SECONDS = 15;

/**
 * The base URL a client of a server listening on host and port uses.
 *
 * @param host - The host the server listens on; an IPv6 address goes in brackets
 * @param port - The port it listens on
 * @returns `http://host:port/v1`
 */
export function serverBaseUrl(host: string, port: number): string {
  return `http://${host.includes(":") ? `[${host}]` : host}:${port}${API_PREFIX}`;
}

/**
 * The dashboard of a server listening on host and port.
 *
 * @param host - The host the server listens on; an IPv6 address goes in brackets
 * @param port - The port it listens on
 * @returns `http://host:port/`
 */
export function serverDashboardUrl(host: string, port: number): string {
  return `http://${host.includes(":") ? `[${host}]` : host}:${port}/`;
}

// an event, a message, an item or an error as JSON parsed it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WireRecord = Record<string, any>;

/**
 * A copy of a value with every Buffer in it, wherever it sits, as base64 text.
 *
 * @param value - A UniEvent, a UniMessage, or any part of one
 * @returns The value, ready for JSON.stringify
 */
export function encodeWire(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (Array.isArray(value)) {
    return value.map(encodeWire);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [key, encodeWire(field)]),
    );
  }
  return value;
}

/**
 * A copy of a UniEvent or UniMessage parsed from JSON, with the base64 `data` of its
 * `inline_data.*` and `inline_thinking.*` items decoded back into a Buffer. No other field is
 * touched: a Buffer an old history kept inside a fidelity stays text.
 *
 * @param record - The parsed event or message
 * @returns The record with its byte fields restored
 */
export function decodeWire<T>(record: T): T {
  const items: WireRecord[] = (record as WireRecord).content_items || [];
  return {
    ...record,
    content_items: items.map((item) =>
      (item.type.startsWith("inline_data.") ||
        item.type.startsWith("inline_thinking.")) &&
      typeof item.data === "string"
        ? { ...item, data: Buffer.from(item.data, "base64") }
        : item,
    ),
  };
}

/**
 * The wire form of an error a stream or a listing raised.
 *
 * The MMSP errors carry their fields, so the client raises them again as they were. Anything
 * else is named by its class, with the upstream's HTTP status when it carries one.
 *
 * @param error - What was thrown
 * @returns The object that goes under `"error"`
 */
export function toWireError(error: unknown): Record<string, unknown> {
  if (error instanceof UnsupportedParameterError) {
    return {
      type: "UnsupportedParameterError",
      message: error.message,
      client: error.client,
      parameter: error.parameter,
    };
  }
  if (error instanceof UnsupportedOperationError) {
    return {
      type: "UnsupportedOperationError",
      message: error.message,
      client: error.client,
      operation: error.operation,
    };
  }
  if (error instanceof EmptyResponseError) {
    return {
      type: "EmptyResponseError",
      message: error.message,
      client: error.client,
      finish_reason: error.finishReason,
      usage_metadata: error.usageMetadata,
    };
  }
  if (error instanceof StreamProtocolError) {
    // the client's constructor adds the prefix again
    const prefix = `${error.client} broke the streaming protocol: `;
    return {
      type: "StreamProtocolError",
      message: error.message.startsWith(prefix)
        ? error.message.slice(prefix.length)
        : error.message,
      client: error.client,
    };
  }
  if (error instanceof ToolCallArgumentParseError) {
    return {
      type: "ToolCallArgumentParseError",
      message: error.message,
      client: error.client,
      tool_name: error.toolName,
      tool_call_id: error.toolCallId,
      raw_arguments_length: error.rawArgumentsLength,
      raw_arguments_preview: error.rawArgumentsPreview,
    };
  }
  if (!(error instanceof Error)) {
    return { type: "Error", message: String(error) };
  }

  const wire: Record<string, unknown> = {
    type: error.constructor.name,
    message: error.message || error.constructor.name,
  };
  // the SDKs' API errors carry the upstream's HTTP status, which tells a rejected key or a
  // rate limit apart without parsing the message
  const status = (error as { status?: unknown }).status;
  if (Number.isInteger(status)) {
    wire.status = status;
  }
  return wire;
}

/**
 * The error to raise for a wire error the server reported.
 *
 * @param error - The object under `"error"`, read field by field, missing fields as null
 * @param status - The HTTP status when it was not 200, else null
 * @param client - The client that raises an UpstreamError
 * @returns The MMSP error the server raised, or an UpstreamError for anything else
 */
export function fromWireError(
  error: Record<string, unknown>,
  status: number | null,
  client = "MmspClient",
): MMSPError {
  const wire = error as WireRecord;
  const message: string = wire.message || wire.type || "unknown error";
  switch (wire.type) {
    case "UnsupportedParameterError":
      return new UnsupportedParameterError({
        client: wire.client ?? null,
        parameter: wire.parameter ?? null,
        message,
      });
    case "UnsupportedOperationError":
      return new UnsupportedOperationError({
        client: wire.client ?? null,
        operation: wire.operation ?? null,
        message,
      });
    case "EmptyResponseError":
      // the constructor rebuilds the message, equal to the upstream's
      return new EmptyResponseError({
        client: wire.client ?? null,
        finishReason: wire.finish_reason ?? null,
        usageMetadata: wire.usage_metadata ?? null,
      });
    case "StreamProtocolError":
      return new StreamProtocolError({ client: wire.client ?? null, message });
    case "ToolCallArgumentParseError": {
      const cut = message.lastIndexOf("): ");
      const parseError = new ToolCallArgumentParseError({
        client: wire.client ?? null,
        toolName: wire.tool_name ?? null,
        toolCallId: wire.tool_call_id ?? null,
        rawArguments: wire.raw_arguments_preview || "",
        reason: cut === -1 ? message : message.slice(cut + "): ".length),
      });
      // the raw arguments stayed on the server, so the length, the preview (which a long preview
      // would truncate twice) and the message are the upstream's own
      return Object.assign(parseError, {
        rawArgumentsLength: wire.raw_arguments_length ?? null,
        rawArgumentsPreview: wire.raw_arguments_preview ?? null,
        message,
      });
    }
    default:
      return new UpstreamError({
        client,
        status: status ?? wire.status ?? null,
        errorType: wire.type ?? null,
        message,
      });
  }
}
