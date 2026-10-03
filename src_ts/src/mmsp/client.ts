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

import { LLMClient } from "../baseClient";
import { EventContentItem, UniConfig, UniEvent, UniMessage } from "../types";
import { resolveCredentials } from "../utils";
import {
  DEFAULT_BASE_URL,
  MODELS_ROUTE,
  STREAM_ROUTE,
  decodeWire,
  encodeWire,
  fromWireError,
} from "../wire";

/**
 * The wire error a response other than 200 carries: its `{"error": {...}}` body, or the start
 * of a body that is not one.
 */
async function errorPayload(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const error = (body as { error?: unknown } | null)?.error;
  if (error !== null && typeof error === "object" && !Array.isArray(error)) {
    return error as Record<string, unknown>;
  }
  return {
    type: "HTTPError",
    message: `HTTP ${response.status}: ${text.slice(0, 200)}`,
  };
}

/**
 * The data of each server-sent event: the `data:` lines of a block joined with newlines,
 * dispatched at the blank line that ends the block. Other lines (comments, other fields) are
 * ignored.
 */
async function* sseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // the last piece is a line still arriving, unless the body ended
      buffer = done ? "" : lines.pop()!;
      for (const line of lines.map((raw) => raw.replace(/\r$/, ""))) {
        if (line === "") {
          if (data.length > 0) {
            yield data.join("\n");
            data = [];
          }
        } else if (line.startsWith("data:")) {
          data.push(line.slice("data:".length).replace(/^ /, ""));
        }
      }
      if (done) {
        break;
      }
    }
    if (data.length > 0) {
      yield data.join("\n");
    }
  } finally {
    // closes the body when the caller stops at [DONE] or the stream fails
    await reader.cancel().catch(() => {});
  }
}

/**
 * MMSP client for an MMSP server, which streams the models of its table. It speaks MMSP itself,
 * over the server's HTTP protocol (see `wire`).
 */
export class MmspClient extends LLMClient {
  protected _model: string;
  private _baseUrl: string;
  private _headers: Record<string, string>;

  /**
   * Initialize the MMSP client with model, API key, and base URL.
   *
   * The default endpoint is `http://127.0.0.1:25752/v1`; a base URL passed in or read from
   * MMSP_BASE_URL ends with `/v1` too, as OpenAI's and vLLM's do.
   */
  constructor(options: {
    model: string;
    apiKey?: string;
    baseUrl?: string | null;
    defaultHeaders?: Record<string, string>;
  }) {
    super();
    this._model = options.model;
    const { apiKey, baseUrl } = resolveCredentials(
      this.constructor.name,
      options,
      { key: "MMSP_API_KEY", baseUrl: "MMSP_BASE_URL" },
    );
    this._baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this._headers = {
      ...(options.defaultHeaders ?? {}),
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  /**
   * The config is already JSON, and the server's upstream client transforms it.
   */
  transformUniConfigToModelConfig(config: UniConfig): UniConfig {
    return { ...config };
  }

  /**
   * The messages as they go on the wire, their bytes as base64 text.
   */
  transformUniMessageToModelInput(messages: UniMessage[]): unknown[] {
    return messages.map(encodeWire);
  }

  /**
   * One event of the server's stream. Its done items are dropped, since the base class closes
   * the items again; its deltas carry `itemId` as fidelity.item_id, so the items the server
   * closed stay apart.
   *
   * @param modelOutput - One wire event parsed from JSON, its bytes still base64 text
   * @param itemId - The id of the item streaming now: the number of done items seen so far
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformModelOutputToUniEvent(modelOutput: any, itemId = "0"): UniEvent {
    const event = decodeWire(modelOutput);
    const contentItems: EventContentItem[] = [];
    for (const item of event.content_items) {
      const [kind, phase] = item.type.split(".");
      if (phase !== "delta") {
        continue;
      }
      const fidelity = { item_id: itemId, ...item.fidelity };
      if (
        (kind === "inline_data" || kind === "inline_thinking") &&
        item.data.length === 0 &&
        Object.keys(fidelity).length > 1
      ) {
        // the fidelity the server closed an image item with (an Interactions thought signature
        // after an image thought): sent alone under the item's id as a thinking delta,
        // StreamItems gives it to the item streaming now; as an image delta of its own it would
        // begin another item
        contentItems.push({ type: "thinking.delta", thinking: "", fidelity });
      } else {
        contentItems.push({ ...item, fidelity });
      }
    }

    return {
      role: "assistant",
      event_type: event.event_type,
      content_items: contentItems,
      usage_metadata: event.usage_metadata ?? null,
      finish_reason: event.finish_reason ?? null,
      created_at: event.created_at,
    };
  }

  /**
   * Stream one response from the MMSP server.
   */
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const body = {
      model: this._model,
      messages: this.transformUniMessageToModelInput(options.messages),
      config: this.transformUniConfigToModelConfig(options.config),
    };
    // undici's 300 s limit between two chunks of a body never fires: the server writes a
    // keep-alive comment whenever the model is silent
    const response = await fetch(`${this._baseUrl}${STREAM_ROUTE}`, {
      method: "POST",
      headers: {
        ...this._headers,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
    if (response.status !== 200) {
      throw fromWireError(await errorPayload(response), response.status);
    }

    let itemIndex = 0;
    for await (const data of sseData(response.body!)) {
      if (data === "[DONE]") {
        break;
      }
      const wire = JSON.parse(data);
      if ("error" in wire) {
        throw fromWireError(wire.error, null);
      }
      yield this.transformModelOutputToUniEvent(wire, String(itemIndex));
      // the deltas of item N arrive while N done items have been seen
      itemIndex += wire.content_items.filter((item: { type: string }) =>
        item.type.endsWith(".done"),
      ).length;
    }
  }

  /**
   * The model ids the server's table names, read from its OpenAI-shaped listing.
   *
   * @returns The model ids, in the order the server returned them.
   */
  async listModels(): Promise<string[]> {
    const response = await fetch(`${this._baseUrl}${MODELS_ROUTE}`, {
      headers: this._headers,
    });
    if (response.status !== 200) {
      throw fromWireError(await errorPayload(response), response.status);
    }

    const { data } = (await response.json()) as { data: { id: string }[] };
    return data.map((model) => model.id);
  }
}
