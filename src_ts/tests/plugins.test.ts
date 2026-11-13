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

// Client plugins: where they are enabled and where their hooks run (MMSP-RFC-0009 §9).

import { expect, describe, test } from "@jest/globals";
import { AutoLLMClient, UniConfig, UniEvent, UniMessage } from "../src";
import { ClientPlugin, enabledPlugins, type PluginClass } from "../src/plugin";
import { assertStreamGrammar } from "./streamGrammar";

class Hosts extends ClientPlugin {
  static readonly hosts = ["example.ai"];
}

class Models extends ClientPlugin {
  static readonly models = "gpt-6";
}

class Both extends ClientPlugin {
  static readonly hosts = ["example.ai"];
  static readonly models = "gpt-6";
}

class Neither extends ClientPlugin {}

describe("enabledPlugins", () => {
  test.each<[string, string, PluginClass[]]>([
    ["gpt-6", "https://example.ai/v1", [Hosts, Models, Both]],
    // a host matches its subdomains too, and a model pattern ignores case
    ["GPT-6-Luna", "https://api.example.ai/v1", [Hosts, Models, Both]],
    ["gpt-5.5", "https://api.example.ai/v1", [Hosts]],
    ["openai/gpt-6.1-sol", "https://gateway.test/v1", [Models]],
    // a host is matched whole, never as a substring of another
    ["gpt-5.5", "https://notexample.ai/v1", []],
    ["gpt-5.5", "https://example.ai.evil.test/v1", []],
  ])(
    "%s at %s enables every plugin whose conditions all match",
    (model, baseUrl, expected) => {
      const plugins = enabledPlugins(
        [Hosts, Models, Both, Neither],
        model,
        baseUrl,
        null,
      );
      expect(plugins.map((plugin) => plugin.constructor)).toEqual(expected);
      expect(
        plugins.every(
          (plugin) => plugin.model === model && plugin.baseUrl === baseUrl,
        ),
      ).toBe(true);
    },
  );
});

function pluginNames(client: AutoLLMClient): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any)._client._plugins.map(
    (plugin: ClientPlugin) => plugin.constructor.name,
  );
}

describe("a client's plugins", () => {
  test.each<[string, string, string, string[]]>([
    ["mistral-medium-latest", "https://api.mistral.ai/v1", "openai-chat", ["MistralPlugin"]],
    ["z-ai/glm-5.3", "https://openrouter.ai/api/v1", "openai-chat", ["OpenRouterPlugin"]],
    ["openai/gpt-6-luna", "https://openrouter.ai/api/v1", "openai-chat", ["OpenRouterPlugin", "GptPlugin"]],
    ["anthropic/claude-sonnet-5", "https://openrouter.ai/api", "ant-messages", ["OpenRouterPlugin"]],
    ["openai/gpt-6.1-terra", "https://openrouter.ai/api/v1", "openai-responses", ["GptPlugin"]],
    ["qwen3.8-flash", "https://tokendance.space/gateway/v1", "openai-responses", []],
    ["glm-5.3", "https://api.test.invalid/v1", "openai-chat", []],
  ])("%s at %s on %s", (model, baseUrl, clientType, expected) => {
    const client = new AutoLLMClient({
      model,
      apiKey: "test-key",
      baseUrl,
      clientType,
    });
    expect(pluginNames(client)).toEqual(expected);
  });

  test("an official client has none", () => {
    const client = new AutoLLMClient({ model: "gpt-6-luna", apiKey: "test-key" });
    expect(pluginNames(client)).toEqual([]);
  });
});

function chunk(
  content: string | null,
  finishReason: string | null = null,
  usage: unknown = null,
): unknown {
  return { choices: [{ delta: { content }, finish_reason: finishReason }], usage };
}

function usage(completionTokens: number, reasoningTokens: number): unknown {
  return {
    prompt_tokens: 5,
    completion_tokens: completionTokens,
    completion_tokens_details: { reasoning_tokens: reasoningTokens },
  };
}

function install(client: AutoLLMClient, chunks: unknown[], calls: string[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any)._client._client = {
    baseURL: "https://api.test.invalid/v1",
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        create: async (params: any) => {
          calls.push(`create:${params.marked}`);
          return {
            async *[Symbol.asyncIterator]() {
              yield* chunks;
            },
          };
        },
      },
    },
  };
}

class Recorder extends ClientPlugin {
  static readonly models = ".";

  constructor(readonly calls: string[]) {
    super("glm-5.3", "https://api.test.invalid/v1", null);
  }

  async onRequest(
    _config: UniConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request: Record<string, any>,
  ): Promise<void> {
    this.calls.push(`onRequest:${request.messages.length}`);
    request.marked = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onWireEvent(wireEvent: any): void {
    const delta = wireEvent.choices[0].delta;
    this.calls.push(`onWireEvent:${delta.content}`);
    delta.content = (delta.content ?? "").toUpperCase() || null;
  }

  onEvent(event: UniEvent): void {
    const texts = event.content_items
      .filter((item) => item.type === "text.delta")
      .map((item) => (item as { text: string }).text);
    this.calls.push(`onEvent:${texts.join("")}`);
  }
}

const HELLO: UniMessage[] = [
  { role: "user", content_items: [{ type: "text.done", text: "Hello" }] },
];

async function collect(client: AutoLLMClient): Promise<UniEvent[]> {
  const events: UniEvent[] = [];
  for await (const event of client.streamingResponse({
    messages: HELLO,
    config: {},
  })) {
    events.push(event);
  }
  return events;
}

describe("plugin hooks", () => {
  test("run before the request, before the event transform and after it", async () => {
    const calls: string[] = [];
    const client = new AutoLLMClient({
      model: "glm-5.3",
      apiKey: "test-key",
      baseUrl: "https://api.test.invalid/v1",
      clientType: "openai-chat",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)._client._plugins = [new Recorder(calls)];
    install(client, [chunk("hi"), chunk(null, "stop", usage(1, 0))], calls);

    const events = await collect(client);
    assertStreamGrammar(events);
    // the request the plugin changed is the one sent, and the event transform reads the wire event
    // the plugin changed
    expect(calls).toEqual([
      "onRequest:1",
      "create:true",
      "onWireEvent:hi",
      "onEvent:HI",
      "onWireEvent:null",
      "onEvent:",
    ]);
  });

  test.each([
    ["https://openrouter.ai/api/v1", 4],
    ["https://api.test.invalid/v1", -2],
  ])(
    "OpenRouter's completion tokens without the reasoning are corrected (%s)",
    async (baseUrl, expected) => {
      const client = new AutoLLMClient({
        model: "z-ai/glm-5.3",
        apiKey: "test-key",
        baseUrl,
        clientType: "openai-chat",
      });
      install(client, [chunk("hi"), chunk(null, "stop", usage(4, 6))], []);
      const events = await collect(client);
      expect(events[events.length - 1].usage_metadata?.response_tokens).toBe(
        expected,
      );
    },
  );

  test("Mistral takes no empty reasoning field on a tool-calling turn", async () => {
    const client = new AutoLLMClient({
      model: "mistral-medium-latest",
      apiKey: "test-key",
      baseUrl: "https://api.mistral.ai/v1",
      clientType: "openai-chat",
    });
    const request = {
      messages: [
        { role: "user", content: [{ type: "text", text: "Weather?" }] },
        {
          role: "assistant",
          tool_calls: [{ id: "call_1" }],
          reasoning_content: "",
          reasoning: "",
        },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const plugin of (client as any)._client._plugins) {
      await plugin.onRequest({}, request);
    }
    expect(request.messages[1]).toEqual({
      role: "assistant",
      tool_calls: [{ id: "call_1" }],
    });
    expect(request).not.toHaveProperty("reasoning_effort");
  });
});
