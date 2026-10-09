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

import request from "supertest";
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { AutoLLMClient } from "../src/autoClient";
import {
  TEST_PROMPT,
  createChatApp,
  testUpstream,
} from "../src/integration/playground";
import { UniConfig, UniEvent, UniMessage } from "../src/types";

let mockLastStreamingOptions: {
  message: UniMessage;
  config: UniConfig;
  signal?: AbortSignal;
} | null = null;
let mockLastStreamOptions: {
  messages: UniMessage[];
  config: UniConfig;
  signal?: AbortSignal;
} | null = null;
// what getHistory returns, and what setHistory was last given
const mockHistory: UniMessage[] = [{ role: "user", content_items: [] }];
let mockSetHistory: UniMessage[] | null = null;

const mockEvents: UniEvent[] = [
  {
    role: "assistant",
    event_type: "delta",
    content_items: [{ type: "text.delta", text: "Hi" }],
    usage_metadata: null,
    finish_reason: null,
    created_at: 0,
  },
  {
    role: "assistant",
    event_type: "delta",
    content_items: [{ type: "text.done", text: "Hi" }],
    usage_metadata: null,
    finish_reason: null,
    created_at: 0,
  },
  {
    role: "assistant",
    event_type: "stop",
    content_items: [],
    usage_metadata: {
      cached_tokens: null,
      prompt_tokens: 3,
      thoughts_tokens: null,
      response_tokens: 1,
    },
    finish_reason: "stop",
    created_at: 0,
  },
];

function sseEvents(body: string): string[] {
  return body
    .split("\n\n")
    .filter((chunk) => chunk)
    .map((chunk) => chunk.slice("data: ".length));
}

jest.mock("../src/autoClient", () => ({
  AutoLLMClient: jest.fn().mockImplementation(() => ({
    streamingResponseStateful: async function* (options: {
      message: UniMessage;
      config: UniConfig;
      signal?: AbortSignal;
    }): AsyncGenerator<UniEvent> {
      mockLastStreamingOptions = options;
      yield* mockEvents;
    },
    streamingResponse: async function* (options: {
      messages: UniMessage[];
      config: UniConfig;
      signal?: AbortSignal;
    }): AsyncGenerator<UniEvent> {
      mockLastStreamOptions = options;
      yield* mockEvents;
    },
    getHistory: (): UniMessage[] => mockHistory,
    setHistory: jest.fn((history: UniMessage[]) => {
      mockSetHistory = history;
    }),
    clearHistory: jest.fn(),
    listModels: async (): Promise<string[]> => ["gpt-5.6", "claude-sonnet-5"],
  })),
}));

/**
 * A row of the server page's table: an openai-chat upstream at an address nothing serves.
 */
function testRow(overrides: Record<string, unknown> = {}) {
  return {
    model_id: "gpt-5.5",
    base_url: "http://127.0.0.1:1/v1",
    api_key: "sk-test",
    server_model_id: "gpt-5.5",
    client_type: "openai-chat",
    ...overrides,
  };
}

/**
 * A client whose stream yields `events`, then throws `error` when one is given.
 */
function streamingClient(events: UniEvent[], error?: Error) {
  return () => ({
    streamingResponse: async function* (): AsyncGenerator<UniEvent> {
      yield* events;
      if (error) {
        throw error;
      }
    },
  });
}

describe("Playground", () => {
  beforeEach(() => {
    mockLastStreamingOptions = null;
    mockLastStreamOptions = null;
    mockSetHistory = null;
    jest.clearAllMocks();
  });

  test("should render client connection inputs", async () => {
    const app = createChatApp();

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain('<h1 class="brand-name">MMSP</h1>');
    expect(response.text).toContain('id="modelCombobox"');
    expect(response.text).toContain('id="thinkingLevelCombobox"');
    expect(response.text).toContain('id="thinkingSummaryCombobox"');
    expect(response.text).toContain('id="toolChoiceCombobox"');
    expect(response.text).toContain(
      'data-combobox-option data-value="gpt-6.1-sol"',
    );
    expect(response.text).toContain('data-value="text-embedding-3-large"');
    expect(response.text).toContain("getSelectedClientType()");
    expect(response.text).toContain('id="clientTypeCombobox"');
    // the server hands the page its client types and their default endpoints
    expect(response.text).not.toContain("__PLAYGROUND_DEFAULTS__");
    expect(response.text).toContain('"openai-official"');
    expect(response.text).toContain("toggleCombobox('modelCombobox')");
    expect(response.text).toContain(
      "selectComboboxOption('modelCombobox', this)",
    );
    expect(response.text).toContain("customModelInput");
    expect(response.text).toContain("handleModelSelectChange()");
    expect(response.text).not.toContain("modelDropdown");
    expect(response.text).not.toContain("toggleModelMenu()");
    expect(response.text).not.toContain("<select");
    expect(response.text).not.toContain("<datalist");
    expect(response.text).toContain("apiKeyInput");
    expect(response.text).toContain('id="listModelsButton"');
    expect(response.text).toContain('id="extraHeadersInput"');
    expect(response.text).toContain('id="listModelsError"');
    expect(response.text).toContain("addListedModels(");
    expect(response.text).toContain("getSelectedClientType()");
    expect(response.text).toContain('id="clientTypeCombobox"');
    // the server hands the page its client types and their default endpoints
    expect(response.text).not.toContain("__PLAYGROUND_DEFAULTS__");
    expect(response.text).toContain('"openai-official"');
    expect(response.text).toContain("handleClientTypeChange()");
    expect(response.text).toContain("handleBaseUrlInput()");
    // an entry is a model id, a client type, an API key and a base URL, and the selected one is
    // the element, not the first with its id
    expect(response.text).toContain("handleApiKeyInput()");
    expect(response.text).toContain("entryKey(");
    expect(response.text).toContain('[aria-selected="true"]');
    expect(response.text).toContain(">Connection</span>");
    expect(response.text).toContain(">Generation</span>");
    expect(response.text).toContain("getExtraHeaders()");
    expect(response.text).toContain("listModels()");
    expect(response.text).toContain("/api/models");
    expect(response.text).toContain("apiKeyVisibilityToggle");
    expect(response.text).toContain("toggleApiKeyVisibility()");
    expect(response.text).toContain('id="stopButton"');
    expect(response.text).toContain("stopGeneration()");
    expect(response.text).toContain("currentAbortController.abort()");
    expect(response.text).toContain("/api/abort");
    expect(response.text).toContain(
      'id="apiKeyVisibilityShowIcon" class="hidden"',
    );
    expect(response.text).toContain('id="apiKeyVisibilityHideIcon" xmlns=');
    expect(response.text).toContain("baseUrlInput");
    expect(response.text).toContain("type: 'text.done', text: message");
    expect(response.text).toContain("type: 'image_url.done', image_url: img");
    expect(response.text).toContain("event.event_type === 'stop'");
    expect(response.text).toContain("item.type === 'text.delta'");
    expect(response.text).toContain("item.type === 'thinking.done'");
    expect(response.text).toContain("item.type === 'tool_call.done'");
    expect(response.text).toContain("item.type.endsWith('.done')");
    expect(response.text).toContain("event.error");
    expect(response.text).not.toContain("partial_tool_call");
    expect(response.text).toContain("renderEmbedding");
    expect(response.text).toContain("item.embedding.slice(0, 5)");
    expect(response.text).toContain(
      "appendAudioChunk(contentDiv, item, audioStream)",
    );
    expect(response.text).toContain("finalizeAudioStream(audioStream)");
    expect(response.text).toContain(
      "renderAudioPlayer(audioStream.mimeType, audioStream.chunks)",
    );
    expect(response.text).toContain("finalizeAudioStream(audioStream, true)");
    expect(response.text).toContain(
      "audioStream.container.querySelector('audio').play()",
    );
    expect(response.text).toContain(
      "assistantCard.insertAdjacentHTML('beforeend', metadataHtml)",
    );
    expect(response.text).toContain("mmsp.playground.config");
    expect(response.text).toContain("restoreConfig()");
    expect(response.text).not.toContain("pcmBase64ToWavDataUrl");
    expect(response.text).not.toContain("assistantCard.innerHTML +=");
    expect(response.text).toContain('href="/tracer/"');
    expect(response.text).toContain('target="_blank"');
    expect(response.text).toContain("Open Tracer");
    expect(response.text.indexOf('<h1 class="brand-name">')).toBeLessThan(
      response.text.indexOf(">GitHub<"),
    );
    expect(response.text.indexOf(">GitHub<")).toBeLessThan(
      response.text.indexOf(">Open Tracer<"),
    );
    expect(response.text).toContain('href="/server/"');
    expect(response.text).toContain("Open Server");
    expect(response.text.indexOf(">Open Tracer<")).toBeLessThan(
      response.text.indexOf(">Open Server<"),
    );
    expect(response.text).not.toContain("temperatureInput");
    expect(response.text).not.toContain("maxTokensInput");
    // a message sent to another entry starts a new conversation under a divider, and the hint
    // says so first
    expect(response.text).toContain('id="composerHint"');
    expect(response.text).toContain("startNewConversation()");
    expect(response.text).toContain("switchPending()");
    expect(response.text).toContain("conversationEntry");
    expect(response.text).toContain('class="divider"');
    expect(response.text).toContain("the messages above are not sent");
    expect(response.text).toContain("Enter starts a new conversation with");
  });

  test("should list the models the endpoint serves", async () => {
    const app = createChatApp();

    const response = await request(app)
      .post("/api/models")
      .send({
        config: {
          model: "gpt-5.6",
          api_key: "test-key",
          base_url: "https://relay.test/v1",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ models: ["gpt-5.6", "claude-sonnet-5"] });
    expect(AutoLLMClient).toHaveBeenCalledWith({
      model: "gpt-5.6",
      apiKey: "test-key",
      baseUrl: "https://relay.test/v1",
      clientType: undefined,
    });
  });

  test("should report a failed model listing", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(() => ({
      listModels: async (): Promise<string[]> => {
        throw new Error("401 unauthorized");
      },
    }));
    const app = createChatApp();

    const response = await request(app)
      .post("/api/models")
      .send({ config: { model: "gpt-5.6" } });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("401 unauthorized");
  });

  test("should mount tracer on the same app", async () => {
    const app = createChatApp();

    const response = await request(app).get("/tracer/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Tracer");
    expect(response.text).toContain('href="/tracer/"');
  });

  test("should mount the server page on the same app", async () => {
    const app = createChatApp();

    const response = await request(app).get("/server/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("MMSP Server");
    expect(response.text).toContain('id="serverToggle"');
    expect(response.text).toContain('href="/server/"');
  });

  test("should use client connection options outside request config", async () => {
    const app = createChatApp();
    const message: UniMessage = {
      role: "user",
      content_items: [{ type: "text.done", text: "Hello" }],
    };

    const response = await request(app)
      .post("/api/chat")
      .send({
        session_id: "connection-options",
        message,
        config: {
          model: "gpt-5.5",
          api_key: "test-key",
          base_url: "https://example.test/v1",
          default_headers: { "X-Title": "MMSP" },
          thinking_level: "low",
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("data:");
    expect(AutoLLMClient).toHaveBeenCalledWith({
      model: "gpt-5.5",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      defaultHeaders: { "X-Title": "MMSP" },
    });
    expect(mockLastStreamingOptions?.config).toEqual({
      thinking_level: "low",
    });
    expect(mockLastStreamingOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  test("should accept image payloads larger than the default JSON limit", async () => {
    const app = createChatApp();
    const largeImage = `data:image/png;base64,${"a".repeat(150_000)}`;
    const message: UniMessage = {
      role: "user",
      content_items: [{ type: "image_url.done", image_url: largeImage }],
    };

    const response = await request(app)
      .post("/api/chat")
      .send({
        session_id: "large-image",
        message,
        config: {
          model: "gpt-5.5",
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("data:");
    expect(mockLastStreamingOptions?.message.content_items[0]).toEqual({
      type: "image_url.done",
      image_url: largeImage,
    });
    expect(mockLastStreamingOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  test("should stream every event of the response, then the done marker", async () => {
    const app = createChatApp();

    const response = await request(app)
      .post("/api/chat")
      .send({
        session_id: "stream-events",
        message: {
          role: "user",
          content_items: [{ type: "text.done", text: "Hello" }],
        },
        config: { model: "gpt-5.5" },
      });

    expect(response.status).toBe(200);
    const events = sseEvents(response.text);
    expect(events.slice(0, -1).map((event) => JSON.parse(event))).toEqual(
      mockEvents,
    );
    expect(events[events.length - 1]).toBe("[DONE]");
  });

  test("should report a response that fails midway as an error event", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(() => ({
      streamingResponseStateful: async function* (): AsyncGenerator<UniEvent> {
        yield mockEvents[0];
        throw new Error("connection reset");
      },
    }));
    const app = createChatApp();

    const response = await request(app)
      .post("/api/chat")
      .send({
        session_id: "failing-stream",
        message: {
          role: "user",
          content_items: [{ type: "text.done", text: "Hello" }],
        },
        config: { model: "gpt-5.5" },
      });

    expect(response.status).toBe(200);
    expect(sseEvents(response.text)).toEqual([
      JSON.stringify(mockEvents[0]),
      JSON.stringify({ error: "connection reset" }),
      "[DONE]",
    ]);
  });

  test("should name an error without a message by its class", async () => {
    class TimeoutError extends Error {}
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(() => ({
      streamingResponseStateful: async function* (): AsyncGenerator<UniEvent> {
        yield mockEvents[0];
        throw new TimeoutError();
      },
    }));
    const app = createChatApp();

    const response = await request(app)
      .post("/api/chat")
      .send({
        session_id: "timing-out-stream",
        message: {
          role: "user",
          content_items: [{ type: "text.done", text: "Hello" }],
        },
        config: { model: "gpt-5.5" },
      });

    expect(response.status).toBe(200);
    expect(sseEvents(response.text)).toEqual([
      JSON.stringify(mockEvents[0]),
      JSON.stringify({ error: "TimeoutError" }),
      "[DONE]",
    ]);
  });

  test("should expose an abort endpoint", async () => {
    const app = createChatApp();

    const response = await request(app).post("/api/abort").send({
      session_id: "idle-session",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "idle" });
  });

  test("keeps a session history across a client rebuild", async () => {
    const app = createChatApp();
    const message: UniMessage = {
      role: "user",
      content_items: [{ type: "text.done", text: "Hello" }],
    };

    for (const apiKey of ["k1", "k2"]) {
      const response = await request(app)
        .post("/api/chat")
        .send({
          session_id: "rebuild",
          message,
          config: { model: "gpt-5.5", api_key: apiKey },
        });
      expect(response.status).toBe(200);
    }

    expect(AutoLLMClient).toHaveBeenCalledTimes(2);
    expect(mockSetHistory).toEqual(mockHistory);
    await request(app).post("/api/clear").send({ session_id: "rebuild" });
  });

  test("tests a row against its upstream", async () => {
    const app = createChatApp();

    const response = await request(app)
      .post("/server/api/test")
      .send({ model: testRow() });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual([
      "ok",
      "first_token_ms",
      "total_ms",
      "tokens_out",
      "tps",
    ]);
    expect(response.body.ok).toBe(true);
    expect(Number.isInteger(response.body.first_token_ms)).toBe(true);
    expect(Number.isInteger(response.body.total_ms)).toBe(true);
    expect(response.body.tokens_out).toBe(1);
    expect(typeof response.body.tps).toBe("number");
    // built as createServerApp builds a row; the served id is not the upstream's business
    expect(AutoLLMClient).toHaveBeenCalledWith({
      model: "gpt-5.5",
      apiKey: "sk-test",
      baseUrl: "http://127.0.0.1:1/v1",
      clientType: "openai-chat",
    });
    expect(mockLastStreamOptions?.messages).toEqual([
      {
        role: "user",
        content_items: [{ type: "text.done", text: TEST_PROMPT }],
      },
    ]);
    expect(mockLastStreamOptions?.config).toEqual({ max_tokens: 512 });
    expect(mockLastStreamOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  test("reports a result without usage", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(
      streamingClient([
        mockEvents[0],
        { ...mockEvents[2], usage_metadata: null },
      ]),
    );
    const app = createChatApp();

    const response = await request(app)
      .post("/server/api/test")
      .send({ model: testRow() });

    expect(response.body.ok).toBe(true);
    expect(Number.isInteger(response.body.first_token_ms)).toBe(true);
    expect(response.body.tokens_out).toBeNull();
    expect(response.body.tps).toBeNull();
  });

  test("times the first token, not an early stop", async () => {
    // Anthropic reports usage in a stop event at message_start, before any token; a stream of no
    // tokens has no rate
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(
      streamingClient([mockEvents[2], mockEvents[2]]),
    );
    const app = createChatApp();

    const response = await request(app)
      .post("/server/api/test")
      .send({ model: testRow() });

    expect(response.body.ok).toBe(true);
    expect(response.body.first_token_ms).toBeNull();
    expect(response.body.tokens_out).toBe(1);
    expect(response.body.tps).toBeNull();
  });

  test("reports an upstream failure", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(
      streamingClient([], new Error("Error code: 401 - bad key")),
    );
    const app = createChatApp();

    const response = await request(app)
      .post("/server/api/test")
      .send({ model: testRow() });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: false,
      error: "Error code: 401 - bad key",
    });

    // a client's own timeout is the client's message, named by its class when it carries none
    class TimeoutError extends Error {}
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(
      streamingClient([], new TimeoutError()),
    );
    const nameless = await request(app)
      .post("/server/api/test")
      .send({ model: testRow() });
    expect(nameless.body).toEqual({ ok: false, error: "TimeoutError" });
  });

  test("resolves environment references and names an unset one", async () => {
    const app = createChatApp();
    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    delete process.env.NOPE_KEY;
    try {
      const resolved = await request(app)
        .post("/server/api/test")
        .send({ model: testRow({ api_key: "$PROBE_UPSTREAM_KEY" }) });
      expect(resolved.body.ok).toBe(true);
      expect(AutoLLMClient).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "sk-probe" }),
      );

      (AutoLLMClient as unknown as jest.Mock).mockClear();
      const unset = await request(app)
        .post("/server/api/test")
        .send({ model: testRow({ api_key: "$NOPE_KEY" }) });
      expect(unset.status).toBe(200);
      expect(unset.body).toEqual({
        ok: false,
        error:
          "api_key references $NOPE_KEY, which is not set in the environment.",
      });
      expect(AutoLLMClient).not.toHaveBeenCalled();
    } finally {
      delete process.env.PROBE_UPSTREAM_KEY;
    }
  });

  test("names a client that cannot build", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Unknown client type 'nope'. Pass one of ...");
    });
    const app = createChatApp();

    const response = await request(app)
      .post("/server/api/test")
      .send({ model: testRow({ client_type: "nope" }) });

    expect(response.body.ok).toBe(false);
    expect(response.body.error).toMatch(/^Unknown client type 'nope'/);
  });

  test("times out", async () => {
    (AutoLLMClient as unknown as jest.Mock).mockImplementationOnce(() => ({
      streamingResponse: async function* (options: {
        signal?: AbortSignal;
      }): AsyncGenerator<UniEvent> {
        await new Promise((resolve) =>
          options.signal?.addEventListener("abort", resolve),
        );
        throw new Error("aborted");
      },
    }));

    const row = testRow() as Record<string, string>;
    await expect(testUpstream(row, 20)).resolves.toEqual({
      ok: false,
      error: "No answer within 0.02 s.",
    });
  });

  test.each([
    [[], "Request body must be a JSON object."],
    [{ model: "x" }, "model must be an object."],
    [{ model: testRow({ client_type: 5 }) }, "client_type must be a string."],
    [
      { model: testRow({ api_key: undefined }) },
      "api_key must be a non-empty string.",
    ],
    [
      { model: testRow({ model_id: "" }) },
      "model_id must be a non-empty string.",
    ],
  ])("refuses a malformed test body %#", async (body, message) => {
    const app = createChatApp();

    const response = await request(app).post("/server/api/test").send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: message });
    expect(AutoLLMClient).not.toHaveBeenCalled();
  });
});
