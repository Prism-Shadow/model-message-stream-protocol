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

// Every streaming client stops at once: an abort, return() or break closes the provider's
// connection. Each client streams from a local upstream that sends three text deltas in the
// client's protocol and then stays silent until the client closes the connection, whose instant
// it records.

import * as fs from "fs";
import http from "http";
import { AddressInfo } from "net";
import * as os from "os";
import * as path from "path";
import { performance } from "perf_hooks";
import { afterEach, beforeEach, describe, expect, test } from "@jest/globals";
import { AutoLLMClient } from "../src/autoClient";
import { CLIENT_CREDENTIALS } from "../src/credentials";
import { UniEvent, UniMessage } from "../src/types";

// How long after the caller stops a stream the provider's connection may stay open.
const CLOSE_BOUND_MS = 200;

// A model of each client type; a client type missing here fails its cases rather than going
// untested.
const MODELS: Record<string, string> = {
  "openai-official": "gpt-5.5",
  "anthropic-official": "claude-sonnet-5-5",
  "google-official": "gemini-4-argon",
  "zai-official": "glm-5.3",
  "moonshot-official": "kimi-k3",
  "deepseek-official": "deepseek-flash",
  "minimax-official": "MiniMax-M3.1-Flash",
  "openai-responses": "gpt-5.6",
  "openai-chat": "gpt-5.6",
  "openai-chat-vllm-adapter": "Qwen/Qwen3.8-27B",
  "ant-messages": "claude-sonnet-5",
  "google-genai": "gemini-3.8-flash",
  mmsp: "gpt-5.5",
};

// openai-embedding answers with one response, not a stream
const STREAMING_CLIENT_TYPES = Object.keys(CLIENT_CREDENTIALS).filter(
  (clientType) => clientType !== "openai-embedding",
);

// the SDKs that end their stream quietly when their request is aborted
const QUIET_ON_ABORT_CLIENT_TYPES = ["openai-chat", "ant-messages"];

const CASES = STREAMING_CLIENT_TYPES.flatMap((clientType) =>
  [false, true].map((stateful) => ({
    clientType,
    stateful,
    mode: stateful ? "stateful" : "stateless",
  })),
);

const TEXTS = ["one ", "two ", "three "];

const HISTORY: UniMessage[] = [
  { role: "user", content_items: [{ type: "text.done", text: "Hello" }] },
  { role: "assistant", content_items: [{ type: "text.done", text: "Hi" }] },
];

// a stream that reached its stop would be saved under MMSP_CACHE_DIR
const CONFIG = { trace_id: "interrupted" };

function sse(data: unknown, event?: string): string {
  return `${event ? `event: ${event}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
}

/**
 * The opening of a stream in the protocol the request path names: three text deltas.
 *
 * Under /complete/ a Chat Completions or Messages stream also carries its finish reason and
 * usage, all a response sends but the closing of its connection.
 */
function script(target: string): string[] {
  const urlPath = target.split("?")[0];
  const complete = urlPath.startsWith("/complete/");
  if (urlPath.endsWith(":streamGenerateContent")) {
    return TEXTS.map((text) =>
      sse({
        candidates: [
          { content: { role: "model", parts: [{ text }] }, index: 0 },
        ],
      }),
    );
  }
  if (urlPath.endsWith("/chat/completions")) {
    const chunk = {
      id: "chatcmpl-0",
      object: "chat.completion.chunk",
      created: 0,
      model: "m",
    };
    const choices: {
      index: number;
      delta: { content?: string };
      finish_reason: string | null;
    }[] = TEXTS.map((text) => ({
      index: 0,
      delta: { content: text },
      finish_reason: null,
    }));
    if (complete) {
      choices.push({ index: 0, delta: {}, finish_reason: "stop" });
    }
    const events = choices.map((choice) =>
      sse({ ...chunk, choices: [choice] }),
    );
    if (complete) {
      events.push(
        sse({
          ...chunk,
          choices: [],
          usage: { prompt_tokens: 3, completion_tokens: 3, total_tokens: 6 },
        }),
      );
    }
    return events;
  }
  if (urlPath.endsWith("/responses")) {
    return TEXTS.map((text, index) =>
      sse(
        {
          type: "response.output_text.delta",
          item_id: "msg_0",
          output_index: 0,
          content_index: 0,
          delta: text,
          logprobs: [],
          sequence_number: index,
        },
        "response.output_text.delta",
      ),
    );
  }
  if (urlPath.endsWith("/messages")) {
    const message = {
      id: "msg_0",
      type: "message",
      role: "assistant",
      model: "m",
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 3, output_tokens: 1 },
    };
    const events = [
      sse({ type: "message_start", message }, "message_start"),
      sse(
        {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        },
        "content_block_start",
      ),
      ...TEXTS.map((text) =>
        sse(
          {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text },
          },
          "content_block_delta",
        ),
      ),
    ];
    if (complete) {
      events.push(
        sse({ type: "content_block_stop", index: 0 }, "content_block_stop"),
        sse(
          {
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: 3 },
          },
          "message_delta",
        ),
      );
    }
    return events;
  }
  if (urlPath.endsWith("/interactions")) {
    return TEXTS.map((text) =>
      sse(
        {
          event_type: "step.delta",
          index: 0,
          delta: { type: "text", text },
        },
        "step.delta",
      ),
    );
  }
  if (urlPath.endsWith("/stream")) {
    return TEXTS.map((text) =>
      sse({
        role: "assistant",
        event_type: "delta",
        content_items: [{ type: "text.delta", text }],
        usage_metadata: null,
        finish_reason: null,
        created_at: 0,
      }),
    );
  }
  throw new Error(`the upstream has no script for ${target}`);
}

interface Connection {
  target: string;
  closedAt: number | null;
  closed: Promise<void>;
}

/**
 * Answers every request with its script, then stays silent until the client closes the
 * connection.
 */
class Upstream {
  readonly connections: Connection[] = [];
  private readonly server = http.createServer((req, res) => {
    let closed!: () => void;
    const connection: Connection = {
      target: req.url ?? "",
      closedAt: null,
      closed: new Promise<void>((resolve) => {
        closed = resolve;
      }),
    };
    this.connections.push(connection);
    res.on("close", () => {
      connection.closedAt = performance.now();
      closed();
    });
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      for (const event of script(connection.target)) {
        res.write(event);
      }
    });
  });
  url = "";

  async start(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server.listen(0, "127.0.0.1", resolve);
    });
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  async stop(): Promise<void> {
    // a connection a failing case left open ends here, so that the server can close
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  /**
   * Milliseconds from `since` until the client closed the connection, waiting no longer than
   * the bound.
   */
  async closedAfter(since: number): Promise<number> {
    expect(this.connections).toHaveLength(1);
    const [connection] = this.connections;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      connection.closed,
      new Promise<void>((resolve) => {
        timer = setTimeout(
          resolve,
          Math.max(0, since + CLOSE_BOUND_MS - performance.now()),
        );
      }),
    ]);
    clearTimeout(timer);
    return (connection.closedAt ?? Infinity) - since;
  }
}

let upstream: Upstream;
let cacheDir: string;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  savedEnv = { ...process.env };
  cacheDir = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "mmsp-")),
    "traces",
  );
  process.env.MMSP_CACHE_DIR = cacheDir;
  delete process.env.MMSP_DEBUG;
  upstream = new Upstream();
  await upstream.start();
});

afterEach(async () => {
  await upstream.stop();
  fs.rmSync(path.dirname(cacheDir), { recursive: true, force: true });
  process.env = savedEnv;
});

function newClient(clientType: string, baseUrl: string): AutoLLMClient {
  const client = new AutoLLMClient({
    model: MODELS[clientType],
    apiKey: "test",
    baseUrl: `${baseUrl}/v1`,
    clientType,
  });
  client.setHistory(HISTORY);
  return client;
}

function open(
  client: AutoLLMClient,
  stateful: boolean,
  signal?: AbortSignal,
): AsyncGenerator<UniEvent> {
  const message: UniMessage = {
    role: "user",
    content_items: [{ type: "text.done", text: "Count to a thousand." }],
  };
  return stateful
    ? client.streamingResponseStateful({ message, config: CONFIG, signal })
    : client.streamingResponse({ messages: [message], config: CONFIG, signal });
}

function text(events: UniEvent[]): string {
  return events
    .flatMap((event) => event.content_items)
    .map((item) => (item.type === "text.delta" ? item.text : ""))
    .join("");
}

async function readToFirstText(
  stream: AsyncGenerator<UniEvent>,
  events: UniEvent[],
): Promise<void> {
  while (!text(events)) {
    const next = await stream.next();
    if (next.done) {
      throw new Error("the stream ended before its first text");
    }
    events.push(next.value);
  }
}

/**
 * Reads the stream to its end, and returns what it threw.
 */
async function readOn(
  stream: AsyncGenerator<UniEvent>,
  events: UniEvent[],
): Promise<unknown> {
  try {
    for await (const event of stream) {
      events.push(event);
    }
  } catch (error) {
    return error;
  }
  return undefined;
}

async function until(condition: () => boolean): Promise<void> {
  const deadline = performance.now() + 5000;
  while (!condition()) {
    if (performance.now() > deadline) {
      throw new Error("timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The caller got the deltas that arrived, and neither a done item nor a stop.
 */
function expectStoppedWithoutClosing(events: UniEvent[]): void {
  expect(text(events)).toContain(TEXTS[0]);
  expect(events.filter((event) => event.event_type === "stop")).toEqual([]);
  expect(
    events
      .flatMap((event) => event.content_items)
      .filter((item) => item.type.endsWith(".done")),
  ).toEqual([]);
}

function expectNothingRecorded(client: AutoLLMClient): void {
  expect(client.getHistory()).toEqual(HISTORY);
  expect(fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : []).toEqual([]);
}

describe.each(CASES)("$clientType, $mode", ({ clientType, stateful }) => {
  test("an abort while the caller waits closes the connection", async () => {
    const client = newClient(clientType, upstream.url);
    const controller = new AbortController();
    const stream = open(client, stateful, controller.signal);
    const events: UniEvent[] = [];
    await readToFirstText(stream, events);
    const reader = readOn(stream, events);
    await until(() => text(events) === TEXTS.join(""));
    // the reader now waits through the upstream's silence
    await sleep(50);

    const abortedAt = performance.now();
    controller.abort();
    const error = await reader;

    expect(await upstream.closedAfter(abortedAt)).toBeLessThan(CLOSE_BOUND_MS);
    expect(error).toBe(controller.signal.reason);
    expect((error as Error).name).toBe("AbortError");
    expectStoppedWithoutClosing(events);
    expectNothingRecorded(client);
  });

  test("an abort while the caller is busy closes the connection by its next read", async () => {
    const client = newClient(clientType, upstream.url);
    const controller = new AbortController();
    const stream = open(client, stateful, controller.signal);
    const events: UniEvent[] = [];
    await readToFirstText(stream, events);

    controller.abort();
    await sleep(50);
    const error = await readOn(stream, events);
    const returnedAt = performance.now();

    expect(await upstream.closedAfter(returnedAt)).toBeLessThan(CLOSE_BOUND_MS);
    expect(error).toBe(controller.signal.reason);
    expectStoppedWithoutClosing(events);
    expectNothingRecorded(client);
  });

  test("return() closes the connection", async () => {
    const client = newClient(clientType, upstream.url);
    const stream = open(client, stateful);
    const events: UniEvent[] = [];
    await readToFirstText(stream, events);

    await stream.return(undefined);
    const returnedAt = performance.now();

    expect(await upstream.closedAfter(returnedAt)).toBeLessThan(CLOSE_BOUND_MS);
    expectStoppedWithoutClosing(events);
    expectNothingRecorded(client);
  });

  test("leaving the loop closes the connection", async () => {
    const client = newClient(clientType, upstream.url);
    const events: UniEvent[] = [];

    for await (const event of open(client, stateful)) {
      events.push(event);
      if (text(events)) {
        break;
      }
    }
    const leftAt = performance.now();

    expect(await upstream.closedAfter(leftAt)).toBeLessThan(CLOSE_BOUND_MS);
    expectStoppedWithoutClosing(events);
    expectNothingRecorded(client);
  });
});

describe.each(QUIET_ON_ABORT_CLIENT_TYPES)("%s", (clientType) => {
  test("an abort after the last event records nothing", async () => {
    const client = newClient(clientType, `${upstream.url}/complete`);
    const controller = new AbortController();
    const events: UniEvent[] = [];
    const reader = readOn(open(client, true, controller.signal), events);
    await until(() => text(events) === TEXTS.join(""));
    // the finish reason and the usage are in; only the closing of the connection is missing
    await sleep(50);

    controller.abort();
    const error = await reader;

    expect(error).toBe(controller.signal.reason);
    expectStoppedWithoutClosing(events);
    expectNothingRecorded(client);
  });
});
