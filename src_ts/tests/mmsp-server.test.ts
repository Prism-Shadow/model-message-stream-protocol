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

import http from "http";
import { AddressInfo } from "net";
import { Express } from "express";
import request from "supertest";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { AutoLLMClient } from "../src/autoClient";
import { LLMClient } from "../src/baseClient";
import {
  EmptyResponseError,
  ToolCallArgumentParseError,
  UnsupportedParameterError,
  UpstreamError,
} from "../src/errors";
import { createServerApp } from "../src/integration/server";
import { MmspClient } from "../src/mmsp";
import {
  ContentItem,
  EventContentItem,
  FinishReason,
  UniConfig,
  UniEvent,
  UniMessage,
  UsageMetadata,
} from "../src/types";
import * as wire from "../src/wire";
import { assertStreamGrammar } from "./streamGrammar";

// The server routes through AutoLLMClient, which builds a scripted upstream here; the client
// under test is MmspClient itself, since this file replaces AutoLLMClient.
jest.mock("../src/autoClient", () => ({ AutoLLMClient: jest.fn() }));

const autoLLMClient = AutoLLMClient as unknown as jest.Mock<
  (options: { model: string; clientType?: string | null }) => LLMClient
>;

// Every client the server routes to here is a scripted one, so nothing reaches a vendor; the
// environment still decides what /v1/models lists and whether the server wants a key.
const SERVER_ENV = [
  "CLIENT_TYPE",
  "MMSP_SERVER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "ZAI_API_KEY",
  "MOONSHOT_API_KEY",
  "DEEPSEEK_API_KEY",
  "MINIMAX_API_KEY",
];

const USAGE: UsageMetadata = {
  cached_tokens: null,
  prompt_tokens: 3,
  thoughts_tokens: null,
  response_tokens: 5,
};

// the signature and header of a 1x1 PNG
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000",
  "hex",
);

function delta(item: EventContentItem): UniEvent {
  return {
    role: "assistant",
    event_type: "delta",
    content_items: [item],
    usage_metadata: null,
    finish_reason: null,
  };
}

function stop(finishReason: FinishReason = "stop"): UniEvent {
  return {
    role: "assistant",
    event_type: "stop",
    content_items: [],
    usage_metadata: USAGE,
    finish_reason: finishReason,
  };
}

function messages(): UniMessage[] {
  return [
    { role: "user", content_items: [{ type: "text.done", text: "你好" }] },
  ];
}

class RuntimeError extends Error {}

/**
 * An upstream client that yields a scripted list of client events, raising the errors in it.
 */
class ScriptedClient extends LLMClient {
  constructor(
    private readonly script: (UniEvent | Error)[],
    model = "scripted",
  ) {
    super();
    this._model = model;
  }

  transformUniConfigToModelConfig(config: UniConfig): UniConfig {
    if (config.temperature != null) {
      throw new UnsupportedParameterError({
        client: "ScriptedClient",
        parameter: "temperature",
        message: "ScriptedClient does not support temperature.",
      });
    }
    return { ...config };
  }

  transformUniMessageToModelInput(messages: UniMessage[]): UniMessage[] {
    return messages;
  }

  transformModelOutputToUniEvent(modelOutput: UniEvent): UniEvent {
    return modelOutput;
  }

  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    this.transformUniConfigToModelConfig(options.config);
    for (const event of this.script) {
      if (event instanceof Error) {
        throw event;
      }
      yield this.transformModelOutputToUniEvent(event);
    }
  }

  async listModels(): Promise<string[]> {
    return [`${this._model}-a`, `${this._model}-b`];
  }
}

/**
 * Streams a text delta every 50 ms until its request is aborted or it is told to stop, and
 * records that its stream was closed.
 */
class SlowScriptedClient extends ScriptedClient {
  stopped = false;
  cleaned = false;

  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    try {
      while (!this.stopped) {
        // the base class does not cancel a client: each one hands the signal to its request,
        // which fails once the signal fires
        options.signal?.throwIfAborted();
        yield delta({
          type: "text.delta",
          text: "tick",
          fidelity: { item_id: "0" },
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } finally {
      this.cleaned = true;
    }
  }
}

/**
 * Stays silent for half a second before it streams its script, as a model does while it thinks.
 */
class SilentScriptedClient extends ScriptedClient {
  async *_streamingResponseInternal(options: {
    messages: UniMessage[];
    config: UniConfig;
    signal?: AbortSignal;
  }): AsyncGenerator<UniEvent> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    yield* super._streamingResponseInternal(options);
  }
}

class FailingListClient extends ScriptedClient {
  async listModels(): Promise<string[]> {
    throw new RuntimeError("401 unauthorized");
  }
}

/**
 * Routes every model the server is asked for to the client `upstream(model)` builds.
 */
function routeTo(upstream: (model: string) => LLMClient): void {
  autoLLMClient.mockImplementation((options) => upstream(options.model));
}

/**
 * The (model, clientType) of every client the server constructed.
 */
function constructions(): [string, string | null][] {
  return autoLLMClient.mock.calls.map(([options]) => [
    options.model,
    options.clientType ?? null,
  ]);
}

const servers: http.Server[] = [];

/**
 * Serves an app on a free local port and returns its base URL.
 */
async function serve(app: Express): Promise<string> {
  const server = await new Promise<http.Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  autoLLMClient.mockReset();
  savedEnv = Object.fromEntries(
    SERVER_ENV.map((name) => [name, process.env[name]]),
  );
  for (const name of SERVER_ENV) {
    delete process.env[name];
  }
});

afterEach(async () => {
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

function mmspClient(url: string): MmspClient {
  return new MmspClient({ model: "gpt-5.5", baseUrl: url, apiKey: "test-key" });
}

async function collect(
  client: LLMClient,
  config: UniConfig = {},
): Promise<UniEvent[]> {
  const events: UniEvent[] = [];
  for await (const event of client.streamingResponse({
    messages: messages(),
    config,
  })) {
    events.push(event);
  }
  return events;
}

/**
 * What a stream raises; the events before it go into `events`.
 */
async function raised(
  client: LLMClient,
  config: UniConfig = {},
  events: UniEvent[] = [],
): Promise<Error> {
  try {
    for await (const event of client.streamingResponse({
      messages: messages(),
      config,
    })) {
      events.push(event);
    }
  } catch (error) {
    return error as Error;
  }
  throw new Error("the stream raised nothing");
}

/**
 * The events without their timestamps, which each side stamps on its own.
 */
function strip(events: UniEvent[]): UniEvent[] {
  return events.map((event) => ({ ...event, created_at: undefined }));
}

function doneItems(events: UniEvent[]): ContentItem[] {
  return events
    .flatMap((event) => event.content_items)
    .filter((item): item is ContentItem => item.type.endsWith(".done"));
}

function sseEvents(body: string): string[] {
  return body
    .split("\n\n")
    .filter((chunk) => chunk)
    .map((chunk) => chunk.slice("data: ".length));
}

interface StreamCase {
  name: string;
  script: UniEvent[];
  doneItems: ContentItem[];
}

const STREAM_CASES: StreamCase[] = [
  // GPT's commentary then its final answer: two text items told apart by their ids only
  {
    name: "two_text_items_of_different_phase",
    script: [
      delta({
        type: "text.delta",
        text: "",
        fidelity: { item_id: "0", phase: "commentary" },
      }),
      delta({
        type: "text.delta",
        text: "Checking.",
        fidelity: { item_id: "0" },
      }),
      delta({
        type: "text.delta",
        text: "",
        fidelity: { item_id: "1", phase: "final_answer" },
      }),
      delta({ type: "text.delta", text: "Done.", fidelity: { item_id: "1" } }),
      stop(),
    ],
    doneItems: [
      {
        type: "text.done",
        text: "Checking.",
        fidelity: { phase: "commentary" },
      },
      { type: "text.done", text: "Done.", fidelity: { phase: "final_answer" } },
    ],
  },
  {
    name: "tool_call",
    script: [
      delta({
        type: "tool_call.delta",
        name: "get_weather",
        arguments: "",
        tool_call_id: "call_1",
        fidelity: { item_id: "fc_1" },
      }),
      delta({
        type: "tool_call.delta",
        name: "",
        arguments: '{"city": ',
        tool_call_id: "",
        fidelity: { item_id: "fc_1" },
      }),
      delta({
        type: "tool_call.delta",
        name: "",
        arguments: '"巴黎"}',
        tool_call_id: "",
        fidelity: { item_id: "fc_1" },
      }),
      stop("tool_call"),
    ],
    doneItems: [
      {
        type: "tool_call.done",
        name: "get_weather",
        arguments: { city: "巴黎" },
        tool_call_id: "call_1",
      },
    ],
  },
  // Anthropic's signature arrives on an empty thinking delta after the thinking text
  {
    name: "thinking_with_signature",
    script: [
      delta({
        type: "thinking.delta",
        thinking: "Let me think.",
        fidelity: { item_id: "0" },
      }),
      delta({
        type: "thinking.delta",
        thinking: "",
        fidelity: { item_id: "0", signature: "sig-1" },
      }),
      delta({ type: "text.delta", text: "Hello", fidelity: { item_id: "1" } }),
      stop(),
    ],
    doneItems: [
      {
        type: "thinking.done",
        thinking: "Let me think.",
        fidelity: { signature: "sig-1" },
      },
      { type: "text.done", text: "Hello" },
    ],
  },
  {
    name: "image",
    script: [
      delta({
        type: "inline_data.delta",
        data: PNG,
        mime_type: "image/png",
        fidelity: { item_id: "inline_data" },
      }),
      delta({
        type: "text.delta",
        text: "A pixel.",
        fidelity: { item_id: "text" },
      }),
      stop(),
    ],
    doneItems: [
      { type: "inline_data.done", data: PNG, mime_type: "image/png" },
      { type: "text.done", text: "A pixel." },
    ],
  },
  {
    name: "audio",
    script: [
      ...[Buffer.from([1, 2]), Buffer.from([3, 4]), Buffer.from([5, 6])].map(
        (chunk) =>
          delta({
            type: "inline_data.delta",
            data: chunk,
            mime_type: "audio/pcm; rate=24000; channels=1",
            fidelity: { item_id: "0" },
          }),
      ),
      stop(),
    ],
    doneItems: [
      {
        type: "inline_data.done",
        data: Buffer.from([1, 2, 3, 4, 5, 6]),
        mime_type: "audio/pcm; rate=24000; channels=1",
      },
    ],
  },
  // gemini_official's thought signature after an image thought: fidelity alone, under the image's id
  {
    name: "image_thought_with_signature",
    script: [
      delta({
        type: "inline_thinking.delta",
        data: PNG,
        mime_type: "image/png",
        fidelity: { item_id: "1" },
      }),
      delta({
        type: "thinking.delta",
        thinking: "",
        fidelity: { item_id: "1", signature: "sig-image" },
      }),
      delta({
        type: "text.delta",
        text: "Here it is.",
        fidelity: { item_id: "2" },
      }),
      stop(),
    ],
    doneItems: [
      {
        type: "inline_thinking.done",
        data: PNG,
        mime_type: "image/png",
        fidelity: { signature: "sig-image" },
      },
      { type: "text.done", text: "Here it is." },
    ],
  },
  {
    name: "two_embeddings",
    script: [
      delta({ type: "embedding.delta", embedding: [0.1, 0.2] }),
      delta({ type: "embedding.delta", embedding: [0.3, 0.4] }),
      stop(),
    ],
    doneItems: [
      { type: "embedding.done", embedding: [0.1, 0.2] },
      { type: "embedding.done", embedding: [0.3, 0.4] },
    ],
  },
];

const FAILING_SCRIPT: (UniEvent | Error)[] = [
  delta({ type: "text.delta", text: "Hel", fidelity: { item_id: "0" } }),
  new RuntimeError("connection reset"),
];

describe("MMSP server stream", () => {
  test.each(STREAM_CASES)(
    "through the server equals the upstream stream: $name",
    async (testCase) => {
      routeTo((model) => new ScriptedClient(testCase.script, model));
      const url = await serve(createServerApp());

      const expected = await collect(new ScriptedClient(testCase.script));
      const actual = await collect(mmspClient(url));

      expect(strip(actual)).toEqual(strip(expected));
      expect(doneItems(actual)).toEqual(testCase.doneItems);
      // toEqual compares bytes by value, so it would pass base64 text left undecoded
      for (const item of actual.flatMap((event) => event.content_items)) {
        if ("data" in item) {
          expect(Buffer.isBuffer(item.data)).toBe(true);
        }
      }
      assertStreamGrammar(actual);
    },
  );

  test("a thinking-only response raises the upstream EmptyResponseError", async () => {
    const script = [
      delta({
        type: "thinking.delta",
        thinking: "Hmm.",
        fidelity: { item_id: "0" },
      }),
      stop(),
    ];
    routeTo((model) => new ScriptedClient(script, model));
    const url = await serve(createServerApp());

    const error = await raised(mmspClient(url));

    expect(error).toBeInstanceOf(EmptyResponseError);
    expect(error).toMatchObject({
      client: "ScriptedClient",
      finishReason: "stop",
      usageMetadata: USAGE,
    });
    expect(error.message).toBe(
      (await raised(new ScriptedClient(script))).message,
    );
  });

  test("an unsupported parameter raises the upstream UnsupportedParameterError", async () => {
    const script = [delta({ type: "text.delta", text: "Hi" }), stop()];
    routeTo((model) => new ScriptedClient(script, model));
    const url = await serve(createServerApp());

    const error = await raised(mmspClient(url), { temperature: 0.1 });

    expect(error).toBeInstanceOf(UnsupportedParameterError);
    expect(error).toMatchObject({
      client: "ScriptedClient",
      parameter: "temperature",
      message: "ScriptedClient does not support temperature.",
    });
  });

  test("unparsable tool call arguments raise the upstream ToolCallArgumentParseError", async () => {
    const script = [
      delta({
        type: "tool_call.delta",
        name: "f",
        arguments: '{"a":',
        tool_call_id: "call_1",
      }),
      stop("tool_call"),
    ];
    routeTo((model) => new ScriptedClient(script, model));
    const url = await serve(createServerApp());

    const error = await raised(mmspClient(url));

    expect(error).toBeInstanceOf(ToolCallArgumentParseError);
    expect(error).toMatchObject({
      client: "ScriptedClient",
      toolName: "f",
      toolCallId: "call_1",
      rawArgumentsPreview: '{"a":',
      rawArgumentsLength: 5,
    });
    expect(error.message).toBe(
      (await raised(new ScriptedClient(script))).message,
    );
  });

  test("any other upstream failure raises an UpstreamError after the deltas before it", async () => {
    routeTo((model) => new ScriptedClient(FAILING_SCRIPT, model));
    const url = await serve(createServerApp());
    const events: UniEvent[] = [];

    const error = await raised(mmspClient(url), {}, events);

    expect(events.map((event) => event.content_items)).toEqual([
      [{ type: "text.delta", text: "Hel" }],
    ]);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      client: "MmspClient",
      status: null,
      errorType: "RuntimeError",
      message: "connection reset",
    });
  });

  test("aborting the client cancels the upstream through the server", async () => {
    const upstream = new SlowScriptedClient([]);
    routeTo(() => upstream);
    const url = await serve(createServerApp());
    const controller = new AbortController();
    const events: UniEvent[] = [];
    let error: unknown;

    try {
      try {
        for await (const event of mmspClient(url).streamingResponse({
          messages: messages(),
          config: {},
          signal: controller.signal,
        })) {
          events.push(event);
          controller.abort();
        }
      } catch (caught) {
        error = caught;
      }

      expect(events[0].content_items).toEqual([
        { type: "text.delta", text: "tick" },
      ]);
      expect((error as Error).name).toBe("AbortError");
      // the server aborts its request when the connection closes, and the upstream stops at
      // its next delta
      const deadline = Date.now() + 5000;
      while (!upstream.cleaned && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(upstream.cleaned).toBe(true);
    } finally {
      upstream.stopped = true;
    }
  }, 10_000);

  test("a silent upstream is kept alive with comments the client skips", async () => {
    // the server reads the constant off this module object at each write, so the change reaches it
    const keepAlive = jest.replaceProperty(
      wire as { KEEPALIVE_SECONDS: number },
      "KEEPALIVE_SECONDS",
      0.05,
    );
    const script = [
      delta({ type: "text.delta", text: "Hello", fidelity: { item_id: "0" } }),
      stop(),
    ];
    routeTo((model) => new SilentScriptedClient(script, model));
    const app = createServerApp();

    try {
      const response = await request(app)
        .post("/v1/stream")
        .send({ model: "gpt-5.5", messages: messages() });

      const chunks = response.text.split("\n\n");
      const firstEvent = chunks.findIndex((chunk) =>
        chunk.startsWith("data: "),
      );
      // half a second of silence at one comment every 50 ms; a loaded machine may write fewer
      expect(firstEvent).toBeGreaterThanOrEqual(2);
      expect(new Set(chunks.slice(0, firstEvent))).toEqual(
        new Set([": keep-alive"]),
      );

      const expected = await collect(new ScriptedClient(script));
      const actual = await collect(mmspClient(await serve(app)));
      expect(strip(actual)).toEqual(strip(expected));
    } finally {
      keepAlive.restore();
    }
  });
});

describe("MMSP server requests", () => {
  test.each([
    ["not_json", "not json", "Request body must be a JSON object."],
    ["no_model", {}, "model must be a non-empty string."],
    [
      "no_messages",
      { model: "gpt-5.5" },
      "messages must be a list of messages.",
    ],
    [
      "config_not_an_object",
      { model: "gpt-5.5", messages: [], config: [] },
      "config must be an object.",
    ],
  ])(
    "a malformed stream request is refused: %s",
    async (_name, body, message) => {
      const response = await request(createServerApp())
        .post("/v1/stream")
        .set("Content-Type", "application/json")
        .send(body);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: { type: "InvalidRequestError", message },
      });
    },
  );

  test("a server with a key refuses requests without it", async () => {
    routeTo((model) => new ScriptedClient([], model));
    const app = createServerApp({ apiKey: "secret" });
    const refusal = {
      error: {
        type: "AuthenticationError",
        message: "Invalid or missing API key.",
      },
    };

    const missing = await request(app)
      .post("/v1/stream")
      .send({ model: "gpt-5.5", messages: [] });
    const wrong = await request(app)
      .get("/v1/models")
      .set("Authorization", "Bearer guess");
    const right = await request(app)
      .get("/v1/models")
      .set("Authorization", "Bearer secret");

    expect([missing.status, missing.body]).toEqual([401, refusal]);
    expect([wrong.status, wrong.body]).toEqual([401, refusal]);
    expect(right.status).toBe(200);
  });

  test("the server reads its key from the environment", async () => {
    process.env.MMSP_SERVER_API_KEY = "secret";

    const response = await request(createServerApp()).get("/v1/models");

    expect(response.status).toBe(401);
  });

  test("a client with a wrong key raises an UpstreamError with the status", async () => {
    routeTo((model) => new ScriptedClient([], model));
    const url = await serve(createServerApp({ apiKey: "secret" }));

    const error = await raised(mmspClient(url));

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      status: 401,
      errorType: "AuthenticationError",
      message: "Invalid or missing API key.",
    });
  });

  test("a model of no known family is refused with the routing error", async () => {
    const actual =
      jest.requireActual<typeof import("../src/autoClient")>(
        "../src/autoClient",
      );
    autoLLMClient.mockImplementation(
      (options) => new actual.AutoLLMClient(options),
    );

    const response = await request(createServerApp())
      .post("/v1/stream")
      .send({ model: "qwen3.6", messages: messages() });

    expect(response.status).toBe(400);
    expect(response.body.error.type).toBe("InvalidRequestError");
    expect(response.body.error.message).toContain("Pass clientType");
  });

  test("a failing stream ends with an error event, then the done marker", async () => {
    routeTo((model) => new ScriptedClient(FAILING_SCRIPT, model));

    const response = await request(createServerApp())
      .post("/v1/stream")
      .send({ model: "gpt-5.5", messages: messages() });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    const events = sseEvents(response.text);
    expect(JSON.parse(events[events.length - 2])).toEqual({
      error: { type: "RuntimeError", message: "connection reset" },
    });
    expect(events[events.length - 1]).toBe("[DONE]");
  });

  test("the server refuses to route to an MMSP server", () => {
    process.env.CLIENT_TYPE = "mmsp";

    expect(() => createServerApp()).toThrow("CLIENT_TYPE=mmsp");
  });
});

describe("MMSP server models", () => {
  test("lists each official client whose key the environment holds", async () => {
    process.env.OPENAI_API_KEY = "sk-openai";
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    routeTo((model) => new ScriptedClient([], model));
    const app = createServerApp();
    const expected = ["gpt--a", "gpt--b", "claude--a", "claude--b"];

    const response = await request(app).get("/v1/models");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ models: expected });
    // built by family alone, so each listing keeps the ids that route to that client
    expect(constructions()).toEqual([
      ["gpt-", null],
      ["claude-", null],
    ]);
    await expect(mmspClient(await serve(app)).listModels()).resolves.toEqual(
      expected,
    );
  });

  test("lists the endpoint of the client type whole", async () => {
    process.env.CLIENT_TYPE = "openai-chat";
    process.env.OPENAI_API_KEY = "sk-openai";
    routeTo((model) => new ScriptedClient([], model));
    const app = createServerApp();

    const response = await request(app).get("/v1/models");

    expect(response.body).toEqual({ models: ["-a", "-b"] });
    expect(constructions()).toEqual([["", null]]);
    await expect(mmspClient(await serve(app)).listModels()).resolves.toEqual([
      "-a",
      "-b",
    ]);
  });

  test("lists nothing without any vendor key", async () => {
    routeTo((model) => new ScriptedClient([], model));

    const response = await request(createServerApp()).get("/v1/models");

    expect(response.body).toEqual({ models: [] });
  });

  test("a failing listing is a bad gateway", async () => {
    process.env.OPENAI_API_KEY = "sk-openai";
    routeTo((model) => new FailingListClient([], model));
    const app = createServerApp();

    const response = await request(app).get("/v1/models");

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: { type: "RuntimeError", message: "401 unauthorized" },
    });
    const error = await mmspClient(await serve(app))
      .listModels()
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({ status: 502, errorType: "RuntimeError" });
  });
});
