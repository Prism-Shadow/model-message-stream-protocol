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

import * as fs from "fs";
import http from "http";
import { AddressInfo } from "net";
import * as os from "os";
import * as path from "path";
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
import { UnsupportedParameterError, UpstreamError } from "../src/errors";
import {
  ModelRow,
  RETENTION_S,
  ServerMetrics,
  announceServer,
  createServerApp,
  loadServerConfig,
  readHistory,
  readServerConfig,
  resolveServerConfig,
  startServer,
} from "../src/integration/server";
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

// The server builds every row's upstream through AutoLLMClient, which builds a scripted client
// here; the client under test is MmspClient itself, since this file replaces AutoLLMClient.
jest.mock("../src/autoClient", () => ({ AutoLLMClient: jest.fn() }));

const autoLLMClient = AutoLLMClient as unknown as jest.Mock<
  (options: {
    model: string;
    apiKey?: string;
    baseUrl?: string | null;
    clientType?: string | null;
  }) => LLMClient
>;

// Every upstream the server builds here is a scripted client, so nothing reaches a vendor; the
// table decides what is served and which keys open it.
const SERVER_ENV = [
  "MMSP_SERVER_CONFIG",
  "PROBE_UPSTREAM_KEY",
  "PROBE_SERVER_KEY",
  "PROBE_BASE_URL",
];

const REQUIRED_COLUMNS = ["model_id", "api_key", "server_model_id"] as const;

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

/**
 * Builds every row's upstream with `factory(model)` in place of AutoLLMClient.
 */
function useUpstream(factory: (model: string) => LLMClient): void {
  autoLLMClient.mockImplementation((options) => factory(options.model));
}

type Construction = [
  model: string,
  clientType: string | null,
  apiKey: string | null,
  baseUrl: string | null,
];

/**
 * What every upstream the server built was built with.
 */
function constructions(): Construction[] {
  return autoLLMClient.mock.calls.map(([options]) => [
    options.model,
    options.clientType ?? null,
    options.apiKey ?? null,
    options.baseUrl ?? null,
  ]);
}

/**
 * A row of the models table: an openai-responses upstream, unless `overrides` names another.
 */
function row(
  modelId: string,
  serverModelId = modelId,
  overrides: Partial<ModelRow> = {},
): ModelRow {
  return {
    model_id: modelId,
    base_url: "https://upstream.example/v1",
    api_key: "sk-upstream",
    server_model_id: serverModelId,
    client_type: "openai-responses",
    ...overrides,
  };
}

function serverApp(
  options: {
    models?: ModelRow[];
    apiKeys?: string[];
    metricsPath?: string;
  } = {},
): Express {
  return createServerApp({ models: [row("gpt-5.5")], ...options });
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
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
}

const tempDirs: string[] = [];

/**
 * A directory removed after the test.
 */
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mmsp-"));
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a config file, JSON unless `content` is already text, and returns its path.
 */
function configFile(content: unknown): string {
  const file = path.join(tempDir(), "server.json");
  fs.writeFileSync(
    file,
    typeof content === "string" ? content : JSON.stringify(content),
  );
  return file;
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
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function mmspClient(url: string, model = "gpt-5.5"): MmspClient {
  return new MmspClient({ model, baseUrl: url, apiKey: "test-key" });
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
      useUpstream((model) => new ScriptedClient(testCase.script, model));
      const url = await serve(serverApp());

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

  test("the client yields the server's events as sent", async () => {
    const [testCase] = STREAM_CASES;
    expect(testCase.name).toBe("two_text_items_of_different_phase");
    useUpstream((model) => new ScriptedClient(testCase.script, model));
    const url = await serve(serverApp());
    // a copy of the body the client reads: two requests would be stamped at two moments
    const realFetch = globalThis.fetch;
    const bodies: Promise<string>[] = [];
    const spy = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const response = await realFetch(input, init);
        bodies.push(response.clone().text());
        return response;
      });

    const actual = await collect(mmspClient(url)).finally(() =>
      spy.mockRestore(),
    );

    expect(bodies).toHaveLength(1);
    const raw = sseEvents(await bodies[0])
      .filter((data) => data !== "[DONE]")
      .map((data) => wire.decodeWire(JSON.parse(data)));
    expect(actual).toEqual(raw);
    expect(actual.every((event) => event.created_at !== undefined)).toBe(true);
  });

  test("a thinking-only response raises an UpstreamError carrying the EmptyResponseError", async () => {
    const script = [
      delta({
        type: "thinking.delta",
        thinking: "Hmm.",
        fidelity: { item_id: "0" },
      }),
      stop(),
    ];
    useUpstream((model) => new ScriptedClient(script, model));
    const url = await serve(serverApp());

    const error = await raised(mmspClient(url));
    const direct = await raised(new ScriptedClient(script));

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      client: "MmspClient",
      status: null,
      errorType: "EmptyResponseError",
      message: direct.message,
    });
    expect((error as UpstreamError).error).toEqual({
      type: "EmptyResponseError",
      message: direct.message,
      client: "ScriptedClient",
      finish_reason: "stop",
      usage_metadata: USAGE,
    });
  });

  test("an unsupported parameter raises an UpstreamError carrying the UnsupportedParameterError", async () => {
    const script = [delta({ type: "text.delta", text: "Hi" }), stop()];
    useUpstream((model) => new ScriptedClient(script, model));
    const url = await serve(serverApp());

    const error = await raised(mmspClient(url), { temperature: 0.1 });

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      errorType: "UnsupportedParameterError",
      message: "ScriptedClient does not support temperature.",
    });
    expect((error as UpstreamError).error).toMatchObject({
      parameter: "temperature",
      client: "ScriptedClient",
    });
  });

  test("unparsable tool call arguments raise an UpstreamError carrying the ToolCallArgumentParseError", async () => {
    const script = [
      delta({
        type: "tool_call.delta",
        name: "f",
        arguments: '{"a":',
        tool_call_id: "call_1",
      }),
      stop("tool_call"),
    ];
    useUpstream((model) => new ScriptedClient(script, model));
    const url = await serve(serverApp());

    const error = await raised(mmspClient(url));

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      errorType: "ToolCallArgumentParseError",
      message: (await raised(new ScriptedClient(script))).message,
    });
    expect((error as UpstreamError).error).toMatchObject({
      tool_name: "f",
      tool_call_id: "call_1",
      raw_arguments_preview: '{"a":',
      raw_arguments_length: 5,
    });
  });

  test("any other upstream failure raises an UpstreamError after the deltas before it", async () => {
    useUpstream((model) => new ScriptedClient(FAILING_SCRIPT, model));
    const url = await serve(serverApp());
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
    expect((error as UpstreamError).error).toEqual({
      type: "RuntimeError",
      message: "connection reset",
    });
  });

  test("aborting the client cancels the upstream through the server", async () => {
    const upstream = new SlowScriptedClient([]);
    useUpstream(() => upstream);
    const url = await serve(serverApp());
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
    useUpstream((model) => new SilentScriptedClient(script, model));
    const app = serverApp();

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
      const response = await request(serverApp())
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
    useUpstream((model) => new ScriptedClient([], model));
    const app = serverApp({ apiKeys: ["secret"] });
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

  test("a client with a wrong key raises an UpstreamError with the status", async () => {
    useUpstream((model) => new ScriptedClient([], model));
    const url = await serve(serverApp({ apiKeys: ["secret"] }));

    const error = await raised(mmspClient(url));

    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      status: 401,
      errorType: "AuthenticationError",
      message: "Invalid or missing API key.",
    });
    expect((error as UpstreamError).error).toEqual({
      type: "AuthenticationError",
      message: "Invalid or missing API key.",
    });
  });

  test("a failing stream ends with an error event, then the done marker", async () => {
    useUpstream((model) => new ScriptedClient(FAILING_SCRIPT, model));

    const response = await request(serverApp())
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

  test("each row streams its own upstream with its own columns", async () => {
    const scripts: Record<string, UniEvent[]> = {
      "gpt-5.5": [
        delta({
          type: "text.delta",
          text: "from gpt",
          fidelity: { item_id: "0" },
        }),
        stop(),
      ],
      "claude-sonnet-5-5": [
        delta({
          type: "text.delta",
          text: "from claude",
          fidelity: { item_id: "0" },
        }),
        stop(),
      ],
    };
    useUpstream((model) => new ScriptedClient(scripts[model], model));
    const app = serverApp({
      models: [
        row("gpt-5.5"),
        row("claude-sonnet-5-5", "claude", {
          base_url: "https://gw.example",
          api_key: "sk-row",
          client_type: "ant-messages",
        }),
      ],
    });
    const url = await serve(app);

    expect(constructions()).toEqual([
      [
        "gpt-5.5",
        "openai-responses",
        "sk-upstream",
        "https://upstream.example/v1",
      ],
      ["claude-sonnet-5-5", "ant-messages", "sk-row", "https://gw.example"],
    ]);
    expect(strip(await collect(mmspClient(url)))).toEqual(
      strip(await collect(new ScriptedClient(scripts["gpt-5.5"]))),
    );
    expect(strip(await collect(mmspClient(url, "claude")))).toEqual(
      strip(await collect(new ScriptedClient(scripts["claude-sonnet-5-5"]))),
    );
    // the upstream id is not an alias of the row
    const upstreamId = await request(app)
      .post("/v1/stream")
      .send({ model: "claude-sonnet-5-5", messages: messages() });
    expect(upstreamId.status).toBe(404);
  });

  test("a request for a model not in the table is not found", async () => {
    const app = serverApp();
    const message =
      "The model 'gpt-4' does not exist; GET /v1/models lists the models this server serves.";

    const response = await request(app)
      .post("/v1/stream")
      .send({ model: "gpt-4", messages: messages() });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { type: "NotFoundError", message },
    });
    const error = await raised(mmspClient(await serve(app), "gpt-4"));
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error).toMatchObject({
      status: 404,
      errorType: "NotFoundError",
      message,
    });
    expect((error as UpstreamError).error.type).toBe("NotFoundError");
  });

  test("the server accepts any of its keys", async () => {
    const script = [
      delta({ type: "text.delta", text: "Hi", fidelity: { item_id: "0" } }),
      stop(),
    ];
    useUpstream((model) => new ScriptedClient(script, model));
    const app = serverApp({ apiKeys: ["k1", "k2"] });

    const statuses = [];
    for (const key of ["k1", "k2", "k3"]) {
      const response = await request(app)
        .get("/v1/models")
        .set("Authorization", `Bearer ${key}`);
      statuses.push(response.status);
    }
    statuses.push((await request(app).get("/v1/models")).status);

    expect(statuses).toEqual([200, 200, 401, 401]);
    const client = new MmspClient({
      model: "gpt-5.5",
      baseUrl: await serve(app),
      apiKey: "k2",
    });
    expect(strip(await collect(client))).toEqual(
      strip(await collect(new ScriptedClient(script))),
    );
  });

  test("a server without keys is open", async () => {
    for (const app of [serverApp(), serverApp({ apiKeys: [] })]) {
      const response = await request(app).get("/v1/models");

      expect(response.status).toBe(200);
    }
  });

  test("an empty table refuses to start", () => {
    expect(() => createServerApp({ models: [] })).toThrow(
      "models is empty: the server needs at least one model row.",
    );
  });

  test.each(REQUIRED_COLUMNS)(
    "a row with a missing or empty column refuses to start: %s",
    (column) => {
      const missing: Partial<ModelRow> = row("gpt-5.5");
      delete missing[column];
      const empty = { ...row("gpt-5.5"), [column]: "" };
      const message = `models[0]: ${column} must be a non-empty string.`;

      expect(() => createServerApp({ models: [missing as ModelRow] })).toThrow(
        message,
      );
      expect(() => createServerApp({ models: [empty] })).toThrow(message);
    },
  );

  test("a duplicate server_model_id refuses to start", () => {
    expect(() =>
      createServerApp({
        models: [row("gpt-5.5"), row("gpt-5.5-mini", "gpt-5.5")],
      }),
    ).toThrow(
      "models[1]: server_model_id 'gpt-5.5' is already used by models[0].",
    );
  });

  test("a row the upstream client refuses names the row, and a relay row builds", async () => {
    const actual =
      jest.requireActual<typeof import("../src/autoClient")>(
        "../src/autoClient",
      );
    autoLLMClient.mockImplementation(
      (options) => new actual.AutoLLMClient(options),
    );

    expect(() =>
      createServerApp({
        models: [
          row("gpt-5.5"),
          row("qwen3.8", "qwen3.8", { client_type: "nope" }),
        ],
      }),
    ).toThrow(/^models\[1\] 'qwen3\.8': Unknown client type/);
    const relay = createServerApp({
      models: [
        row("claude", "claude-relayed", {
          base_url: "http://127.0.0.1:1/v1",
          api_key: "none",
          client_type: "mmsp",
        }),
      ],
    });
    const response = await request(relay).get("/v1/models");
    const ids = response.body.data.map((model: { id: string }) => model.id);
    expect(ids).toEqual(["claude-relayed"]);
    expect(() =>
      createServerApp({
        models: [row("gpt-5.5")],
        apiKeys: [1] as unknown as string[],
      }),
    ).toThrow("api_keys[0] must be a non-empty string.");
    expect(() =>
      createServerApp({
        models: [row("gpt-5.5")],
        apiKeys: "k" as unknown as string[],
      }),
    ).toThrow("api_keys must be a list of non-empty strings.");
  });

  test("a row without client_type or base_url builds with the defaults", () => {
    useUpstream((model) => new ScriptedClient([], model));
    const bare = {
      model_id: "gpt-5.5",
      api_key: "sk-upstream",
      server_model_id: "gpt",
    };

    createServerApp({
      models: [
        bare,
        { ...bare, server_model_id: "empty", base_url: "", client_type: "" },
        { ...bare, server_model_id: "null", base_url: null, client_type: null },
      ] as unknown as ModelRow[],
    });

    expect(constructions()).toEqual([
      ["gpt-5.5", null, "sk-upstream", null],
      ["gpt-5.5", null, "sk-upstream", null],
      ["gpt-5.5", null, "sk-upstream", null],
    ]);
    expect(() =>
      createServerApp({
        models: [{ ...bare, client_type: 5 } as unknown as ModelRow],
      }),
    ).toThrow("models[0]: client_type must be a string.");
  });

  test("an unknown route is a JSON not found", async () => {
    const app = serverApp();
    const notFound = (route: string) => ({
      error: {
        type: "NotFoundError",
        message: `No route for ${route}; the server serves POST /v1/stream, GET /v1/models and GET /v1/metrics.`,
      },
    });

    const models = await request(app).get("/models");
    const stream = await request(app).get("/v1/stream");
    // Express matches paths regardless of case unless told otherwise, which would take
    // /V1/models past the key check
    const shouted = await request(serverApp({ apiKeys: ["secret"] })).get(
      "/V1/models",
    );

    expect([models.status, models.body]).toEqual([
      404,
      notFound("GET /models"),
    ]);
    expect([stream.status, stream.body]).toEqual([
      404,
      notFound("GET /v1/stream"),
    ]);
    expect([shouted.status, shouted.body]).toEqual([
      404,
      notFound("GET /V1/models"),
    ]);
  });
});

describe("MMSP server models", () => {
  test("lists every row in OpenAI format", async () => {
    useUpstream((model) => new ScriptedClient([], model));
    const app = serverApp({
      models: [row("claude-sonnet-5-5", "claude"), row("gpt-5.5")],
    });

    const response = await request(app).get("/v1/models");

    expect(response.status).toBe(200);
    const [created, ...others] = response.body.data.map(
      (model: { created: unknown }) => model.created,
    );
    expect(Number.isInteger(created)).toBe(true);
    expect(others).toEqual([created]);
    expect(response.body).toEqual({
      object: "list",
      data: [
        { id: "claude", object: "model", created, owned_by: "mmsp" },
        { id: "gpt-5.5", object: "model", created, owned_by: "mmsp" },
      ],
    });
    await expect(mmspClient(await serve(app)).listModels()).resolves.toEqual([
      "claude",
      "gpt-5.5",
    ]);
  });
});

// a metrics body as JSON parsed it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Metrics = Record<string, any>;

/**
 * What an app's `GET /v1/metrics` reports, with `key` as the bearer token when given.
 */
async function metricsOf(app: Express, key?: string): Promise<Metrics> {
  const call = request(app).get("/v1/metrics");
  const response = await (key
    ? call.set("Authorization", `Bearer ${key}`)
    : call);
  expect(response.status).toBe(200);
  return response.body;
}

const SNAPSHOT_KEYS = [
  "started_at",
  "since",
  "uptime_s",
  "requests",
  "successes",
  "failures",
  "disconnects",
  "in_flight",
  "success_rate",
  "latency_ms",
  "tokens",
  "tokens_out",
  "generation_ms",
  "tps",
  "refused",
  "last_request_at",
  "errors",
  "models",
];

const MODEL_KEYS = [
  "id",
  "requests",
  "successes",
  "failures",
  "disconnects",
  "in_flight",
  "success_rate",
  "latency_ms",
  "tokens",
  "tokens_out",
  "generation_ms",
  "tps",
  "last_request_at",
  "last_outcome",
  "last_error",
];

// the keys of a window's summary, total and per model, which carry `series` last
const SUMMARY_KEYS = [
  "requests",
  "successes",
  "failures",
  "disconnects",
  "in_flight",
  "success_rate",
  "tokens_out",
  "thoughts",
  "response",
  "generation_ms",
  "tps",
  "latency_ms",
];

const COLUMN_KEYS = [
  "requests",
  "successes",
  "failures",
  "disconnects",
  "tokens_out",
  "thoughts",
  "response",
  "generation_ms",
  "tps",
  "p50",
  "p90",
  "first_event_p50",
  "first_event_p90",
];

const WINDOW_ERROR =
  "window must be an integer number of seconds from 10 to 5184000.";
const RANGE_ERROR =
  "from and to must be unix seconds, from before to and at most 5184000 seconds apart.";
const QUERY_ERROR = "window cannot be combined with from and to.";
const COLUMNS_ERROR = "columns must be an integer from 1 to 1440.";

// the minute 1790000005 falls in: unix minutes are multiples of 60, and 1790000000 is not one
const MINUTE = 1789999980;

function fixedClock(): number {
  return 1790000000;
}

// a stored bucket, as far as the tests read it
interface StoredBucket {
  requests: number;
  successes: number;
  failures: number;
  totalMs: number[];
  firstEventMs: number[];
}

/**
 * The tiers of a store's total, or of one of its models: private fields, read through a cast.
 */
function tiersOf(
  metrics: ServerMetrics,
  modelId?: string,
): Map<number, StoredBucket>[] {
  const store = metrics as unknown as {
    total: { tiers: Map<number, StoredBucket>[] };
    models: Map<string, { tiers: Map<number, StoredBucket>[] }>;
  };
  return modelId === undefined
    ? store.total.tiers
    : store.models.get(modelId)!.tiers;
}

/**
 * A usage with only the given fields reported.
 */
function usage(fields: Partial<UsageMetadata>): UsageMetadata {
  return {
    cached_tokens: null,
    prompt_tokens: null,
    thoughts_tokens: null,
    response_tokens: null,
    ...fields,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const NO_LATENCY = {
  first_event: { p50: null, p90: null },
  total: { p50: null, p90: null },
};

const NO_TOKENS = { prompt: 0, cached: 0, thoughts: 0, response: 0 };

/**
 * A model's entry before any request.
 */
function untouched(id: string): Metrics {
  return {
    id,
    requests: 0,
    successes: 0,
    failures: 0,
    disconnects: 0,
    in_flight: 0,
    success_rate: null,
    latency_ms: NO_LATENCY,
    tokens: NO_TOKENS,
    tokens_out: 0,
    generation_ms: 0,
    tps: null,
    last_request_at: null,
    last_outcome: null,
    last_error: null,
  };
}

describe("MMSP server metrics", () => {
  test("metrics count a success with its latency and tokens", async () => {
    const script = [
      delta({ type: "text.delta", text: "Hi", fidelity: { item_id: "0" } }),
      stop(),
    ];
    useUpstream((model) => new ScriptedClient(script, model));
    const app = serverApp({
      models: [row("claude-sonnet-5-5", "claude"), row("gpt-5.5")],
    });

    const before = await metricsOf(app);
    await collect(mmspClient(await serve(app)));
    const after = await metricsOf(app);

    expect(Object.keys(before)).toEqual(SNAPSHOT_KEYS);
    // a store without a history file begins its history when it starts
    expect(before.since).toBe(before.started_at);
    expect(before).toMatchObject({
      requests: 0,
      in_flight: 0,
      success_rate: null,
      latency_ms: NO_LATENCY,
      tokens: NO_TOKENS,
      refused: { unauthorized: 0, invalid_request: 0, unknown_model: 0 },
      last_request_at: null,
      errors: [],
      models: [untouched("claude"), untouched("gpt-5.5")],
    });
    expect(Number.isInteger(after.started_at)).toBe(true);
    expect(after.uptime_s).toBeGreaterThanOrEqual(0);
    expect(after).toMatchObject({
      requests: 1,
      successes: 1,
      failures: 0,
      disconnects: 0,
      in_flight: 0,
      success_rate: 1,
      tokens: { prompt: 3, cached: 0, thoughts: 0, response: 5 },
      tokens_out: 5,
      errors: [],
    });
    expect(after.generation_ms).toBeGreaterThanOrEqual(1);
    expect(after.tps).toBe(Math.round((5 * 10000) / after.generation_ms) / 10);
    const { first_event: firstEvent, total } = after.latency_ms;
    expect(Number.isInteger(total.p50)).toBe(true);
    expect(total.p90).toBe(total.p50);
    expect(firstEvent.p50).toBeLessThanOrEqual(total.p50);
    expect(Math.abs(after.last_request_at - Date.now() / 1000)).toBeLessThan(
      60,
    );
    expect(after.models[0]).toEqual(untouched("claude"));
    const [, gpt] = after.models;
    expect(Object.keys(gpt)).toEqual(MODEL_KEYS);
    expect(gpt).toEqual({
      id: "gpt-5.5",
      requests: 1,
      successes: 1,
      failures: 0,
      disconnects: 0,
      in_flight: 0,
      success_rate: 1,
      latency_ms: after.latency_ms,
      tokens: after.tokens,
      tokens_out: 5,
      generation_ms: after.generation_ms,
      tps: after.tps,
      last_request_at: after.last_request_at,
      last_outcome: "success",
      last_error: null,
    });
  });

  test("metrics count a failure with its error", async () => {
    useUpstream((model) => new ScriptedClient(FAILING_SCRIPT, model));
    const app = serverApp();

    await raised(mmspClient(await serve(app)));
    const metrics = await metricsOf(app);

    expect(metrics).toMatchObject({
      requests: 1,
      successes: 0,
      failures: 1,
      disconnects: 0,
      in_flight: 0,
      success_rate: 0,
      latency_ms: NO_LATENCY,
      tokens: NO_TOKENS,
    });
    const [model] = metrics.models;
    expect(model).toMatchObject({
      failures: 1,
      success_rate: 0,
      tokens_out: 0,
      tps: null,
      last_outcome: "failure",
      last_error: { message: "connection reset" },
    });
    expect(Math.abs(model.last_error.at - Date.now() / 1000)).toBeLessThan(60);
    expect(metrics.errors).toEqual([
      {
        at: model.last_error.at,
        model: "gpt-5.5",
        message: "connection reset",
      },
    ]);
  });

  test("metrics count a disconnect apart from failures", async () => {
    const upstream = new SlowScriptedClient([]);
    useUpstream(() => upstream);
    const app = serverApp();
    const url = await serve(app);
    const controller = new AbortController();
    let streaming: Metrics | undefined;

    try {
      try {
        for await (const _event of mmspClient(url).streamingResponse({
          messages: messages(),
          config: {},
          signal: controller.signal,
        })) {
          streaming = await metricsOf(app);
          controller.abort();
        }
      } catch {
        // the abort ends the stream
      }

      expect(streaming).toMatchObject({ requests: 1, in_flight: 1 });
      let metrics = await metricsOf(app);
      const deadline = Date.now() + 5000;
      while (metrics.disconnects === 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        metrics = await metricsOf(app);
      }
      expect(metrics).toMatchObject({
        requests: 1,
        successes: 0,
        failures: 0,
        disconnects: 1,
        in_flight: 0,
        success_rate: null,
      });
      expect(metrics.models[0]).toMatchObject({
        disconnects: 1,
        last_outcome: "disconnect",
        last_error: null,
      });
    } finally {
      upstream.stopped = true;
    }
  }, 10_000);

  test("metrics count refusals without touching the models", async () => {
    useUpstream((model) => new ScriptedClient([], model));
    const app = serverApp({ apiKeys: ["secret"] });
    const keyed = (route: string) =>
      request(app).post(route).set("Authorization", "Bearer secret");

    const statuses = [
      (await request(app).get("/v1/models")).status,
      (await keyed("/v1/stream").send({})).status,
      (
        await keyed("/v1/stream")
          .set("Content-Type", "application/json")
          .send("not json")
      ).status,
      (await keyed("/v1/stream").send({ model: "gpt-4", messages: [] })).status,
    ];
    const metrics = await metricsOf(app, "secret");

    expect(statuses).toEqual([401, 400, 400, 404]);
    expect(metrics).toMatchObject({
      requests: 0,
      in_flight: 0,
      refused: { unauthorized: 1, invalid_request: 2, unknown_model: 1 },
      last_request_at: null,
      models: [untouched("gpt-5.5")],
    });
  });

  test("metrics percentiles are nearest rank over the last thousand", () => {
    let time = 0;
    const metrics = new ServerMetrics(["m"], () => time);
    for (let ms = 100; ms <= 1000; ms += 100) {
      time = 0;
      const sample = metrics.begin("m");
      time = ms / 2000;
      metrics.firstEvent(sample);
      time = ms / 1000;
      // a later event is not the first, and a finished request stays finished
      metrics.firstEvent(sample);
      metrics.finish(sample, "success");
      metrics.finish(sample, "failure", { error: "late" });
    }

    const latency = {
      first_event: { p50: 250, p90: 450 },
      total: { p50: 500, p90: 900 },
    };
    const snapshot = metrics.snapshot() as Metrics;
    expect(snapshot).toMatchObject({
      requests: 10,
      successes: 10,
      failures: 0,
      latency_ms: latency,
    });
    expect(snapshot.models[0]).toMatchObject({
      successes: 10,
      latency_ms: latency,
      last_error: null,
    });

    const windowed = new ServerMetrics(["m"], () => time);
    const succeed = (ms: number) => {
      time = 0;
      const sample = windowed.begin("m");
      time = ms / 1000;
      windowed.finish(sample, "success");
    };
    for (let i = 0; i < 500; i++) {
      succeed(100);
    }
    for (let i = 0; i < 500; i++) {
      succeed(900);
    }
    const full = windowed.snapshot() as Metrics;
    expect(full.latency_ms.total).toEqual({ p50: 100, p90: 900 });
    expect(full.latency_ms.first_event).toEqual({ p50: null, p90: null });

    succeed(900);
    // the first success left the window, so the median moves to the upper half
    const moved = windowed.snapshot() as Metrics;
    expect(moved.latency_ms.total).toEqual({ p50: 900, p90: 900 });
    expect(moved.models[0].latency_ms.total).toEqual({ p50: 900, p90: 900 });
  });

  test("metrics round the success rate half to even and stamp milliseconds", () => {
    const metrics = new ServerMetrics(
      ["m"],
      () => 0,
      () => 1790000000.1234,
    );
    const outcomes: ["success" | "failure", number][] = [
      ["success", 1],
      ["failure", 31],
    ];
    for (const [outcome, count] of outcomes) {
      for (let i = 0; i < count; i++) {
        metrics.finish(metrics.begin("m"), outcome);
      }
    }

    const snapshot = metrics.snapshot() as Metrics;
    // 1 / 32 is 0.03125 exactly, which Python's round() takes to 0.0312
    expect(snapshot.success_rate).toBe(0.0312);
    expect(snapshot).toMatchObject({
      started_at: 1790000000,
      uptime_s: 0,
      last_request_at: 1790000000.123,
    });
    expect(snapshot.models[0].last_error).toEqual({
      at: 1790000000.123,
      message: null,
    });

    const thirds = new ServerMetrics(["m"]);
    thirds.finish(thirds.begin("m"), "success");
    thirds.finish(thirds.begin("m"), "success");
    thirds.finish(thirds.begin("m"), "failure", { error: "boom" });
    thirds.finish(thirds.begin("m"), "disconnect");
    expect(thirds.snapshot()).toMatchObject({
      requests: 4,
      disconnects: 1,
      in_flight: 0,
      success_rate: 0.6667,
    });
  });

  test("metrics require the key", async () => {
    const app = serverApp({ apiKeys: ["secret"] });

    const refused = await request(app).get("/v1/metrics");
    const root = await request(app).get("/");

    expect([refused.status, refused.body]).toEqual([
      401,
      {
        error: {
          type: "AuthenticationError",
          message: "Invalid or missing API key.",
        },
      },
    ]);
    expect([root.status, root.body]).toEqual([
      404,
      {
        error: {
          type: "NotFoundError",
          message:
            "No route for GET /; the server serves POST /v1/stream, GET /v1/models and GET /v1/metrics.",
        },
      },
    ]);
    const metrics = await metricsOf(app, "secret");
    expect(metrics.refused.unauthorized).toBe(1);
    expect(metrics.models).toEqual([untouched("gpt-5.5")]);
  });

  test("createServerApp exposes its metrics", async () => {
    const app = serverApp({
      models: [row("claude-sonnet-5-5", "claude"), row("gpt-5.5")],
    });

    const metrics = app.locals.metrics as ServerMetrics;

    expect(metrics).toBeInstanceOf(ServerMetrics);
    expect(metrics.path).toBeNull();
    expect(metrics.snapshot().models).toEqual([
      untouched("claude"),
      untouched("gpt-5.5"),
    ]);
    // the object the routes count into, so what it reports is what GET /v1/metrics reports
    const unknown = await request(app)
      .post("/v1/stream")
      .send({ model: "nope", messages: [] });
    expect(unknown.status).toBe(404);
    expect(metrics.snapshot().refused).toMatchObject({ unknown_model: 1 });
    expect((await metricsOf(app)).refused).toEqual(metrics.snapshot().refused);

    // with a history file, the store keeps it, and writes it at close once it counted something
    const file = path.join(tempDir(), "m.json");
    const persisted = serverApp({ metricsPath: file });
    const store = persisted.locals.metrics as ServerMetrics;
    try {
      expect(store.path).toBe(file);
      const refused = await request(persisted)
        .post("/v1/stream")
        .send({ model: "nope", messages: [] });
      expect(refused.status).toBe(404);
      expect(fs.existsSync(file)).toBe(false);
    } finally {
      store.close();
    }
    // the refusal, counted in the total's ten-second bucket
    expect(
      readHistory(file).total["10"].map(([, bucket]) => bucket[4]),
    ).toEqual([1]);
  });

  test("metrics sum output tokens and TPS over generation time", () => {
    let moment = 0;
    const metrics = new ServerMetrics(
      ["m"],
      () => moment,
      () => 1790000000 + moment,
    );
    const first = metrics.begin("m");
    moment = 0.5;
    metrics.firstEvent(first);
    moment = 2.5;
    metrics.finish(first, "success", {
      usage: usage({ thoughts_tokens: 20, response_tokens: 80 }),
    });
    moment = 3.0;
    const second = metrics.begin("m");
    moment = 3.2;
    metrics.firstEvent(second);
    metrics.finish(second, "success", {
      usage: usage({ response_tokens: 5 }),
    });

    const snapshot = metrics.snapshot() as Metrics;
    const { total } = metrics.window(60) as Metrics;

    // 2000 ms of generation and 1 ms for the stream whose first event was its last
    for (const series of [snapshot, snapshot.models[0]]) {
      expect(series).toMatchObject({
        tokens: { prompt: 0, cached: 0, thoughts: 20, response: 85 },
        tokens_out: 105,
        generation_ms: 2001,
        tps: 52.5,
      });
    }
    expect(total).toMatchObject({
      tokens_out: 105,
      thoughts: 20,
      response: 85,
      generation_ms: 2001,
      tps: 52.5,
    });
    // both began in the bucket 1790000000, the last of the six
    expect(total.series).toMatchObject({
      tokens_out: [0, 0, 0, 0, 0, 105],
      thoughts: [0, 0, 0, 0, 0, 20],
      response: [0, 0, 0, 0, 0, 85],
      generation_ms: [0, 0, 0, 0, 0, 2001],
      tps: [null, null, null, null, null, 52.5],
    });
    moment = 15;
    expect((metrics.window(60) as Metrics).total.series.tps).toEqual([
      null,
      null,
      null,
      null,
      52.5,
      null,
    ]);
  });

  test("metrics window counts a request in the bucket it began in", () => {
    let wall = 1790000005;
    const metrics = new ServerMetrics(
      ["m"],
      () => wall,
      () => wall,
    );
    const sample = metrics.begin("m");
    wall = 1790000017;
    metrics.firstEvent(sample);
    metrics.finish(sample, "success", {
      usage: usage({ response_tokens: 7 }),
    });

    const windowed = metrics.window(60) as Metrics;

    // the current bucket ends the window, which covers the whole minute, before the history included
    expect(Object.keys(windowed)).toEqual([
      "seconds",
      "bucket_s",
      "start",
      "end",
      "total",
      "models",
      "previous",
    ]);
    expect(windowed).toMatchObject({
      seconds: 60,
      bucket_s: 10,
      start: 1789999960,
      end: 1790000020,
    });
    for (const series of [windowed.total.series, windowed.models[0].series]) {
      expect(series).toMatchObject({
        requests: [0, 0, 0, 0, 1, 0],
        successes: [0, 0, 0, 0, 1, 0],
        tokens_out: [0, 0, 0, 0, 7, 0],
        thoughts: [0, 0, 0, 0, 0, 0],
        response: [0, 0, 0, 0, 7, 0],
        p90: [null, null, null, null, 12000, null],
      });
    }
    expect(windowed.total.series.refused).toEqual([0, 0, 0, 0, 0, 0]);
    expect(windowed.total.in_flight).toBe(0);
    expect(windowed.previous).toBeNull();
    expect(Object.keys(windowed.total)).toEqual([
      ...SUMMARY_KEYS.slice(0, 6),
      "refused",
      ...SUMMARY_KEYS.slice(6),
      "series",
    ]);
    expect(Object.keys(windowed.total.series)).toEqual([
      ...COLUMN_KEYS.slice(0, 4),
      "refused",
      ...COLUMN_KEYS.slice(4),
    ]);
    const [model] = windowed.models;
    expect(Object.keys(model)).toEqual(["id", ...SUMMARY_KEYS, "series"]);
    expect(Object.keys(model.series)).toEqual(COLUMN_KEYS);
  });

  test("metrics window slices the range and reports the previous window", () => {
    let wall = 1790000000;
    const metrics = new ServerMetrics(
      ["m"],
      () => wall,
      () => wall,
    );
    for (let minute = 0; minute < 30; minute++) {
      wall = 1790000000 + minute * 60;
      metrics.finish(metrics.begin("m"), "success");
    }

    const fiveMinutes = metrics.window(300) as Metrics;
    const hour = metrics.window(3600) as Metrics;

    expect(fiveMinutes.total.series.requests).toHaveLength(30);
    expect(sum(fiveMinutes.total.series.requests)).toBe(5);
    expect(fiveMinutes.previous.requests).toBe(5);
    // the hour before the end began before the history, so it has no hour to compare with
    expect(hour.previous).toBeNull();
    expect(hour.start).toBe(hour.end - 3600);
    expect(hour.total.series.requests).toHaveLength(360);
    expect(hour.total.requests).toBe(30);
  });

  test("metrics roll ten-second buckets into minutes after two hours", () => {
    let wall = 1790000005;
    const metrics = new ServerMetrics(
      ["m"],
      () => wall,
      () => wall,
    );
    metrics.finish(metrics.begin("m"), "success");
    const late = metrics.begin("m");
    wall += 7300;
    metrics.finish(metrics.begin("m"), "success");

    expect(tiersOf(metrics)[0].size).toBe(1);
    expect([...tiersOf(metrics)[1].keys()]).toEqual([MINUTE]);
    const minute = tiersOf(metrics)[1].get(MINUTE)!;
    expect([minute.requests, minute.successes, minute.failures]).toEqual([
      2, 1, 0,
    ]);
    expect([...tiersOf(metrics, "m")[1].keys()]).toEqual([MINUTE]);
    // the ten-second columns of the last two hours begin after that minute
    expect((metrics.window(7200) as Metrics).total).toMatchObject({
      requests: 1,
      successes: 1,
      failures: 0,
    });

    // begun in a bucket that has since moved: counted into the minute that holds it now
    metrics.finish(late, "failure", { error: "late" });
    expect(minute.failures).toBe(1);
    const old = metrics.between(MINUTE, MINUTE + 60) as Metrics;
    expect(old.bucket_s).toBe(60);
    expect([old.total.series.requests, old.total.series.failures]).toEqual([
      [2],
      [1],
    ]);
    expect(metrics.snapshot()).toMatchObject({
      requests: 3,
      successes: 2,
      failures: 1,
    });
  });

  test("metrics roll minutes into hours and thin the samples", () => {
    let moment = 0;
    let wall = MINUTE;
    const metrics = new ServerMetrics(
      ["m"],
      () => moment,
      () => wall,
    );

    // six ten-second buckets of one minute, with latencies 1..20, 21..40, ..., 101..120 ms
    for (let step = 0; step < 6; step++) {
      wall = MINUTE + 10 * step;
      for (let ms = 20 * step + 1; ms <= 20 * step + 20; ms++) {
        moment = 0;
        const sample = metrics.begin("m");
        moment = ms / 1000;
        metrics.finish(sample, "success");
      }
    }
    wall = MINUTE + 7300;
    metrics.refused("unknown_model");
    const minute = metrics.between(MINUTE, MINUTE + 60, 1) as Metrics;

    expect(minute.bucket_s).toBe(60);
    expect(minute.total.series.requests).toEqual([120]);
    // the nearest rank over 64 evenly spaced of the 120; all of them would give 108
    expect(minute.total.series.p90).toEqual([107]);
    expect(tiersOf(metrics)[1].get(MINUTE)!.totalMs).toHaveLength(64);

    wall = MINUTE + 172800 + 3600;
    metrics.refused("unknown_model");
    const hour = metrics.between(1789999200, 1790002800, 1) as Metrics;

    expect(tiersOf(metrics)[1].has(MINUTE)).toBe(false);
    expect(tiersOf(metrics)[2].get(1789999200)!.requests).toBe(120);
    expect([
      hour.bucket_s,
      hour.total.series.requests,
      hour.total.series.p90,
    ]).toEqual([3600, [120], [107]]);
  });

  test("metrics pick the column span from the range and the columns asked", () => {
    const metrics = new ServerMetrics(["m"], undefined, fixedClock);
    // a history that began long ago, so that every range lies inside it
    metrics.since = 1780000000;

    const cases: [number, number | undefined, number, number][] = [
      [900, 90, 10, 90],
      [900, 30, 30, 30],
      [3600, 90, 60, 60],
      [21600, 90, 300, 72],
      [86400, 90, 1200, 72],
      [86400, undefined, 300, 288],
      [604800, 90, 7200, 84],
      [2592000, 90, 43200, 60],
      // no span of at most 12 hours gives 30 columns of 30 days
      [2592000, 30, 43200, 60],
    ];
    for (const [seconds, asked, bucketS, columns] of cases) {
      const windowed = metrics.window(seconds, asked) as Metrics;

      expect([
        seconds,
        asked,
        windowed.bucket_s,
        windowed.total.series.requests.length,
      ]).toEqual([seconds, asked, bucketS, columns]);
      // the current column is the last one
      expect(windowed.end).toBe(
        (Math.floor(1790000000 / bucketS) + 1) * bucketS,
      );
      expect(windowed.start).toBe(windowed.end - columns * bucketS);
    }

    const tenDaysAgo = 1790000000 - 864000;
    const old = metrics.between(tenDaysAgo, tenDaysAgo + 3600, 90) as Metrics;
    // ten days back only hours are stored, so an hour's range has hour columns
    expect(old.bucket_s).toBe(3600);
    expect([old.start % 3600, old.end % 3600]).toEqual([0, 0]);
    expect(old.start).toBeLessThanOrEqual(tenDaysAgo);
    expect(old.end).toBeGreaterThanOrEqual(tenDaysAgo + 3600);
    expect(old.total.series.requests).toHaveLength(
      (old.end - old.start) / 3600,
    );
  });

  test("metrics between is the range aligned outward", () => {
    let wall = 1790000005;
    const metrics = new ServerMetrics(
      ["m"],
      () => wall,
      () => wall,
    );

    metrics.finish(metrics.begin("m"), "success");
    wall = 1790000200;
    const windowed = metrics.between(1790000005, 1790000125, 360) as Metrics;
    const future = metrics.between(1790000300, 1790000400) as Metrics;

    expect([
      windowed.seconds,
      windowed.bucket_s,
      windowed.start,
      windowed.end,
    ]).toEqual([120, 10, 1790000000, 1790000130]);
    expect(windowed.total.series.requests).toEqual([1, ...Array(12).fill(0)]);
    // the 130 seconds before it began before the history
    expect(windowed.previous).toBeNull();
    expect(future.total.series.requests).toEqual(Array(10).fill(0));
    expect(future.previous.requests).toBe(0);
  });

  test("metrics window percentiles are over the first sixty-four samples of a bucket", () => {
    let time = 0;
    const metrics = new ServerMetrics(["m"], () => time, fixedClock);
    for (let ms = 1; ms <= 100; ms++) {
      time = 0;
      const sample = metrics.begin("m");
      time = ms / 1000;
      metrics.finish(sample, "success");
    }

    const { series } = (metrics.window(10) as Metrics).total;

    expect(series.requests).toEqual([100]);
    // the nearest rank of 1..64, while the since-start p90 is over all of them
    expect(series.p90).toEqual([58]);
    expect((metrics.snapshot() as Metrics).latency_ms.total.p90).toBe(90);
  });

  test("metrics refuse a bad query", async () => {
    const app = serverApp();
    const unknown = await request(app)
      .post("/v1/stream")
      .send({ model: "nope", messages: [] });
    expect(unknown.status).toBe(404);

    for (const [query, message] of [
      ["window=abc", WINDOW_ERROR],
      ["window=5", WINDOW_ERROR],
      ["window=5184001", WINDOW_ERROR],
      ["window=300&from=1&to=2", QUERY_ERROR],
      ["from=1", RANGE_ERROR],
      ["to=2", RANGE_ERROR],
      ["from=2&to=1", RANGE_ERROR],
      ["from=a&to=2", RANGE_ERROR],
      ["from=1&to=5184002", RANGE_ERROR],
      ["columns=0", COLUMNS_ERROR],
      ["columns=1441", COLUMNS_ERROR],
      ["columns=x", COLUMNS_ERROR],
    ]) {
      const response = await request(app).get(`/v1/metrics?${query}`);

      expect([query, response.status, response.body]).toEqual([
        query,
        400,
        { error: { type: "InvalidRequestError", message } },
      ]);
    }
    const response = await request(app).get(
      "/v1/metrics?window=300&columns=90",
    );
    const to = Math.floor(Date.now() / 1000);
    const ranged = await request(app).get(
      `/v1/metrics?from=${to - 3600}&to=${to}`,
    );
    const columnsOnly = await request(app).get("/v1/metrics?columns=90");

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual([...SNAPSHOT_KEYS, "window"]);
    expect([
      response.body.window.seconds,
      response.body.window.bucket_s,
    ]).toEqual([300, 10]);
    expect(response.body.window.total.series.requests).toHaveLength(30);
    expect(ranged.status).toBe(200);
    expect(ranged.body.window.seconds).toBe(3600);
    // columns alone names no range
    expect(columnsOnly.status).toBe(200);
    expect(columnsOnly.body).not.toHaveProperty("window");
    // a bad query is not a refusal; the unknown model is, in the bucket it happened in
    expect(response.body.refused).toEqual({
      unauthorized: 0,
      invalid_request: 0,
      unknown_model: 1,
    });
    expect(response.body.window.total.refused).toBe(1);
    expect(sum(response.body.window.total.series.refused)).toBe(1);
  });

  test("metrics keep the latest hundred errors", () => {
    const metrics = new ServerMetrics(["m"]);
    for (let i = 0; i < 125; i++) {
      metrics.finish(metrics.begin("m"), "failure", { error: `error ${i}` });
    }

    const { errors } = metrics.snapshot() as Metrics;

    expect(errors.map((error: { message: string }) => error.message)).toEqual(
      Array.from({ length: 100 }, (_, i) => `error ${124 - i}`),
    );
  });

  test("metrics persist their history and a new server continues it", () => {
    const file = path.join(tempDir(), "h.json");
    let wall = 1790000000;
    const open = () =>
      new ServerMetrics(
        ["m"],
        () => wall,
        () => wall,
        { path: file, saveEveryS: 0 },
      );
    const metrics = open();

    for (const outcome of ["success", "success", "failure"] as const) {
      const sample = metrics.begin("m");
      metrics.firstEvent(sample);
      metrics.finish(sample, outcome, {
        error: outcome === "failure" ? "upstream down" : null,
      });
    }
    metrics.save();
    const text = fs.readFileSync(file, "utf-8");
    const history = JSON.parse(text);

    // one line, compact, as the Python server writes it, an integral moment as an integer
    expect(text).toBe(JSON.stringify(history) + "\n");
    expect(text).toContain(
      '"errors":[{"at":1790000000,"model":"m","message":"upstream down"}]',
    );
    expect(Object.keys(history)).toEqual([
      "version",
      "since",
      "saved_at",
      "errors",
      "total",
      "models",
    ]);
    expect([history.version, history.since, history.saved_at]).toEqual([
      1, 1790000000, 1790000000,
    ]);
    expect(Object.keys(history.total)).toEqual(["10", "60", "3600"]);
    // requests, successes, failures, disconnects, refused, tokens_out, thoughts, response,
    // generation_ms, then the samples
    expect(history.total["10"]).toEqual([
      [1790000000, [3, 2, 1, 0, 0, 0, 0, 0, 2, [0, 0], [0, 0]]],
    ]);
    expect([history.total["60"], history.total["3600"]]).toEqual([[], []]);
    expect(Object.keys(history.models)).toEqual(["m"]);
    expect(history.models.m).toEqual(history.total);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);

    // nothing changed since the last write, so nothing is written
    fs.rmSync(file);
    metrics.save();
    expect(fs.existsSync(file)).toBe(false);

    fs.writeFileSync(file, text);
    wall += 600;
    const again = open();
    const snapshot = again.snapshot() as Metrics;

    expect([again.since, again.startedAt]).toEqual([1790000000, 1790000600]);
    // the since-start counters are this run's, the history and its errors continue
    expect([snapshot.started_at, snapshot.since, snapshot.requests]).toEqual([
      1790000600, 1790000000, 0,
    ]);
    expect(snapshot.errors).toEqual([
      { at: 1790000000, model: "m", message: "upstream down" },
    ]);
    expect((again.window(3600) as Metrics).total.requests).toBe(3);

    again.finish(again.begin("m"), "success");
    again.close();
    again.close();
    expect(readHistory(file).total["10"].map(([start]) => start)).toEqual([
      1790000000, 1790000600,
    ]);
  });

  test("metrics history that cannot be read starts fresh and says so", () => {
    const dir = tempDir();
    const file = path.join(dir, "h.json");
    fs.writeFileSync(file, "not json");
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    try {
      const metrics = new ServerMetrics(["m"], undefined, fixedClock, {
        path: file,
        saveEveryS: 0,
      });

      expect(log).toHaveBeenCalledTimes(1);
      const [line] = log.mock.calls[0] as [string];
      const prefix = `Metrics history at ${file} could not be read (not valid JSON: `;
      expect(line.slice(0, prefix.length)).toBe(prefix);
      expect(line.endsWith("); starting fresh.")).toBe(true);
      expect(metrics.since).toBe(metrics.startedAt);
      expect(ServerMetrics.fromHistory(file)).toBeNull();

      const bucket = [1, 1, 0, 0, 0, 0, 0, 0, 1, [5], [3]];
      const tiers = { "10": [], "60": [], "3600": [] };
      for (const shape of [
        { version: 2 },
        [],
        { version: true, since: 0, errors: [], total: tiers, models: {} },
        {
          version: 1,
          since: 0,
          errors: [],
          total: { "10": [], "60": [] },
          models: {},
        },
        { version: 1, since: 0, errors: [{ at: 1 }], total: tiers, models: {} },
        {
          version: 1,
          since: 0,
          errors: [],
          total: { ...tiers, "10": [[0, bucket.slice(0, 10)]] },
          models: {},
        },
        {
          version: 1,
          since: 0,
          errors: [],
          total: { ...tiers, "10": [[0, [-1, ...bucket.slice(1)]]] },
          models: {},
        },
      ]) {
        fs.writeFileSync(file, JSON.stringify(shape));
        let message: string | null = null;
        try {
          readHistory(file);
        } catch (error) {
          message = (error as Error).message;
        }

        expect([shape, message]).toEqual([
          shape,
          "not a version 1 metrics history",
        ]);
      }
      log.mockClear();
      const fresh = new ServerMetrics(["m"], undefined, fixedClock, {
        path: file,
        saveEveryS: 0,
      });
      expect(log.mock.calls).toEqual([
        [
          `Metrics history at ${file} could not be read (not a version 1 metrics history); starting fresh.`,
        ],
      ]);

      // the next write replaces the file
      fresh.finish(fresh.begin("m"), "success");
      fresh.save();
      expect(
        readHistory(file).total["10"].map(([, stored]) => stored[0]),
      ).toEqual([1]);
      expect(
        ServerMetrics.fromHistory(path.join(dir, "missing.json")),
      ).toBeNull();
      const history = ServerMetrics.fromHistory(file, fixedClock)!;
      expect(history).not.toBeNull();
      expect([history.path, history.since]).toEqual([null, 1790000000]);
      expect((history.window(3600) as Metrics).total.requests).toBe(1);
      expect((history.snapshot() as Metrics).models).toEqual([]);
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  test("metrics thin the samples of a history on reading", () => {
    const file = path.join(tempDir(), "h.json");
    const samples = Array.from({ length: 120 }, (_, i) => i + 1);
    fs.writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        since: 1790000000,
        saved_at: 1790000000,
        errors: [],
        total: {
          "10": [
            [
              1790000000,
              [120, 120, 0, 0, 0, 0, 0, 0, 120, samples, samples.slice(0, 5)],
            ],
          ],
          "60": [],
          "3600": [],
        },
        models: {},
      }),
    );

    const metrics = new ServerMetrics(["m"], undefined, fixedClock, {
      path: file,
      saveEveryS: 0,
    });

    const bucket = tiersOf(metrics)[0].get(1790000000)!;
    expect([bucket.totalMs.length, bucket.firstEventMs]).toEqual([
      64,
      [1, 2, 3, 4, 5],
    ]);
    expect((metrics.window(10) as Metrics).total.series.p90).toEqual([107]);
  });

  test("metrics keep a removed model's history in the file", () => {
    const file = path.join(tempDir(), "h.json");
    const options = { path: file, saveEveryS: 0 };
    const first = new ServerMetrics(["m", "n"], undefined, fixedClock, options);
    for (const modelId of ["m", "n", "n"]) {
      first.finish(first.begin(modelId), "success");
    }
    first.close();

    const without = new ServerMetrics(["m"], undefined, fixedClock, options);
    const windowed = without.window(3600) as Metrics;

    expect(windowed.models.map((model: { id: string }) => model.id)).toEqual([
      "m",
    ]);
    expect(windowed.total.requests).toBe(3);
    without.finish(without.begin("m"), "success");
    without.close();
    // the table's series first, then the ones it no longer serves
    expect(Object.keys(readHistory(file).models)).toEqual(["m", "n"]);

    const back = new ServerMetrics(["n", "m"], undefined, fixedClock, options);
    expect(
      (back.window(3600) as Metrics).models.map(
        (model: { id: string; requests: number }) => [model.id, model.requests],
      ),
    ).toEqual([
      ["n", 2],
      ["m", 2],
    ]);
  });

  test("metrics drop what is older than sixty days", () => {
    let wall = 1790000000;
    const metrics = new ServerMetrics(
      ["m"],
      () => wall,
      () => wall,
    );

    metrics.finish(metrics.begin("m"), "success");
    wall += RETENTION_S + 3600;
    metrics.refused("unknown_model");

    expect(tiersOf(metrics).map((tier) => [...tier.keys()])).toEqual([
      [Math.floor(wall / 10) * 10],
      [],
      [],
    ]);
    expect(tiersOf(metrics, "m").map((tier) => [...tier.keys()])).toEqual([
      [],
      [],
      [],
    ]);
    const windowed = metrics.window(RETENTION_S) as Metrics;
    expect([windowed.total.requests, windowed.total.refused]).toEqual([0, 1]);
    expect((metrics.snapshot() as Metrics).requests).toBe(1);
  });
});

describe("MMSP server config", () => {
  test("loadServerConfig resolves environment references", async () => {
    process.env.PROBE_BASE_URL = "https://probe.example/v1";
    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    process.env.PROBE_SERVER_KEY = "srv-probe";
    const file = configFile({
      models: [
        row("claude-sonnet-5-5", "claude", {
          base_url: "$PROBE_BASE_URL",
          api_key: "$PROBE_UPSTREAM_KEY",
        }),
        row("gpt-5.5"),
        // the ids are names, read as written
        row("$literal"),
      ],
      api_keys: ["${PROBE_SERVER_KEY}", "second-key"],
    });

    const config = loadServerConfig(file);

    expect(config).toEqual({
      models: [
        row("claude-sonnet-5-5", "claude", {
          base_url: "https://probe.example/v1",
          api_key: "sk-probe",
        }),
        row("gpt-5.5"),
        row("$literal"),
      ],
      api_keys: ["srv-probe", "second-key"],
    });
    useUpstream((model) => new ScriptedClient([], model));
    const app = createServerApp({
      models: config.models,
      apiKeys: config.api_keys,
    });
    const response = await request(app)
      .get("/v1/models")
      .set("Authorization", "Bearer srv-probe");
    const ids = response.body.data.map((model: { id: string }) => model.id);
    expect(ids).toEqual(["claude", "gpt-5.5", "$literal"]);
    expect(constructions()[0]).toEqual([
      "claude-sonnet-5-5",
      "openai-responses",
      "sk-probe",
      "https://probe.example/v1",
    ]);
  });

  test("loadServerConfig refuses an unset reference", () => {
    const cases: [unknown, string][] = [
      [
        {
          models: [
            row("gpt-5.5", "gpt-5.5", { api_key: "$PROBE_UPSTREAM_KEY" }),
          ],
        },
        "models[0].api_key references $PROBE_UPSTREAM_KEY",
      ],
      [
        {
          models: [
            row("gpt-5.5", "gpt-5.5", { base_url: "${PROBE_BASE_URL}" }),
          ],
        },
        "models[0].base_url references ${PROBE_BASE_URL}",
      ],
      [
        { models: [row("gpt-5.5")], api_keys: ["$PROBE_SERVER_KEY"] },
        "api_keys[0] references $PROBE_SERVER_KEY",
      ],
    ];
    for (const [content, reference] of cases) {
      const file = configFile(content);

      expect(() => loadServerConfig(file)).toThrow(
        `${file}: ${reference}, which is not set in the environment.`,
      );
    }

    process.env.PROBE_UPSTREAM_KEY = "";
    const file = configFile(cases[0][0]);
    expect(() => loadServerConfig(file)).toThrow(
      `${file}: models[0].api_key references $PROBE_UPSTREAM_KEY, which is not set in the environment.`,
    );
  });

  test("loadServerConfig refuses a file that is not a config", () => {
    const notJson = configFile("not json");
    const notAnObject = configFile([]);
    const keysNotAList = configFile({ models: [], api_keys: "k" });

    expect(() => loadServerConfig(notJson)).toThrow(
      `${notJson}: not valid JSON: `,
    );
    expect(() => loadServerConfig(notAnObject)).toThrow(
      `${notAnObject}: the config must be a JSON object with a models list.`,
    );
    expect(() => loadServerConfig(keysNotAList)).toThrow(
      `${keysNotAList}: api_keys must be a list.`,
    );
    // emptiness is createServerApp's to judge
    expect(loadServerConfig(configFile({ models: [] }))).toEqual({
      models: [],
      api_keys: [],
    });
  });

  test("resolveServerConfig without a source has no prefix and leaves its input alone", () => {
    const config = {
      models: [row("gpt-5.5", "gpt-5.5", { api_key: "$PROBE_UPSTREAM_KEY" })],
      comment: "not part of the config",
    };
    const copy = JSON.parse(JSON.stringify(config));

    expect(() => resolveServerConfig(config)).toThrow(
      new Error(
        "models[0].api_key references $PROBE_UPSTREAM_KEY, which is not set in the environment.",
      ),
    );

    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    expect(resolveServerConfig(config)).toEqual({
      models: [row("gpt-5.5", "gpt-5.5", { api_key: "sk-probe" })],
      api_keys: [],
    });
    expect(config).toEqual(copy);
  });

  test("readServerConfig returns the file as written", () => {
    process.env.PROBE_UPSTREAM_KEY = "sk-probe";
    const content = {
      models: [
        {
          model_id: "gpt-5.5",
          api_key: "$PROBE_UPSTREAM_KEY",
          server_model_id: "gpt",
          note: "kept",
        },
      ],
      api_keys: ["${PROBE_SERVER_KEY}"],
      host: "0.0.0.0",
      port: 8080,
      comment: "kept too",
    };

    expect(readServerConfig(configFile(content))).toEqual(content);
    expect(readServerConfig(configFile({ models: [] }))).toEqual({
      models: [],
    });

    const missing = path.join(path.dirname(configFile({})), "missing.json");
    let error: unknown;
    try {
      readServerConfig(missing);
    } catch (caught) {
      error = caught;
    }
    expect((error as { code?: string }).code).toBe("ENOENT");

    const notJson = configFile("not json");
    const notAnObject = configFile([]);
    const keysNotAList = configFile({ models: [], api_keys: "k" });
    expect(() => readServerConfig(notJson)).toThrow(
      `${notJson}: not valid JSON: `,
    );
    expect(() => readServerConfig(notAnObject)).toThrow(
      `${notAnObject}: the config must be a JSON object with a models list.`,
    );
    expect(() => readServerConfig(keysNotAList)).toThrow(
      `${keysNotAList}: api_keys must be a list.`,
    );
  });

  test("announceServer prints the three lines", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});

    try {
      announceServer("127.0.0.1", 25752, ["claude", "gpt-5.5"], true);
      expect(log.mock.calls).toEqual([
        ["Starting MMSP server at http://127.0.0.1:25752/v1"],
        ["Serving models: claude, gpt-5.5"],
        ["Open server: api_keys is empty, every request is accepted"],
      ]);

      log.mockClear();
      announceServer("::1", 8080, ["claude"], false);
      expect(log.mock.calls).toEqual([
        ["Starting MMSP server at http://[::1]:8080/v1"],
        ["Serving models: claude"],
      ]);
    } finally {
      log.mockRestore();
    }
  });

  test("startServer prints the base URL, the models and whether it is open", async () => {
    useUpstream((model) => new ScriptedClient([], model));
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const models = [row("claude-sonnet-5-5", "claude"), row("gpt-5.5")];

    try {
      const open = startServer({ models, host: "127.0.0.1", port: 0 });
      servers.push(open);
      await new Promise((resolve) => open.on("listening", resolve));
      const openPort = (open.address() as AddressInfo).port;
      expect(log.mock.calls).toEqual([
        [`Starting MMSP server at http://127.0.0.1:${openPort}/v1`],
        ["Serving models: claude, gpt-5.5"],
        ["Open server: api_keys is empty, every request is accepted"],
      ]);

      log.mockClear();
      const file = path.join(tempDir(), "m.json");
      const keyed = startServer({
        models,
        apiKeys: ["k"],
        host: "127.0.0.1",
        port: 0,
        metricsPath: file,
      });
      servers.push(keyed);
      await new Promise((resolve) => keyed.on("listening", resolve));
      const keyedPort = (keyed.address() as AddressInfo).port;
      // a history file changes nothing printed
      expect(log.mock.calls).toEqual([
        [`Starting MMSP server at http://127.0.0.1:${keyedPort}/v1`],
        ["Serving models: claude, gpt-5.5"],
      ]);

      // closing the server writes its history, here a request without the key
      const refused = await fetch(`http://127.0.0.1:${keyedPort}/v1/models`);
      await refused.arrayBuffer();
      expect(refused.status).toBe(401);
      expect(fs.existsSync(file)).toBe(false);
      keyed.closeAllConnections();
      await new Promise<void>((resolve) => keyed.close(() => resolve()));
      expect(readHistory(file).total["10"]).toHaveLength(1);
    } finally {
      log.mockRestore();
    }
  });
});

test("the server base URL brackets an IPv6 host", () => {
  expect(wire.serverBaseUrl("127.0.0.1", 25752)).toBe(
    "http://127.0.0.1:25752/v1",
  );
  expect(wire.serverBaseUrl("::1", 25752)).toBe("http://[::1]:25752/v1");
});
