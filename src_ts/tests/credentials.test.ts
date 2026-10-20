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

import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  environmentCredential,
  routedClientType,
} from "../src/credentials";

// What a host asks before it builds a client; how the clients act on the answers is in
// env-credentials.test.ts.

const DEEPSEEK_ENV = {
  kind: "env",
  apiKeyEnv: "DEEPSEEK_API_KEY",
  baseUrlEnv: "DEEPSEEK_BASE_URL",
};

describe("environmentCredential", () => {
  test("without a base URL, a client reads its key and its base URL variables", () => {
    expect(environmentCredential("deepseek-official")).toEqual(DEEPSEEK_ENV);
    expect(environmentCredential("deepseek-official", "")).toEqual(
      DEEPSEEK_ENV,
    );
  });

  test.each([
    ["deepseek-official", "https://api.deepseek.com", "DEEPSEEK_API_KEY"],
    ["deepseek-official", "https://API.DeepSeek.com//", "DEEPSEEK_API_KEY"],
    ["minimax-official", "https://api.minimax.io/v1", "MINIMAX_API_KEY"],
    ["minimax-official", "HTTPS://api.minimax.io/v1/", "MINIMAX_API_KEY"],
    ["zai-official", "https://api.z.ai/api/paas/v4", "ZAI_API_KEY"],
    ["openai-chat", " https://api.openai.com/v1 ", "OPENAI_API_KEY"],
  ])(
    "%s given its default endpoint as %j reads %s for it, not the base URL variable",
    (clientType, baseUrl, apiKeyEnv) => {
      expect(environmentCredential(clientType, baseUrl)).toEqual({
        kind: "env",
        apiKeyEnv,
        baseUrlEnv: null,
      });
    },
  );

  test.each([
    "https://api.deepseek.com/v1",
    "https://api.deepseek.com/anthropic",
    "http://api.deepseek.com",
    "https://api.deepseek.com:8443",
    "https://api.deepseek.com/?region=cn",
    "https://gateway.example/deepseek",
    "not a url",
  ])("another endpoint, %j, needs a key passed in", (baseUrl) => {
    expect(environmentCredential("deepseek-official", baseUrl)).toEqual({
      kind: "required",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      baseUrlEnv: "DEEPSEEK_BASE_URL",
    });
  });

  test("the mmsp client calls any base URL passed without a key keyless, its default included", () => {
    expect(environmentCredential("mmsp", "https://gateway.example/v1")).toEqual(
      { kind: "keyless" },
    );
    expect(environmentCredential("mmsp", "http://127.0.0.1:25752/v1")).toEqual(
      { kind: "keyless" },
    );
    expect(environmentCredential("mmsp")).toEqual({
      kind: "env",
      apiKeyEnv: "MMSP_API_KEY",
      baseUrlEnv: "MMSP_BASE_URL",
    });
  });

  test("an earlier name, in any casing, answers as the client type it names", () => {
    expect(
      environmentCredential("Gemini-Official", "https://gateway.example"),
    ).toEqual(
      environmentCredential("google-official", "https://gateway.example"),
    );
    expect(environmentCredential("openai")).toEqual(
      environmentCredential("openai-chat"),
    );
  });

  test("an unknown client type has no answer", () => {
    expect(environmentCredential("nope", "https://api.deepseek.com")).toBeNull();
  });
});

describe("routedClientType", () => {
  test.each([
    ["deepseek-v4-flash", undefined, "deepseek-official"],
    ["MiniMax-M3", undefined, "minimax-official"],
    ["gpt-6-astra", undefined, "openai-official"],
    ["text-embedding-3-large", undefined, "openai-embedding"],
    ["text-embedding-3-large", "OpenAI-Official", "openai-embedding"],
    ["claude-sonnet-5", "ant-messages", "ant-messages"],
    ["qwen3.8", "openai", "openai-chat"],
    ["gemini-3.8-flash", "gemini-generate-content", "google-genai"],
  ])("%s with client type %s routes to %s", (model, clientType, routed) => {
    expect(routedClientType(model, clientType)).toBe(routed);
  });

  test("a model of no known family, or an unknown client type, routes nowhere", () => {
    expect(routedClientType("qwen3.8")).toBeNull();
    expect(routedClientType("gpt-6-astra", "nope")).toBeNull();
  });
});

test("the module imports nothing and reads no environment, so a browser bundle can hold it", () => {
  const source = readFileSync(
    resolve(__dirname, "../src/credentials.ts"),
    "utf8",
  );

  expect(source).not.toMatch(/^\s*import\s/m);
  expect(source).not.toMatch(/\brequire\(/);
  expect(source).not.toMatch(/\bprocess\./);
});
