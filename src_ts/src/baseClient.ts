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

import {
  ConcurrentCallError,
  EmptyResponseError,
  IncompleteStreamError,
  InvalidMessageError,
  StreamProtocolError,
} from "./errors";
import { normalizeLegacyMessages } from "./legacy";
import { StreamItems } from "./streamItems";
import {
  ContentItem,
  DeltaContentItem,
  EventContentItem,
  FinishReason,
  UniConfig,
  UniEvent,
  UniMessage,
  UsageMetadata,
} from "./types";

/**
 * Stamp each message that has no created_at with the time it is sent, on the caller's own object.
 */
export function stampCreatedAt(messages: UniMessage[]): void {
  for (const message of messages) {
    if (message.created_at == null) {
      message.created_at = Date.now();
    }
  }
}

/**
 * A deep copy of a message or a list of them. A Buffer stays a Buffer: structuredClone would
 * return a bare Uint8Array, whose toString("base64") the clients call is a list of numbers.
 */
function deepCopy(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return Buffer.isBuffer(value) ? Buffer.from(value) : value.slice();
  }
  if (Array.isArray(value)) {
    return value.map(deepCopy);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => [key, deepCopy(field)]),
    );
  }
  return value;
}

function deltaEvent(item: EventContentItem): UniEvent {
  return {
    role: "assistant",
    event_type: "delta",
    content_items: [item],
    usage_metadata: null,
    finish_reason: null,
    created_at: Date.now(),
  };
}

/**
 * Turns the events a client yields into the public stream. A client yields deltas only; every
 * one goes out as it arrives, in an event of its own, and `StreamItems` closes each item with its
 * done item when the next item begins or the stream ends. The usage and finish reason of the
 * client's stop events are merged into the one final stop.
 */
class PublicStream {
  private readonly items: StreamItems;
  private usageMetadata: UsageMetadata | null = null;
  private finishReason: FinishReason | null = null;
  readonly doneItems: ContentItem[] = [];

  constructor(private readonly client: string) {
    this.items = new StreamItems(client);
  }

  // a generator, so the deltas of an event reach the caller even when a later one fails
  *push(event: UniEvent): Generator<UniEvent> {
    if (
      event.event_type === "delta" &&
      (event.usage_metadata != null || event.finish_reason != null)
    ) {
      throw new StreamProtocolError({
        client: this.client,
        message: "a delta event carries usage_metadata or finish_reason",
      });
    }

    for (const delta of event.content_items) {
      yield* this.emit(this.items.delta(delta as DeltaContentItem));
    }

    if (event.usage_metadata) {
      const usage: UsageMetadata = this.usageMetadata ?? {
        cached_tokens: null,
        prompt_tokens: null,
        thoughts_tokens: null,
        response_tokens: null,
      };
      for (const field of [
        "cached_tokens",
        "prompt_tokens",
        "thoughts_tokens",
        "response_tokens",
      ] as const) {
        if (event.usage_metadata[field] != null) {
          usage[field] = event.usage_metadata[field];
        }
      }
      this.usageMetadata = usage;
    }
    if (event.finish_reason) {
      this.finishReason = event.finish_reason;
    }
  }

  /**
   * The client's stream ended: the item still streaming is done.
   */
  *end(): Generator<UniEvent> {
    yield* this.emit(this.items.end());
  }

  private *emit(items: EventContentItem[]): Generator<UniEvent> {
    for (const item of items) {
      if (item.type.endsWith(".done")) {
        this.doneItems.push(item as ContentItem);
      }
      yield deltaEvent(item);
    }
  }

  /**
   * Build the stop event once the client's stream ended, rejecting a response that cannot be one.
   */
  stop(): UniEvent {
    const missing: string[] = [];
    if (this.usageMetadata === null) {
      missing.push("usage_metadata");
    }
    if (this.finishReason === null) {
      missing.push("finish_reason");
    }
    if (missing.length > 0) {
      throw new IncompleteStreamError({
        client: this.client,
        missing,
        finishReason: this.finishReason,
        usageMetadata: this.usageMetadata,
      });
    }
    // replaying a thinking-only assistant message on the next turn fails with a 400 error
    const thinkingOnly = this.doneItems.every(
      (item) =>
        item.type === "thinking.done" || item.type === "inline_thinking.done",
    );
    if (thinkingOnly) {
      throw new EmptyResponseError({
        client: this.client,
        finishReason: this.finishReason,
        usageMetadata: this.usageMetadata,
      });
    }

    return {
      role: "assistant",
      event_type: "stop",
      content_items: [],
      usage_metadata: this.usageMetadata,
      finish_reason: this.finishReason,
      created_at: Date.now(),
    };
  }
}

/**
 * Abstract base class for LLM clients.
 *
 * All model-specific clients must inherit from this class and implement
 * the required abstract methods for complete SDK abstraction.
 */
export abstract class LLMClient {
  protected _model: string;
  private _history: UniMessage[];
  // the stateful call that holds the history until its stop event, its end or its abort, if any
  private _inFlight: { signal?: AbortSignal } | null;

  constructor() {
    this._model = "";
    this._history = [];
    this._inFlight = null;
  }

  /**
   * Transform universal configuration to model-specific configuration.
   *
   * @param config - Universal configuration object
   * @returns Model-specific configuration object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract transformUniConfigToModelConfig(config: UniConfig): any;

  /**
   * Transform universal message format to model-specific input format.
   *
   * @param messages - List of universal message objects
   * @returns Model-specific input format (e.g., Gemini's Content list, OpenAI's messages array)
   */
  abstract transformUniMessageToModelInput(
    messages: UniMessage[],
    signal?: AbortSignal,
  ): any; // eslint-disable-line @typescript-eslint/no-explicit-any

  /**
   * Transform one event of the provider's stream into a universal event, which the base class
   * turns into the public stream.
   *
   * content_items holds the deltas the wire event carries, in wire order, and never a done item:
   * the base class closes an item when the next one begins or the stream ends. The deltas of one
   * item are contiguous and carry the same `fidelity.item_id`, the provider's id for the item
   * where it has one, which never reaches the public stream. Its event_type is "stop" on the wire
   * events that report usage_metadata and/or finish_reason, in pieces the base class merges field
   * by field, and "delta" otherwise; a "delta" event carries neither.
   *
   * @param modelOutput - Model-specific output object (streaming chunk)
   * @returns Universal event object, an empty delta event when the wire event carries nothing
   *   universal
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract transformModelOutputToUniEvent(modelOutput: any): UniEvent;

  /**
   * Concatenate a stream of universal events into a single universal message.
   *
   * @param events - List of universal events from streaming response
   * @returns Complete universal message object: every done item in stream order, with the
   *   usage, finish reason and timestamp of the stop event
   */
  concatUniEventsToUniMessage(events: UniEvent[]): UniMessage {
    const contentItems: ContentItem[] = [];
    let stopEvent: UniEvent | null = null;
    for (const event of events) {
      if (event.event_type === "stop") {
        stopEvent = event;
        continue;
      }
      for (const item of event.content_items) {
        if (item.type.endsWith(".done")) {
          contentItems.push(item as ContentItem);
        }
      }
    }

    return {
      role: "assistant",
      content_items: contentItems,
      usage_metadata: stopEvent?.usage_metadata ?? null,
      finish_reason: stopEvent?.finish_reason ?? null,
      created_at: stopEvent?.created_at,
    };
  }

  /**
   * Internal method to handle streaming response.
   *
   * Each model client implements it to send the request and yield one universal event per event
   * of the provider's stream; streamingResponse turns them into the public stream.
   *
   * @param options - Object containing messages and config
   * @yields Universal events of the streaming response
   */
  abstract _streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent>;

  /**
   * List the model ids the configured endpoint serves.
   *
   * @returns The model ids, in the order the endpoint returned them.
   */
  abstract listModels(): Promise<string[]>;

  /**
   * Generate content in streaming mode (stateless).
   *
   * @param options - Object containing messages and config
   * @yields Delta events, each carrying one delta or done item, then exactly one stop event
   *   carrying the usage and the finish reason
   * @throws InvalidMessageError A message has no content items, before anything is sent.
   */
  async *streamingResponse(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    const { messages, config } = options;

    stampCreatedAt(messages);
    const requestMessages = normalizeLegacyMessages(messages);
    for (const [index, message] of requestMessages.entries()) {
      if (message.content_items.length === 0) {
        throw new InvalidMessageError({
          client: this.constructor.name,
          message: `message ${index} has nothing ${this.constructor.name} can send`,
          messageIndex: index,
        });
      }
    }

    const output = new PublicStream(this.constructor.name);
    for await (const event of this._streamingResponseInternal({
      messages: requestMessages,
      config,
      signal: options.signal,
    })) {
      yield* output.push(event);
    }
    yield* output.end();
    const stopEvent = output.stop();

    // saved before the stop is yielded: a caller may stop iterating as soon as it sees it
    if (config.trace_id) {
      const { Tracer } = await import("./integration/tracer");
      const assistantMessage: UniMessage = {
        role: "assistant",
        content_items: output.doneItems,
        usage_metadata: stopEvent.usage_metadata,
        finish_reason: stopEvent.finish_reason,
        created_at: stopEvent.created_at,
      };
      const tracer = new Tracer();
      tracer.saveHistory(
        this._model,
        [...requestMessages, assistantMessage],
        config.trace_id,
        config,
      );
    }

    yield stopEvent;
  }

  /**
   * Generate content in streaming mode (stateful).
   *
   * @param message - Latest universal message object to add to conversation
   * @param config - Universal configuration object
   * @yields Universal events from the streaming response
   * @throws ConcurrentCallError Another stateful call on this client has not ended.
   */
  async *streamingResponseStateful(options: {
    message: UniMessage;
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    // two calls each sending the history as it was when they began would record their turns in
    // the order they finished, the later one generated without the earlier; an aborted call
    // records nothing, so it holds the client no longer
    if (this._inFlight !== null && !this._inFlight.signal?.aborted) {
      throw new ConcurrentCallError({ client: this.constructor.name });
    }

    const call = { signal: options.signal };
    this._inFlight = call;
    try {
      const { config } = options;
      const [message] = normalizeLegacyMessages([options.message]);

      const events: UniEvent[] = [];
      for await (const event of this.streamingResponse({
        messages: [...this._history, message],
        config,
        signal: options.signal,
      })) {
        events.push(event);
        if (event.event_type === "stop") {
          // an abort that lands as the stop arrives still records nothing: a newer call may hold
          // the client by now
          options.signal?.throwIfAborted();

          // recorded before the stop is yielded: a caller may stop iterating as soon as it sees
          // it, and the turn has ended then, so the next one may begin before this generator is
          // closed
          this._history.push(deepCopy(message) as UniMessage);
          this._history.push(
            deepCopy(this.concatUniEventsToUniMessage(events)) as UniMessage,
          );
          this._inFlight = null;
        }
        yield event;
      }
    } finally {
      if (this._inFlight === call) {
        this._inFlight = null;
      }
    }
  }

  /**
   * Clear the message history.
   */
  clearHistory(): void {
    this._history = [];
  }

  /**
   * Get the current message history.
   *
   * @returns Deep copy of the current message history
   */
  getHistory(): UniMessage[] {
    return deepCopy(this._history) as UniMessage[];
  }

  /**
   * Replace the message history with a deep copy of the provided history.
   *
   * @param history - List of universal message objects to set as the new history
   */
  setHistory(history: UniMessage[]): void {
    this._history = deepCopy(normalizeLegacyMessages(history)) as UniMessage[];
  }
}
