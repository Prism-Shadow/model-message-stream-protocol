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

import { AutoLLMClient, UniConfig, UniMessage } from "../src";

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
