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
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import {
  AutoLLMClient,
  PromptCaching,
  ThinkingLevel,
  UniConfig,
  UniEvent,
  UniMessage,
  UnsupportedParameterError,
} from "../src";
import { promptCacheKey } from "../src/utils";

interface BodyCase {
  name: string;
  clientType: "ant-messages" | "anthropic-official";
  model: string;
  // null is the local server itself; a bedrock:// URL reaches it through ANTHROPIC_BEDROCK_BASE_URL
  baseUrl: string | null;
  apiKey: string;
  config: UniConfig;
  // an undefined value means the body carries no such field
  expected: Record<string, unknown>;
  // fields the client leaves to the SDK, whose default for them differs between SDK versions
  unpinned?: string[];
}

// The SDK lines disagree on what reaches the request body: @anthropic-ai/sdk 1.0 dropped
// temperature from the beta Messages types, and @anthropic-ai/bedrock-sdk 1.0 copies the
// 2026-10-21 API version into Bedrock's body. The cases are those of
// src_py/tests/test_request_body.py.
const BODY_CASES: BodyCase[] = [
  {
    name: "ant-messages-temperature",
    clientType: "ant-messages",
    model: "claude-sonnet-5",
    baseUrl: null,
    apiKey: "test-key",
    config: { temperature: 0.5 },
    expected: { temperature: 0.5 },
  },
  {
    name: "ant-messages-default",
    clientType: "ant-messages",
    model: "claude-sonnet-5",
    baseUrl: null,
    apiKey: "test-key",
    config: {},
    expected: { temperature: undefined },
  },
  {
    name: "anthropic-official-api",
    clientType: "anthropic-official",
    model: "claude-sonnet-4-6",
    baseUrl: null,
    apiKey: "test-key",
    config: {},
    expected: { anthropic_version: undefined },
  },
  {
    name: "anthropic-official-bedrock-legacy-version",
    clientType: "anthropic-official",
    model: "global.anthropic.claude-sonnet-4-6",
    baseUrl: "bedrock://us-east-1",
    apiKey: "AKIAEXAMPLE,secret-EXAMPLE",
    config: {},
    expected: { anthropic_version: "bedrock-2023-05-31" },
  },
  {
    name: "anthropic-official-bedrock-sdk-version",
    clientType: "anthropic-official",
    model: "global.anthropic.claude-opus-5-5",
    baseUrl: "bedrock://us-east-1",
    apiKey: "AKIAEXAMPLE,secret-EXAMPLE",
    config: {},
    expected: {},
    unpinned: ["anthropic_version"],
  },
];

// ANTHROPIC_BEDROCK_BASE_URL points the Bedrock SDK at the local server; SigV4 signs whatever
// URL it is given, so the example AWS keys never leave the machine.
const BODY_ENV = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "AWS_BEARER_TOKEN_BEDROCK",
];

let server: http.Server;
let origin: string;
let receivedBody: Record<string, unknown> = {};
let savedEnv: Record<string, string | undefined> = {};

// Records the JSON body of a request and refuses it, so no stream has to be parsed.
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      receivedBody = raw ? JSON.parse(raw) : {};
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          type: "error",
          error: { type: "invalid_request_error", message: "recorded" },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(() => {
  savedEnv = Object.fromEntries(
    BODY_ENV.map((name) => [name, process.env[name]]),
  );
  for (const name of BODY_ENV) {
    delete process.env[name];
  }
  process.env.ANTHROPIC_BEDROCK_BASE_URL = origin;
  receivedBody = {};
});

afterEach(() => {
  for (const [name, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("request body on every SDK version", () => {
  test.each(BODY_CASES)("$name", async (testCase) => {
    const client = new AutoLLMClient({
      model: testCase.model,
      apiKey: testCase.apiKey,
      baseUrl: testCase.baseUrl ?? origin,
      clientType: testCase.clientType,
    });
    const messages: UniMessage[] = [
      { role: "user", content_items: [{ type: "text.done", text: "Hi" }] },
    ];

    const drain = async (): Promise<void> => {
      for await (const event of client.streamingResponse({
        messages,
        config: testCase.config,
      })) {
        void event;
      }
    };
    await expect(drain()).rejects.toThrow(Anthropic.BadRequestError);

    expect(receivedBody.messages).toHaveLength(1);
    const picked = Object.fromEntries(
      Object.keys(testCase.expected).map((name) => [name, receivedBody[name]]),
    );
    expect(picked).toStrictEqual(testCase.expected);
    const modelConfig = client.transformUniConfigToModelConfig(testCase.config);
    for (const name of testCase.unpinned ?? []) {
      expect(modelConfig).not.toHaveProperty(name);
    }
  });
});

const SESSION_ID = "8d2f0c4e-7a1b-4c3d-9e5f-0a1b2c3d4e5f";
// 65 characters go out as the SHA-256 hex digest of their UTF-8 bytes; 64 emoji, 128 UTF-16
// units long, are 64 characters and go out as they are
const LONG_SESSION_ID = "会".repeat(65);
const LONG_SESSION_KEY =
  "f3d8cc68018e7e0a0aa2c74cfddfc7515e10785943068732c6ed311eb6f074c5";
const EMOJI_SESSION_ID = "😀".repeat(64);

interface SessionCase {
  name: string;
  clientType: string;
  model: string;
  config: UniConfig;
  // the prompt_cache_key of the body; undefined means the body carries none
  expected: string | undefined;
}

// The cases are those of src_py/tests/test_request_body.py.
const SESSION_CASES: SessionCase[] = [
  {
    name: "openai-official",
    clientType: "openai-official",
    model: "gpt-6-luna",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "openai-official-long",
    clientType: "openai-official",
    model: "gpt-6-luna",
    config: { session_id: LONG_SESSION_ID },
    expected: LONG_SESSION_KEY,
  },
  {
    name: "openai-official-emoji",
    clientType: "openai-official",
    model: "gpt-6-luna",
    config: { session_id: EMOJI_SESSION_ID },
    expected: EMOJI_SESSION_ID,
  },
  {
    name: "openai-official-empty",
    clientType: "openai-official",
    model: "gpt-6-luna",
    config: { session_id: "" },
    expected: undefined,
  },
  {
    name: "openai-official-unset",
    clientType: "openai-official",
    model: "gpt-6-luna",
    config: {},
    expected: undefined,
  },
  {
    name: "openai-responses",
    clientType: "openai-responses",
    model: "openai/gpt-6-luna",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "openai-chat",
    clientType: "openai-chat",
    model: "gpt-6-luna",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "openai-chat-long",
    clientType: "openai-chat",
    model: "gpt-6-luna",
    config: { session_id: LONG_SESSION_ID },
    expected: LONG_SESSION_KEY,
  },
  {
    name: "openai-chat-vllm-adapter",
    clientType: "openai-chat-vllm-adapter",
    model: "Qwen/Qwen3.6-35B-A3B",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "moonshot-official-k3",
    clientType: "moonshot-official",
    model: "kimi-k3.1-pro",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "moonshot-official-k2",
    clientType: "moonshot-official",
    model: "kimi-k2.6",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "minimax-official",
    clientType: "minimax-official",
    model: "MiniMax-M3",
    config: { session_id: SESSION_ID },
    expected: SESSION_ID,
  },
  {
    name: "minimax-official-long",
    clientType: "minimax-official",
    model: "MiniMax-M3",
    config: { session_id: LONG_SESSION_ID },
    expected: LONG_SESSION_KEY,
  },
  {
    name: "deepseek-official",
    clientType: "deepseek-official",
    model: "deepseek-v4-flash",
    config: { session_id: SESSION_ID },
    expected: undefined,
  },
  {
    name: "zai-official",
    clientType: "zai-official",
    model: "glm-5.3",
    config: { session_id: SESSION_ID },
    expected: undefined,
  },
  {
    name: "openai-embedding",
    clientType: "openai-embedding",
    model: "text-embedding-3-large",
    config: { session_id: SESSION_ID },
    expected: undefined,
  },
];

describe("session_id reaches the wire as prompt_cache_key", () => {
  test.each(SESSION_CASES)("$name", async (testCase) => {
    const client = new AutoLLMClient({
      model: testCase.model,
      apiKey: "test-key",
      baseUrl: origin,
      clientType: testCase.clientType,
    });
    const messages: UniMessage[] = [
      { role: "user", content_items: [{ type: "text.done", text: "Hi" }] },
    ];

    const drain = async (): Promise<void> => {
      for await (const event of client.streamingResponse({
        messages,
        config: testCase.config,
      })) {
        void event;
      }
    };
    await expect(drain()).rejects.toThrow(OpenAI.BadRequestError);

    expect(receivedBody.model).toBe(testCase.model);
    expect(receivedBody.prompt_cache_key).toBe(testCase.expected);
    expect("prompt_cache_key" in receivedBody).toBe(
      testCase.expected !== undefined,
    );
    expect(receivedBody).not.toHaveProperty("session_id");
  });
});

describe("session_id changes nothing where no prompt cache key exists", () => {
  test.each([
    ["anthropic-official", "claude-sonnet-5"],
    ["ant-messages", "claude-sonnet-5"],
    ["google-official", "gemini-3.8-flash"],
    ["google-genai", "gemini-3.8-flash"],
    ["openai-embedding", "text-embedding-3-large"],
    ["deepseek-official", "deepseek-v4-flash"],
    ["zai-official", "glm-5.3"],
  ])("%s", (clientType, model) => {
    const client = new AutoLLMClient({ model, apiKey: "test-key", clientType });
    const config: UniConfig = { max_tokens: 100 };

    expect(
      client.transformUniConfigToModelConfig({
        ...config,
        session_id: SESSION_ID,
      }),
    ).toEqual(client.transformUniConfigToModelConfig(config));
  });
});

test("Kimi K2 sends no trace_id as prompt_cache_key", () => {
  const client = new AutoLLMClient({
    model: "kimi-k2.6",
    apiKey: "test-key",
    clientType: "moonshot-official",
  });

  expect(
    client.transformUniConfigToModelConfig({ trace_id: "agent1/session_001" }),
  ).not.toHaveProperty("prompt_cache_key");
});

test("the mmsp client forwards session_id", () => {
  const client = new AutoLLMClient({
    model: "gpt-6-luna",
    apiKey: "test-key",
    clientType: "mmsp",
  });

  expect(
    client.transformUniConfigToModelConfig({ session_id: LONG_SESSION_ID }),
  ).toEqual({ session_id: LONG_SESSION_ID });
});

describe("promptCacheKey keeps 64 characters and digests more", () => {
  test.each([
    ["64-ascii", "x".repeat(64), "x".repeat(64)],
    [
      "65-ascii",
      "x".repeat(65),
      "9537c5fdf120482f7d58d25e9ed583f52c02b4e304ea814db1633ad565aed7e9",
    ],
    ["64-emoji", EMOJI_SESSION_ID, EMOJI_SESSION_ID],
    ["65-cjk", LONG_SESSION_ID, LONG_SESSION_KEY],
  ])("%s", (_name, sessionId, expected) => {
    expect(promptCacheKey(sessionId)).toBe(expected);
  });
});

const WEATHER_TOOL = {
  name: "get_weather",
  description: "Get the current weather in a given location",
  parameters: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
  },
};
// the documented allowed-tools object of the Responses API, type included
const RESPONSES_ALLOWED_TOOLS = {
  type: "allowed_tools",
  mode: "required",
  tools: [{ type: "function", name: "get_weather" }],
};
const CHAT_ALLOWED_TOOLS = {
  type: "allowed_tools",
  allowed_tools: {
    mode: "auto",
    tools: [{ type: "function", function: { name: "get_weather" } }],
  },
};

interface OpenAIBodyCase {
  name: string;
  clientType: string;
  model: string;
  config: UniConfig;
  // an undefined value means the body carries no such field
  expected: Record<string, unknown>;
}

// The cases are those of src_py/tests/test_request_body.py.
const OPENAI_BODY_CASES: OpenAIBodyCase[] = [
  {
    name: "openai-official-tool-list",
    clientType: "openai-official",
    model: "gpt-6.1-terra",
    config: { tools: [WEATHER_TOOL], tool_choice: ["get_weather"] },
    expected: { tool_choice: RESPONSES_ALLOWED_TOOLS },
  },
  {
    name: "openai-responses-tool-list",
    clientType: "openai-responses",
    model: "openai/gpt-6.1-terra",
    config: { tools: [WEATHER_TOOL], tool_choice: ["get_weather"] },
    expected: { tool_choice: RESPONSES_ALLOWED_TOOLS },
  },
  {
    name: "openai-chat-tool-list",
    clientType: "openai-chat",
    model: "gpt-6.1-terra",
    config: { tools: [WEATHER_TOOL], tool_choice: ["get_weather"] },
    expected: { tool_choice: CHAT_ALLOWED_TOOLS },
  },
  {
    name: "openai-official-enhance-gpt-6",
    clientType: "openai-official",
    model: "gpt-6.1-terra",
    config: { prompt_caching: PromptCaching.ENHANCE },
    expected: { prompt_cache_options: { ttl: "12h" } },
  },
  {
    name: "openai-official-enhance-gpt-5.6",
    clientType: "openai-official",
    model: "gpt-5.6-luna",
    config: { prompt_caching: PromptCaching.ENHANCE },
    expected: { prompt_cache_options: { ttl: "12h" } },
  },
  {
    name: "openai-official-enable",
    clientType: "openai-official",
    model: "gpt-6.1-terra",
    config: { prompt_caching: PromptCaching.ENABLE },
    expected: { prompt_cache_options: undefined },
  },
];

describe("OpenAI clients send tool lists and the cache lifetime", () => {
  test.each(OPENAI_BODY_CASES)("$name", async (testCase) => {
    const client = new AutoLLMClient({
      model: testCase.model,
      apiKey: "test-key",
      baseUrl: origin,
      clientType: testCase.clientType,
    });
    const messages: UniMessage[] = [
      { role: "user", content_items: [{ type: "text.done", text: "Hi" }] },
    ];

    const drain = async (): Promise<void> => {
      for await (const event of client.streamingResponse({
        messages,
        config: testCase.config,
      })) {
        void event;
      }
    };
    await expect(drain()).rejects.toThrow(OpenAI.BadRequestError);

    expect(receivedBody.model).toBe(testCase.model);
    const picked = Object.fromEntries(
      Object.keys(testCase.expected).map((name) => [name, receivedBody[name]]),
    );
    expect(picked).toStrictEqual(testCase.expected);
  });
});

describe("OpenAI clients refuse the prompt_caching they cannot send", () => {
  test.each<[string, string, PromptCaching]>([
    ["openai-official", "gpt-5.5", PromptCaching.ENHANCE],
    ["openai-official", "gpt-6.1-terra", PromptCaching.DISABLE],
    ["openai-responses", "openai/gpt-6.1-terra", PromptCaching.ENHANCE],
    ["openai-chat", "gpt-6.1-terra", PromptCaching.ENHANCE],
  ])("%s %s %s", (clientType, model, promptCaching) => {
    const client = new AutoLLMClient({ model, apiKey: "test-key", clientType });

    expect(() =>
      client.transformUniConfigToModelConfig({ prompt_caching: promptCaching }),
    ).toThrow(UnsupportedParameterError);
  });
});

// Gemini Omni: a local Interactions endpoint that records the request and streams the events the
// live API streamed for the default video on 2026-11-06 (a signed thought step, then one video
// delta). The cases are those of src_py/tests/test_request_body.py.
const OMNI_MODEL = "gemini-omni-1.2-flash";
const OMNI_VIDEO = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from("ftypmp42 a whole video"),
]);
const OMNI_URI =
  "https://generativelanguage.googleapis.com/v1beta/files/abc123:download?alt=media";

function omniStream(videoDelta: Record<string, unknown>): string {
  const usage = {
    total_tokens: 58539,
    total_input_tokens: 33,
    total_cached_tokens: 0,
    total_output_tokens: 57920,
    output_tokens_by_modality: [{ modality: "video", tokens: 57920 }],
    total_thought_tokens: 586,
  };
  const events = [
    {
      event_type: "interaction.created",
      interaction: { id: "", status: "in_progress", model: OMNI_MODEL },
    },
    { event_type: "step.start", index: 0, step: { type: "thought" } },
    {
      event_type: "step.delta",
      index: 0,
      delta: { type: "thought_signature", signature: "c2ln" },
    },
    { event_type: "step.stop", index: 0 },
    { event_type: "step.start", index: 1, step: { type: "model_output" } },
    { event_type: "step.delta", index: 1, delta: videoDelta },
    { event_type: "step.stop", index: 1 },
    {
      event_type: "interaction.completed",
      interaction: { id: "", status: "completed", usage, model: OMNI_MODEL },
    },
  ];
  return (
    events
      .map(
        (event) =>
          `event: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`,
      )
      .join("") + "event: done\ndata: [DONE]\n\n"
  );
}

describe("Gemini Omni", () => {
  let omniServer: http.Server;
  let omniOrigin: string;
  let omniBody: Record<string, unknown> = {};
  let omniResponse = "";

  beforeAll(async () => {
    omniServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        omniBody = raw ? JSON.parse(raw) : {};
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.end(omniResponse);
      });
    });
    await new Promise<void>((resolve) => {
      omniServer.listen(0, "127.0.0.1", resolve);
    });
    omniOrigin = `http://127.0.0.1:${(omniServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      omniServer.close(() => resolve());
    });
  });

  async function collect(
    messages: UniMessage[],
    config: UniConfig,
  ): Promise<UniEvent[]> {
    const client = new AutoLLMClient({
      model: OMNI_MODEL,
      apiKey: "test-key",
      baseUrl: omniOrigin,
    });
    const events: UniEvent[] = [];
    for await (const event of client.streamingResponse({ messages, config })) {
      events.push(event);
    }
    return events;
  }

  test("sends the newest message at the video defaults and streams the video", async () => {
    omniBody = {};
    omniResponse = omniStream({
      type: "video",
      mime_type: "video/mp4",
      data: OMNI_VIDEO.toString("base64"),
    });
    const events = await collect(
      [
        {
          role: "user",
          content_items: [
            { type: "text.done", text: "A paper boat on a stream." },
          ],
        },
        {
          role: "assistant",
          content_items: [{ type: "text.done", text: "Here it is." }],
        },
        {
          role: "user",
          content_items: [
            { type: "text.done", text: "The same boat at night." },
          ],
        },
      ],
      {
        max_tokens: 1000,
        thinking_level: ThinkingLevel.MEDIUM,
        system_prompt: "Shoot it on film.",
      },
    );

    // the newest message alone, no max_output_tokens and no response_format (16:9, 720p, 10 s, inline)
    expect(omniBody.model).toBe(OMNI_MODEL);
    expect(omniBody.input).toEqual([
      {
        type: "user_input",
        content: [{ type: "text", text: "The same boat at night." }],
      },
    ]);
    expect(omniBody.generation_config).toEqual({ thinking_level: "high" });
    expect(omniBody.system_instruction).toBe("Shoot it on film.");
    expect(omniBody.stream).toBe(true);
    expect(omniBody.store).toBe(false);
    expect(omniBody).not.toHaveProperty("response_format");
    expect(
      events
        .flatMap((event) => event.content_items)
        .filter((item) => item.type.endsWith(".done")),
    ).toEqual([
      { type: "thinking.done", thinking: "", fidelity: { signature: "c2ln" } },
      { type: "inline_data.done", data: OMNI_VIDEO, mime_type: "video/mp4" },
    ]);
    const stop = events[events.length - 1];
    expect(stop.usage_metadata).toEqual({
      cached_tokens: 0,
      prompt_tokens: 33,
      thoughts_tokens: 586,
      response_tokens: 57920,
    });
    expect(stop.finish_reason).toBe("stop");
  });

  test("returns a video delivered by URI as text", async () => {
    omniResponse = omniStream({
      type: "video",
      mime_type: "video/mp4",
      uri: OMNI_URI,
    });
    const events = await collect(
      [
        {
          role: "user",
          content_items: [
            { type: "text.done", text: "A paper boat on a stream." },
          ],
        },
      ],
      {},
    );

    const doneItems = events
      .flatMap((event) => event.content_items)
      .filter((item) => item.type.endsWith(".done"));
    expect(doneItems[doneItems.length - 1]).toEqual({
      type: "text.done",
      text: OMNI_URI,
    });
  });

  test.each<[string, UniConfig]>([
    [
      "tools",
      {
        tools: [
          {
            name: "get_weather",
            description: "Get the weather",
            parameters: { type: "object" },
          },
        ],
      },
    ],
    ["tool_choice", { tool_choice: "auto" }],
    ["image_config", { image_config: { aspect_ratio: "16:9" } }],
    ["fast_mode", { fast_mode: true }],
  ])("refuses %s", (parameter, config) => {
    const client = new AutoLLMClient({ model: OMNI_MODEL, apiKey: "test-key" });

    let caught: unknown;
    try {
      client.transformUniConfigToModelConfig(config);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UnsupportedParameterError);
    expect((caught as UnsupportedParameterError).parameter).toBe(parameter);
    expect((caught as Error).message).toContain("Gemini Omni does not support");
  });
});
