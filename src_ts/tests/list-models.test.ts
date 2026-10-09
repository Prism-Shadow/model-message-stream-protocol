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

import { expect, describe, test } from "@jest/globals";

import { AutoLLMClient, UnsupportedOperationError } from "../src";

interface ListCase {
  expectedClient: string;
  model: string;
  clientType?: string;
  expected: string[];
}

// What a gateway fronting several vendors answers with.
const servedIds = [
  "gpt-5.6",
  "claude-sonnet-5",
  "claude-opus-4-6",
  "deepseek-v4",
  "deepseek-flash",
  "glm-5.3",
  "kimi-k3",
  "gemini-3.7-flash",
  "MiniMax-M3",
];

// A client named by its type speaks for the whole listing; a client deduced from a model id
// keeps the ids of its own family.
const SDK_LIST_CASES: ListCase[] = [
  {
    expectedClient: "OpenAIOfficialClient",
    model: "gpt-5.6",
    expected: ["gpt-5.6"],
  },
  {
    expectedClient: "AnthropicOfficialClient",
    model: "claude-sonnet-5",
    expected: ["claude-sonnet-5", "claude-opus-4-6"],
  },
  {
    expectedClient: "DeepSeekOfficialClient",
    model: "deepseek-v4",
    expected: ["deepseek-v4", "deepseek-flash"],
  },
  {
    expectedClient: "ZAIOfficialClient",
    model: "glm-5.3",
    expected: ["glm-5.3"],
  },
  {
    expectedClient: "MoonshotOfficialClient",
    model: "kimi-k3",
    expected: ["kimi-k3"],
  },
  {
    expectedClient: "MiniMaxOfficialClient",
    model: "MiniMax-M3",
    expected: ["MiniMax-M3"],
  },
  {
    expectedClient: "OpenAIOfficialClient",
    model: "gpt-5.6",
    clientType: "openai-official",
    expected: servedIds,
  },
  {
    expectedClient: "OpenaiChatClient",
    model: "gpt-5.6",
    clientType: "openai-chat",
    expected: servedIds,
  },
  {
    expectedClient: "OpenaiResponsesClient",
    model: "gpt-5.6",
    clientType: "openai-responses",
    expected: servedIds,
  },
  {
    expectedClient: "AntMessagesClient",
    model: "claude-sonnet-5",
    clientType: "ant-messages",
    expected: servedIds,
  },
  {
    expectedClient: "OpenaiEmbeddingClient",
    model: "qwen3-embedding",
    clientType: "openai-embedding",
    expected: servedIds,
  },
];

function asyncIterable(items: unknown[]): AsyncIterable<unknown> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

function installFakeModels(client: AutoLLMClient, fakeClient: unknown): void {
  const routedClient = (client as unknown as { _client: { _client: unknown } })
    ._client;
  routedClient._client = fakeClient;
}

function routedClientName(client: AutoLLMClient): string {
  return (client as unknown as { _client: object })._client.constructor.name;
}

describe.each(SDK_LIST_CASES)(
  "listModels for $model as $clientType",
  (testCase) => {
    test("returns the ids the endpoint serves", async () => {
      const client = new AutoLLMClient({
        model: testCase.model,
        apiKey: "test-key",
        clientType: testCase.clientType,
      });
      expect(routedClientName(client)).toBe(testCase.expectedClient);
      installFakeModels(client, {
        models: { list: () => asyncIterable(servedIds.map((id) => ({ id }))) },
      });

      await expect(client.listModels()).resolves.toEqual(testCase.expected);
    });
  },
);

describe("listModels", () => {
  test("the Gemini client strips the path from model names", async () => {
    const client = new AutoLLMClient({
      model: "gemini-3.7-flash",
      apiKey: "test-key",
    });
    expect(routedClientName(client)).toBe("GoogleOfficialClient");
    installFakeModels(client, {
      models: {
        list: async () =>
          asyncIterable(
            [
              "models/gemini-3.7-flash",
              "publishers/google/models/gemini-3.7-pro",
            ].map((name) => ({ name })),
          ),
      },
    });

    await expect(client.listModels()).resolves.toEqual([
      "gemini-3.7-flash",
      "gemini-3.7-pro",
    ]);
  });

  // A Vertex AI service-account key; the SDK authenticates lazily, so nothing more is needed to
  // construct the client.
  const serviceAccountKey = '{"project_id": "test-project"}';

  const vertexListing = [
    "gemini-3.8-flash",
    "gemini-embedding-2",
    "gemini-2.5-flash",
    "spicy-mayo",
  ];
  const geminiFamily = [
    "gemini-3.8-flash",
    "gemini-embedding-2",
    "gemini-2.5-flash",
  ];

  test.each([
    {
      apiKey: "test-key",
      clientType: undefined,
      expectedClient: "GoogleOfficialClient",
      expected: geminiFamily,
    },
    {
      apiKey: serviceAccountKey,
      clientType: "google-genai",
      expectedClient: "GoogleGenaiClient",
      expected: vertexListing,
    },
    {
      apiKey: "test-key",
      clientType: "google-genai",
      expectedClient: "GoogleGenaiClient",
      expected: vertexListing,
    },
  ])(
    "the Gemini clients list the family of a deduced client and everything for a named one ($expectedClient, $clientType)",
    async ({ apiKey, clientType, expectedClient, expected }) => {
      const client = new AutoLLMClient({
        model: "gemini-3.8-flash",
        apiKey,
        clientType,
      });
      expect(routedClientName(client)).toBe(expectedClient);
      installFakeModels(client, {
        models: {
          list: async () =>
            asyncIterable(
              vertexListing.map((id) => ({
                name: `publishers/google/models/${id}`,
              })),
            ),
        },
      });

      await expect(client.listModels()).resolves.toEqual(expected);
    },
  );

  test("the Claude client reports that Bedrock cannot list models", async () => {
    const client = new AutoLLMClient({
      model: "claude-sonnet-5",
      apiKey: "access-key,secret-key",
      baseUrl: "bedrock://us-east-1",
    });

    await expect(client.listModels()).rejects.toThrow(
      UnsupportedOperationError,
    );
  });
});
