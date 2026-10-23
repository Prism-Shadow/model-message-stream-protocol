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

import { describe, expect, jest, test } from "@jest/globals";
import { AutoLLMClient } from "../src/autoClient";
import { LLMClient } from "../src/baseClient";
import {
  ConcurrentCallError,
  EmptyResponseError,
  IncompleteStreamError,
  InvalidMessageError,
  StreamProtocolError,
  ToolCallArgumentParseError,
} from "../src/errors";
import { normalizeLegacyMessages } from "../src/legacy";
import {
  EventContentItem,
  Fidelity,
  FinishReason,
  UniConfig,
  UniEvent,
  UniMessage,
  UsageMetadata,
} from "../src/types";
import { assertStreamGrammar } from "./streamGrammar";

const USAGE: UsageMetadata = {
  cached_tokens: null,
  prompt_tokens: 10,
  thoughts_tokens: null,
  response_tokens: 5,
};

const USER: UniMessage = {
  role: "user",
  content_items: [{ type: "text.done", text: "hi" }],
};

function delta(...items: EventContentItem[]): UniEvent {
  return {
    role: "assistant",
    event_type: "delta",
    content_items: items,
    usage_metadata: null,
    finish_reason: null,
  };
}

function stop(
  usage: UsageMetadata | null,
  finish: FinishReason | null,
  items: EventContentItem[] = [],
): UniEvent {
  return {
    role: "assistant",
    event_type: "stop",
    content_items: items,
    usage_metadata: usage,
    finish_reason: finish,
  };
}

/**
 * The item with fidelity.item_id in front of the fidelity it already carries.
 */
function withId(itemId: string, item: EventContentItem): EventContentItem {
  const { fidelity } = item as { fidelity?: Fidelity };
  return {
    ...item,
    fidelity: { item_id: itemId, ...fidelity },
  } as EventContentItem;
}

const FINISH = stop(USAGE, "stop");

/**
 * A client that replays a fixed list of events, deltas only as every client yields them, and
 * records the messages it was sent.
 */
class ScriptedClient extends LLMClient {
  sentMessages: UniMessage[][] = [];

  constructor(private readonly events: UniEvent[]) {
    super();
    this._model = "scripted";
  }

  transformUniConfigToModelConfig(): undefined {
    return undefined;
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
  }): AsyncGenerator<UniEvent> {
    this.sentMessages.push(options.messages);
    for (const event of this.events) {
      yield this.transformModelOutputToUniEvent(event);
    }
  }

  async listModels(): Promise<string[]> {
    return [];
  }
}

async function collect(
  script: UniEvent[],
  config: UniConfig = {},
): Promise<UniEvent[]> {
  const events: UniEvent[] = [];
  for await (const event of new ScriptedClient(script).streamingResponse({
    messages: [USER],
    config,
  })) {
    events.push(event);
  }
  return events;
}

function items(events: UniEvent[]) {
  return events.flatMap((event) => event.content_items);
}

function userMessage(
  text: string,
  fields: Partial<UniMessage> = {},
): UniMessage {
  return {
    role: "user",
    content_items: [{ type: "text.done", text }],
    ...fields,
  };
}

/**
 * An embedding client whose endpoint answers every request with `data`.
 */
function embeddingClient(
  data: { index: number; embedding: number[] }[],
): AutoLLMClient {
  const client = new AutoLLMClient({
    model: "text-embedding-3-large",
    apiKey: "test-key",
    clientType: "openai-embedding",
  });
  (client as unknown as { _client: { _client: unknown } })._client._client = {
    embeddings: {
      create: async () => ({ data, usage: { prompt_tokens: 4 } }),
    },
  };
  return client;
}

describe("stream assembly", () => {
  test("text streams as deltas, a done item, then the stop event", async () => {
    const events = await collect([
      delta(withId("0", { type: "text.delta", text: "Hel" })),
      delta(withId("0", { type: "text.delta", text: "lo" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "text.delta", text: "Hel" },
      { type: "text.delta", text: "lo" },
      { type: "text.done", text: "Hello" },
    ]);
    expect(events[events.length - 1]).toMatchObject({
      event_type: "stop",
      usage_metadata: USAGE,
      finish_reason: "stop",
    });
  });

  test("the fidelity a delta carries is the done item's fidelity", async () => {
    const events = await collect([
      delta(
        withId("msg", {
          type: "text.delta",
          text: "",
          fidelity: { phase: "commentary" },
        }),
      ),
      delta(withId("msg", { type: "text.delta", text: "Checking" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "text.delta", text: "", fidelity: { phase: "commentary" } },
      { type: "text.delta", text: "Checking" },
      {
        type: "text.done",
        text: "Checking",
        fidelity: { phase: "commentary" },
      },
    ]);
  });

  test("thinking ending on its signature, then a tool call built from its fragments", async () => {
    const events = await collect([
      delta(withId("0", { type: "thinking.delta", thinking: "Let me" })),
      delta(withId("0", { type: "thinking.delta", thinking: " look" })),
      delta(
        withId("0", {
          type: "thinking.delta",
          thinking: "",
          fidelity: { signature: "sig" },
        }),
      ),
      delta(
        withId("1", {
          type: "tool_call.delta",
          name: "get_weather",
          arguments: "",
          tool_call_id: "toolu_1",
        }),
      ),
      delta(
        withId("1", {
          type: "tool_call.delta",
          name: "",
          arguments: '{"city":',
          tool_call_id: "",
        }),
      ),
      delta(
        withId("1", {
          type: "tool_call.delta",
          name: "",
          arguments: '"Paris"}',
          tool_call_id: "",
        }),
      ),
      stop(USAGE, "tool_call"),
    ]);

    assertStreamGrammar(events);
    const done = items(events).filter((item) => item.type.endsWith(".done"));
    expect(done).toEqual([
      {
        type: "thinking.done",
        thinking: "Let me look",
        fidelity: { signature: "sig" },
      },
      {
        type: "tool_call.done",
        name: "get_weather",
        arguments: { city: "Paris" },
        tool_call_id: "toolu_1",
      },
    ]);
  });

  test("an item is done when a delta of the next item arrives: another id, kind, or call", async () => {
    const call = (id: string, name: string, args: string) =>
      delta(
        withId(id, {
          type: "tool_call.delta",
          name,
          arguments: args,
          tool_call_id: name && `call_${name}`,
        }),
      );

    const events = await collect([
      delta(withId("msg_1", { type: "text.delta", text: "a" })),
      // another id
      delta(withId("msg_2", { type: "text.delta", text: "b" })),
      // another kind under the same id
      delta(withId("msg_2", { type: "thinking.delta", thinking: "c" })),
      // a call's name begins the next call, whatever id a provider gives its calls
      call("tool_calls", "f", '{"x":'),
      call("tool_calls", "", "1}"),
      call("tool_calls", "g", "{}"),
      // and its arguments continue it, whatever id a gateway puts on them
      call("other", "", ""),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events).map((item) => item.type)).toEqual([
      "text.delta",
      "text.done",
      "text.delta",
      "text.done",
      "thinking.delta",
      "thinking.done",
      "tool_call.delta",
      "tool_call.delta",
      "tool_call.done",
      "tool_call.delta",
      "tool_call.done",
    ]);
    expect(items(events)[8]).toMatchObject({ name: "f", arguments: { x: 1 } });
    expect(items(events)[10]).toMatchObject({ name: "g", arguments: {} });
  });

  test("a delta without an item_id continues the item streaming now", async () => {
    // a gateway that leaves the item ids off its deltas
    const events = await collect([
      delta(withId("rs_1", { type: "thinking.delta", thinking: "" })),
      delta({ type: "thinking.delta", thinking: "Plan" }),
      delta({ type: "text.delta", text: "Ans" }),
      delta({ type: "text.delta", text: "wer" }),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "thinking.delta", thinking: "Plan" },
      { type: "thinking.done", thinking: "Plan" },
      { type: "text.delta", text: "Ans" },
      { type: "text.delta", text: "wer" },
      { type: "text.done", text: "Answer" },
    ]);
  });

  test("the item streaming when the provider's stream ends is done before the stop", async () => {
    const events = await collect([
      delta(withId("0", { type: "text.delta", text: "a" })),
      delta(withId("1", { type: "text.delta", text: "b" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "text.delta", text: "a" },
      { type: "text.done", text: "a" },
      { type: "text.delta", text: "b" },
      { type: "text.done", text: "b" },
    ]);
  });

  test("a repeated identical fidelity goes out once, empty fragments not at all", async () => {
    const fidelity = { reasoning_field: "reasoning_content" };
    const events = await collect([
      delta(withId("0", { type: "thinking.delta", thinking: "" })),
      delta(withId("0", { type: "thinking.delta", thinking: "a", fidelity })),
      delta(withId("0", { type: "thinking.delta", thinking: "b", fidelity })),
      delta(withId("1", { type: "text.delta", text: "ok" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "thinking.delta", thinking: "a", fidelity },
      { type: "thinking.delta", thinking: "b" },
      { type: "thinking.done", thinking: "ab", fidelity },
      { type: "text.delta", text: "ok" },
      { type: "text.done", text: "ok" },
    ]);
  });

  test("audio chunks join into one done item, while every image and every vector is an item", async () => {
    const audio = await collect([
      delta(
        withId("0", {
          type: "inline_data.delta",
          data: Buffer.from([1, 2]),
          mime_type: "audio/L16",
        }),
      ),
      delta(
        withId("0", {
          type: "inline_data.delta",
          data: Buffer.from([3]),
          mime_type: "audio/L16",
        }),
      ),
      FINISH,
    ]);
    assertStreamGrammar(audio);
    expect(items(audio)[2]).toEqual({
      type: "inline_data.done",
      data: Buffer.from([1, 2, 3]),
      mime_type: "audio/L16",
    });

    const image = (bytes: number[]) =>
      delta(
        withId("0", {
          type: "inline_data.delta",
          data: Buffer.from(bytes),
          mime_type: "image/png",
        }),
      );
    const images = await collect([image([1]), image([2]), FINISH]);
    assertStreamGrammar(images);
    expect(items(images).map((item) => item.type)).toEqual([
      "inline_data.delta",
      "inline_data.done",
      "inline_data.delta",
      "inline_data.done",
    ]);

    const embeddings = await collect([
      delta({ type: "embedding.delta", embedding: [0.1] }),
      delta({ type: "embedding.delta", embedding: [0.2] }),
      FINISH,
    ]);
    assertStreamGrammar(embeddings);
    expect(items(embeddings)).toEqual([
      { type: "embedding.delta", embedding: [0.1] },
      { type: "embedding.done", embedding: [0.1] },
      { type: "embedding.delta", embedding: [0.2] },
      { type: "embedding.done", embedding: [0.2] },
    ]);
  });

  test("usage pieces merge field by field", async () => {
    const events = await collect([
      delta(withId("0", { type: "text.delta", text: "a" })),
      stop(
        {
          cached_tokens: 3,
          prompt_tokens: 7,
          thoughts_tokens: null,
          response_tokens: null,
        },
        null,
      ),
      stop(
        {
          cached_tokens: null,
          prompt_tokens: null,
          thoughts_tokens: null,
          response_tokens: 9,
        },
        "length",
      ),
    ]);

    expect(events[events.length - 1]).toMatchObject({
      usage_metadata: {
        cached_tokens: 3,
        prompt_tokens: 7,
        thoughts_tokens: null,
        response_tokens: 9,
      },
      finish_reason: "length",
    });
  });

  test("item_id never reaches the public stream, the message or the history", async () => {
    const client = new ScriptedClient([
      delta(
        withId("0", {
          type: "thinking.delta",
          thinking: "a",
          fidelity: { signature: "s" },
        }),
      ),
      delta(withId("1", { type: "text.delta", text: "b" })),
      FINISH,
    ]);
    const events: UniEvent[] = [];
    for await (const event of client.streamingResponseStateful({
      message: USER,
      config: {},
    })) {
      events.push(event);
    }

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "thinking.delta", thinking: "a", fidelity: { signature: "s" } },
      { type: "thinking.done", thinking: "a", fidelity: { signature: "s" } },
      { type: "text.delta", text: "b" },
      { type: "text.done", text: "b" },
    ]);
    expect(items(events)[2]).not.toHaveProperty("fidelity");
    expect(
      JSON.stringify(client.concatUniEventsToUniMessage(events)),
    ).not.toContain('"item_id"');
    expect(JSON.stringify(client.getHistory())).not.toContain('"item_id"');
  });

  test("an event carries several items in wire order", async () => {
    // Responses reasoning: the fidelity arrives with the item's end
    const reasoning = await collect([
      delta(withId("rs_1", { type: "thinking.delta", thinking: "Plan" })),
      delta(
        withId("rs_1", {
          type: "thinking.delta",
          thinking: "",
          fidelity: { encrypted_content: "enc" },
        }),
      ),
      delta(withId("msg_1", { type: "text.delta", text: "Done" })),
      FINISH,
    ]);
    assertStreamGrammar(reasoning);
    expect(items(reasoning)).toEqual([
      { type: "thinking.delta", thinking: "Plan" },
      {
        type: "thinking.delta",
        thinking: "",
        fidelity: { encrypted_content: "enc" },
      },
      {
        type: "thinking.done",
        thinking: "Plan",
        fidelity: { encrypted_content: "enc" },
      },
      { type: "text.delta", text: "Done" },
      { type: "text.done", text: "Done" },
    ]);

    // Chat Completions: a chunk may end the reasoning and begin the answer, and the last content
    // chunk carries the finish reason, while the usage follows in a chunk of its own
    const chat = await collect([
      delta(
        withId("reasoning", { type: "thinking.delta", thinking: "Hmm" }),
        withId("content", { type: "text.delta", text: "Hel" }),
      ),
      stop(null, "stop", [
        withId("content", { type: "text.delta", text: "lo" }),
      ]),
      stop(USAGE, null),
    ]);
    assertStreamGrammar(chat);
    expect(items(chat)).toEqual([
      { type: "thinking.delta", thinking: "Hmm" },
      { type: "thinking.done", thinking: "Hmm" },
      { type: "text.delta", text: "Hel" },
      { type: "text.delta", text: "lo" },
      { type: "text.done", text: "Hello" },
    ]);
    expect(chat[chat.length - 1]).toMatchObject({
      usage_metadata: USAGE,
      finish_reason: "stop",
    });
  });

  test("fidelity sent alone under the item's id is that item's, whatever kind carries it", async () => {
    // an Interactions thought step: an image, then the signature the step ends with
    const events = await collect([
      delta(
        withId("0", {
          type: "inline_thinking.delta",
          data: Buffer.from("draft"),
          mime_type: "image/png",
        }),
      ),
      delta(
        withId("0", {
          type: "thinking.delta",
          thinking: "",
          fidelity: { signature: "sig" },
        }),
      ),
      delta(withId("1", { type: "text.delta", text: "ok" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events).slice(0, 3)).toEqual([
      {
        type: "inline_thinking.delta",
        data: Buffer.from("draft"),
        mime_type: "image/png",
      },
      {
        type: "inline_thinking.delta",
        data: Buffer.alloc(0),
        mime_type: "image/png",
        fidelity: { signature: "sig" },
      },
      {
        type: "inline_thinking.done",
        data: Buffer.from("draft"),
        mime_type: "image/png",
        fidelity: { signature: "sig" },
      },
    ]);
  });

  test("embedding vectors need no item_id", async () => {
    const events = await collect([
      stop(USAGE, "stop", [
        { type: "embedding.delta", embedding: [0.1, 0.2] },
        { type: "embedding.delta", embedding: [0.3, 0.4] },
      ]),
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "embedding.delta", embedding: [0.1, 0.2] },
      { type: "embedding.done", embedding: [0.1, 0.2] },
      { type: "embedding.delta", embedding: [0.3, 0.4] },
      { type: "embedding.done", embedding: [0.3, 0.4] },
    ]);
  });

  test("embedding vectors pair with their messages by index", async () => {
    // the endpoint answers out of order: each vector names the input it belongs to by its index
    const client = embeddingClient([
      { index: 1, embedding: [0.3, 0.4] },
      { index: 0, embedding: [0.1, 0.2] },
    ]);
    const events: UniEvent[] = [];
    for await (const event of client.streamingResponse({
      messages: [userMessage("first"), userMessage("second")],
      config: {},
    })) {
      events.push(event);
    }

    expect(
      items(events)
        .filter((item) => item.type === "embedding.done")
        .map((item) => (item as { embedding: number[] }).embedding),
    ).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  test("an embedding message without text raises InvalidMessageError", () => {
    const client = embeddingClient([]);

    let error: unknown;
    try {
      client.transformUniMessageToModelInput([
        userMessage("first"),
        userMessage(""),
      ]);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidMessageError);
    expect(error).toMatchObject({
      client: "OpenaiEmbeddingClient",
      messageIndex: 1,
      message: "message 1 has nothing OpenaiEmbeddingClient can send",
    });
  });

  test("an empty delta event and a stop event carrying nothing are ignored", async () => {
    const events = await collect([
      delta(),
      delta(withId("0", { type: "text.delta", text: "a" })),
      FINISH,
      stop(null, null),
      delta(),
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "text.delta", text: "a" },
      { type: "text.done", text: "a" },
    ]);
    expect(events[events.length - 1]).toMatchObject({
      usage_metadata: USAGE,
      finish_reason: "stop",
    });
  });

  test("an item no delta of which went out has no done item", async () => {
    const events = await collect([
      delta(withId("msg_1", { type: "text.delta", text: "" })),
      delta(withId("msg_2", { type: "text.delta", text: "a" })),
      FINISH,
    ]);

    assertStreamGrammar(events);
    expect(items(events)).toEqual([
      { type: "text.delta", text: "a" },
      { type: "text.done", text: "a" },
    ]);
  });
});

describe("stream protocol violations and rejected responses", () => {
  test.each<[string, UniEvent[]]>([
    [
      "a done item: a client yields deltas only",
      [
        delta(withId("0", { type: "text.delta", text: "a" })),
        delta({ type: "text.done", text: "a" }),
      ],
    ],
    [
      "two different fidelity payloads in one item",
      [
        delta(
          withId("0", {
            type: "thinking.delta",
            thinking: "a",
            fidelity: { signature: "1" },
          }),
        ),
        delta(
          withId("0", {
            type: "thinking.delta",
            thinking: "",
            fidelity: { signature: "2" },
          }),
        ),
      ],
    ],
    [
      "a tool call whose first fragment has no tool_call_id",
      [
        delta(
          withId("0", {
            type: "tool_call.delta",
            name: "f",
            arguments: "{}",
            tool_call_id: "",
          }),
        ),
      ],
    ],
    [
      "arguments with no call streaming",
      [
        delta(withId("0", { type: "text.delta", text: "a" })),
        delta(
          withId("1", {
            type: "tool_call.delta",
            name: "",
            arguments: "{}",
            tool_call_id: "",
          }),
        ),
      ],
    ],
    [
      "a delta event carrying a finish reason",
      [
        {
          ...delta(withId("0", { type: "text.delta", text: "a" })),
          finish_reason: "stop",
        },
      ],
    ],
  ])("%s raises StreamProtocolError", async (_name, script) => {
    await expect(collect([...script, FINISH])).rejects.toBeInstanceOf(
      StreamProtocolError,
    );
  });

  test.each<
    [string, UsageMetadata | null, FinishReason | null, string[], string]
  >([
    [
      "usage_metadata",
      null,
      "stop",
      ["usage_metadata"],
      "ScriptedClient's stream ended without usage_metadata.",
    ],
    [
      "finish_reason",
      USAGE,
      null,
      ["finish_reason"],
      "ScriptedClient's stream ended without finish_reason.",
    ],
    [
      "usage_metadata and finish_reason",
      null,
      null,
      ["usage_metadata", "finish_reason"],
      "ScriptedClient's stream ended without usage_metadata and finish_reason.",
    ],
  ])(
    "a stream without %s raises IncompleteStreamError in place of the stop event",
    async (_name, usage, finish, missing, message) => {
      const events: UniEvent[] = [];
      const client = new ScriptedClient([
        delta(withId("0", { type: "text.delta", text: "a" })),
        stop(usage, finish),
      ]);
      const run = async () => {
        for await (const event of client.streamingResponseStateful({
          message: USER,
          config: {},
        })) {
          events.push(event);
        }
      };

      const error = await run().catch((caught) => caught);

      expect(error).toBeInstanceOf(IncompleteStreamError);
      expect(error).toMatchObject({
        client: "ScriptedClient",
        missing,
        usageMetadata: usage,
        finishReason: finish,
        message,
      });
      expect(items(events)).toEqual([
        { type: "text.delta", text: "a" },
        { type: "text.done", text: "a" },
      ]);
      expect(events.some((event) => event.event_type === "stop")).toBe(false);
      expect(client.getHistory()).toEqual([]);
    },
  );

  test("a thinking-only response raises EmptyResponseError carrying its usage", async () => {
    const error = await collect([
      delta(withId("0", { type: "thinking.delta", thinking: "hmm" })),
      FINISH,
    ]).catch((caught) => caught);

    expect(error).toBeInstanceOf(EmptyResponseError);
    expect(error.usageMetadata).toEqual(USAGE);
    expect(error.finishReason).toBe("stop");
  });

  test("malformed tool call arguments raise when the call is done", async () => {
    await expect(
      collect([
        delta(
          withId("0", {
            type: "tool_call.delta",
            name: "f",
            arguments: '{"a":',
            tool_call_id: "c",
          }),
        ),
        FINISH,
      ]),
    ).rejects.toBeInstanceOf(ToolCallArgumentParseError);
  });

  test("a whole tool call reaches the caller before its malformed arguments fail", async () => {
    const call = {
      type: "tool_call.delta" as const,
      name: "f",
      arguments: '{"a":',
      tool_call_id: "c",
    };
    const events: UniEvent[] = [];
    const run = async () => {
      for await (const event of new ScriptedClient([
        delta(withId("0", call)),
        FINISH,
      ]).streamingResponse({ messages: [USER], config: {} })) {
        events.push(event);
      }
    };

    await expect(run()).rejects.toBeInstanceOf(ToolCallArgumentParseError);
    expect(items(events)).toEqual([call]);
  });
});

describe("history and legacy messages", () => {
  const reply: UniEvent[] = [
    delta(withId("0", { type: "text.delta", text: "hello" })),
    FINISH,
  ];

  test("stateful history is recorded even when the caller stops at the stop event", async () => {
    const client = new ScriptedClient(reply);
    for await (const event of client.streamingResponseStateful({
      message: USER,
      config: {},
    })) {
      if (event.event_type === "stop") {
        break;
      }
    }

    const history = client.getHistory();
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      role: "assistant",
      content_items: [{ type: "text.done", text: "hello" }],
      usage_metadata: USAGE,
      finish_reason: "stop",
    });
  });

  async function drain(stream: AsyncGenerator<UniEvent>): Promise<UniEvent[]> {
    const events: UniEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }
    return events;
  }

  test("the caller's messages gain their created_at and nothing else", async () => {
    const messages = [
      userMessage("earlier", { created_at: 1 }),
      userMessage("unset", { created_at: null as unknown as number }),
      userMessage("hi"),
    ];
    const before = structuredClone(messages);

    await drain(
      new ScriptedClient(reply).streamingResponse({ messages, config: {} }),
    );

    expect(messages[0]).toEqual(before[0]);
    for (const [index, message] of messages.entries()) {
      expect(typeof message.created_at).toBe("number");
      expect({ ...message, created_at: null }).toEqual({
        ...before[index],
        created_at: null,
      });
    }

    const message = userMessage("hi");
    await drain(
      new ScriptedClient(reply).streamingResponseStateful({
        message,
        config: {},
      }),
    );

    expect(typeof message.created_at).toBe("number");
    expect({ ...message, created_at: undefined }).toEqual(userMessage("hi"));
  });

  test("the history shares no object with the caller or the stream", async () => {
    const client = new ScriptedClient(reply);
    const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const message: UniMessage = {
      role: "user",
      content_items: [
        { type: "text.done", text: "hi" },
        { type: "inline_data.done", data: image, mime_type: "image/png" },
      ],
    };
    const events = await drain(
      client.streamingResponseStateful({ message, config: {} }),
    );
    const expected = client.getHistory();

    // whatever the caller holds, it changes nothing the client recorded
    (message.content_items[0] as { text: string }).text = "changed";
    message.content_items.push({ type: "text.done", text: "added" });
    image[0] = 0;
    (
      items(events).find((item) => item.type === "text.done") as {
        text: string;
      }
    ).text = "changed";
    const returned = client.getHistory();
    returned[0].content_items.length = 0;
    (returned[1].content_items[0] as { text: string }).text = "changed";

    expect(client.getHistory()).toEqual(expected);
    expect(expected[0].content_items).toEqual([
      { type: "text.done", text: "hi" },
      {
        type: "inline_data.done",
        data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        mime_type: "image/png",
      },
    ]);
    // a Buffer stays a Buffer, which the clients encode with toString("base64")
    expect(
      Buffer.isBuffer(
        (client.getHistory()[0].content_items[1] as { data: Buffer }).data,
      ),
    ).toBe(true);
    expect(expected[1].content_items).toEqual([
      { type: "text.done", text: "hello" },
    ]);

    const given: UniMessage[] = [
      userMessage("Hi"),
      {
        role: "assistant",
        content_items: [{ type: "text.done", text: "Hello!" }],
      },
    ];
    client.setHistory(given);
    (given[0].content_items[0] as { text: string }).text = "changed";
    given[1].content_items.length = 0;

    expect(client.getHistory()).toEqual([
      userMessage("Hi"),
      {
        role: "assistant",
        content_items: [{ type: "text.done", text: "Hello!" }],
      },
    ]);
  });

  test("a second stateful call while one is in flight raises ConcurrentCallError", async () => {
    const client = new ScriptedClient(reply);
    const first = client.streamingResponseStateful({
      message: userMessage("one"),
      config: {},
    });
    await first.next();

    const error = await client
      .streamingResponseStateful({ message: userMessage("two"), config: {} })
      .next()
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(ConcurrentCallError);
    expect(error).toMatchObject({
      client: "ScriptedClient",
      message:
        "ScriptedClient has a stateful call in flight; wait for its stop event or its error.",
    });
    expect(client.getHistory()).toEqual([]);
    expect(client.sentMessages).toHaveLength(1);
    // a stateless call keeps no history, so it runs beside a stateful one
    expect(
      await drain(
        client.streamingResponse({
          messages: [userMessage("aside")],
          config: {},
        }),
      ),
    ).not.toHaveLength(0);

    await drain(first);
    expect(
      client
        .getHistory()
        .map((entry) => (entry.content_items[0] as { text: string }).text),
    ).toEqual(["one", "hello"]);

    // the turn has ended at its stop event, before its generator is closed
    const second = client.streamingResponseStateful({
      message: userMessage("two"),
      config: {},
    });
    for (;;) {
      const { value } = await second.next();
      if (value.event_type === "stop") {
        break;
      }
    }
    const third = client.streamingResponseStateful({
      message: userMessage("three"),
      config: {},
    });
    await third.next();
    // closing the earlier generator late leaves the call in flight holding the client
    await second.return(undefined);
    await expect(
      client
        .streamingResponseStateful({ message: userMessage("four"), config: {} })
        .next(),
    ).rejects.toBeInstanceOf(ConcurrentCallError);
    await drain(third);

    expect(client.getHistory()).toHaveLength(6);
  });

  test.each<[string, number]>([
    ["mid-stream", 1],
    ["once the provider's stream ended, before the stop event", 2],
  ])(
    "an aborted stateful call releases the client at once and records nothing (aborted %s)",
    async (_name, reads) => {
      const client = new ScriptedClient(reply);
      const controller = new AbortController();
      const first = client.streamingResponseStateful({
        message: userMessage("one"),
        config: {},
        signal: controller.signal,
      });
      for (let read = 0; read < reads; read++) {
        await first.next();
      }

      // the playground's next turn: the abort, then at once the next stateful call
      controller.abort("replaced");
      await drain(
        client.streamingResponseStateful({
          message: userMessage("two"),
          config: {},
        }),
      );

      const error = await drain(first).catch((caught) => caught);
      expect(error).toBe("replaced");
      expect(
        client
          .getHistory()
          .map((entry) => (entry.content_items[0] as { text: string }).text),
      ).toEqual(["two", "hello"]);
    },
  );

  test("closing a stateful stream closes the client's stream before it returns", async () => {
    let closed = false;
    class TrackedClient extends ScriptedClient {
      async *_streamingResponseInternal(options: {
        messages: UniMessage[];
        config: UniConfig;
      }): AsyncGenerator<UniEvent> {
        try {
          yield* super._streamingResponseInternal(options);
        } finally {
          closed = true;
        }
      }
    }

    const stream = new TrackedClient(reply).streamingResponseStateful({
      message: userMessage("one"),
      config: {},
    });
    await stream.next();
    await stream.return(undefined);

    expect(closed).toBe(true);
  });

  test("a stateful call that fails releases the client", async () => {
    const client = new ScriptedClient([
      delta(withId("0", { type: "text.delta", text: "a" })),
      stop(USAGE, null),
    ]);

    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(
        drain(client.streamingResponseStateful({ message: USER, config: {} })),
      ).rejects.toBeInstanceOf(IncompleteStreamError);
    }
    expect(client.getHistory()).toEqual([]);
  });

  test("a stateful conversation continues the history it was given", async () => {
    const first = userMessage("Hi", { created_at: 1 });
    const answer: UniMessage = {
      role: "assistant",
      content_items: [{ type: "text.done", text: "Hello!" }],
      created_at: 2,
    };
    const client = new ScriptedClient(reply);
    client.setHistory([first, answer]);

    const turns: [UniMessage, UniMessage][] = [];
    for (const message of [userMessage("one"), userMessage("two")]) {
      const events = await drain(
        client.streamingResponseStateful({ message, config: {} }),
      );
      turns.push([message, client.concatUniEventsToUniMessage(events)]);
    }

    const [[one, replyOne], [two, replyTwo]] = turns;
    expect(client.getHistory()).toEqual([
      first,
      answer,
      one,
      replyOne,
      two,
      replyTwo,
    ]);
    // each request carried the whole history ahead of its message
    expect(client.sentMessages).toEqual([
      [first, answer, one],
      [first, answer, one, replyOne, two],
    ]);
  });

  test.each<[string, unknown[]]>([
    ["empty", []],
    [
      "empty once normalized",
      [
        {
          type: "partial_tool_call",
          name: "",
          arguments: "",
          tool_call_id: "",
        },
      ],
    ],
  ])(
    "a message without content items (%s) raises InvalidMessageError before anything is sent",
    async (_name, contentItems) => {
      const warn = jest
        .spyOn(process, "emitWarning")
        .mockImplementation(() => undefined);
      const client = new ScriptedClient(reply);
      const events: UniEvent[] = [];
      const run = async () => {
        for await (const event of client.streamingResponse({
          messages: [
            USER,
            {
              role: "assistant",
              content_items: contentItems,
            } as UniMessage,
          ],
          config: {},
        })) {
          events.push(event);
        }
      };

      const error = await run().catch((caught) => caught);
      warn.mockRestore();

      expect(error).toBeInstanceOf(InvalidMessageError);
      expect(error).toMatchObject({
        client: "ScriptedClient",
        messageIndex: 1,
        message: "message 1 has nothing ScriptedClient can send",
      });
      expect(events).toEqual([]);
      expect(client.sentMessages).toEqual([]);
    },
  );

  test("concatUniEventsToUniMessage keeps the done items and the stop event's metadata", async () => {
    const events = await collect(reply);
    const message = new ScriptedClient([]).concatUniEventsToUniMessage(events);
    expect(message).toMatchObject({
      role: "assistant",
      content_items: [{ type: "text.done", text: "hello" }],
      usage_metadata: USAGE,
      finish_reason: "stop",
    });
    expect(message.created_at).toBe(events[events.length - 1].created_at);
  });

  test("legacy content item types are converted before a request and in set history", async () => {
    const warn = jest
      .spyOn(process, "emitWarning")
      .mockImplementation(() => undefined);
    const legacy = {
      role: "user",
      content_items: [
        { type: "text", text: "hi" },
        { type: "tool_result", text: "22 C", tool_call_id: "call_1" },
        {
          type: "partial_tool_call",
          name: "",
          arguments: "",
          tool_call_id: "",
        },
      ],
    } as unknown as UniMessage;

    const client = new ScriptedClient(reply);
    for await (const event of client.streamingResponse({
      messages: [legacy],
      config: {},
    })) {
      void event;
    }
    expect(client.sentMessages[0][0].content_items).toEqual([
      { type: "text.done", text: "hi" },
      { type: "tool_result.done", text: "22 C", tool_call_id: "call_1" },
    ]);
    // the caller's message is left as it was
    expect((legacy.content_items[0] as { type: string }).type).toBe("text");

    client.setHistory([legacy]);
    expect(client.getHistory()[0].content_items[0].type).toBe("text.done");

    const current = [USER];
    expect(normalizeLegacyMessages(current)[0]).toBe(USER);
    warn.mockRestore();
  });
});
