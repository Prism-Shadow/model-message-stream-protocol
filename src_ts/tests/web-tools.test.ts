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

// The web tool clients against a local server: what each request carries and what its answer becomes.

import http from "http";
import { AddressInfo } from "net";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import {
  AutoLLMClient,
  UnsupportedContentError,
  UnsupportedOperationError,
  UnsupportedParameterError,
} from "../src";
import { UniConfig, UniEvent, UniMessage, WebData } from "../src/types";
import { assertStreamGrammar } from "./streamGrammar";

// Answers in the shape the live endpoints returned them (api_captures/webtool/), trimmed to one page.
const ANSWERS: Record<string, unknown> = {
  "/v1/tools/search": {
    results: [
      {
        rerank_score: 2.4,
        title: "DeepSeek V4",
        url: "https://example.com/v4",
        snippet: "A short snippet.",
        summary: "The long summary.",
        content: "",
        site_name: null,
        site_icon: null,
        date: null,
        authority: 3,
      },
    ],
  },
  "/v1/tools/fetch": { title: "Example Domain", content: "# Example Domain" },
  "/search": {
    code: 200,
    status: 20000,
    data: [
      {
        title: "Jina",
        url: "https://jina.ai/",
        description: "A description.",
        content: "",
        usage: { tokens: 10000 },
      },
    ],
    meta: { usage: { tokens: 10000 } },
  },
  "/": {
    code: 200,
    status: 20000,
    data: {
      title: "Example Domain",
      description: "",
      url: "https://example.com/",
      content: "This domain is for use in examples.",
      usage: { tokens: 28 },
    },
    meta: { usage: { tokens: 28 } },
  },
};

interface Recorded {
  path: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}

describe("web tools", () => {
  let server: http.Server;
  let origin: string;
  let requests: Recorded[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const path = req.url ?? "";
        requests.push({ path, headers: req.headers, body: JSON.parse(raw) });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(ANSWERS[path]));
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
    requests = [];
  });

  function text(content: string): UniMessage {
    return {
      role: "user",
      content_items: [{ type: "text.done", text: content }],
    };
  }

  async function run(
    model: string,
    messages: UniMessage[],
    config: UniConfig,
  ): Promise<UniEvent[]> {
    const client = new AutoLLMClient({
      model,
      apiKey: "sk-PROBE",
      baseUrl: origin,
    });
    const events: UniEvent[] = [];
    for await (const event of client.streamingResponse({ messages, config })) {
      events.push(event);
    }
    assertStreamGrammar(events);
    return events;
  }

  function webdata(events: UniEvent[]): WebData[][] {
    return events
      .flatMap((event) => event.content_items)
      .flatMap((item) => (item.type === "webtool.done" ? [item.webdata] : []));
  }

  test("a DeepSeek search sends one request per message and reads each result's summary", async () => {
    const events = await run(
      "deepseek-search",
      [text("DeepSeek V4"), text("MMSP")],
      { webtool_config: { count: 3 } },
    );

    expect(requests.map(({ path, body }) => [path, body])).toEqual([
      ["/v1/tools/search", { query: "DeepSeek V4", count: 3 }],
      ["/v1/tools/search", { query: "MMSP", count: 3 }],
    ]);
    expect(requests[0].headers.authorization).toBe("Bearer sk-PROBE");
    const page = {
      title: "DeepSeek V4",
      content: "The long summary.",
      url: "https://example.com/v4",
    };
    expect(webdata(events)).toEqual([[page], [page]]);
    // DeepSeek bills each request
    expect(events[events.length - 1].usage_metadata?.prompt_tokens).toBe(2);
    expect(events[events.length - 1].finish_reason).toBe("stop");
  });

  test("a DeepSeek fetch sends the URL alone, and the page takes the URL sent", async () => {
    const events = await run("deepseek-fetch", [text("https://example.com")], {
      webtool_config: { count: 3 },
    });

    expect(requests.map(({ path, body }) => [path, body])).toEqual([
      ["/v1/tools/fetch", { url: "https://example.com" }],
    ]);
    expect(webdata(events)).toEqual([
      [
        {
          title: "Example Domain",
          content: "# Example Domain",
          url: "https://example.com",
        },
      ],
    ]);
    expect(events[events.length - 1].usage_metadata?.prompt_tokens).toBe(1);
  });

  test("a Jina search asks for the descriptions only and counts the tokens Jina bills", async () => {
    const events = await run("jina-search", [text("Jina"), text("Reader")], {
      webtool_config: { count: 5 },
    });

    expect(requests.map(({ path, body }) => [path, body])).toEqual([
      ["/search", { q: "Jina", num: 5 }],
      ["/search", { q: "Reader", num: 5 }],
    ]);
    const { headers } = requests[0];
    expect([headers["x-respond-with"], headers.accept]).toEqual([
      "no-content",
      "application/json",
    ]);
    const page = {
      title: "Jina",
      content: "A description.",
      url: "https://jina.ai/",
    };
    expect(webdata(events)).toEqual([[page], [page]]);
    expect(events[events.length - 1].usage_metadata?.prompt_tokens).toBe(20000);
  });

  test("a Jina fetch reads the page with its body", async () => {
    const events = await run("jina-fetch", [text("https://example.com")], {});

    expect(requests.map(({ path, body }) => [path, body])).toEqual([
      ["/", { url: "https://example.com" }],
    ]);
    expect(requests[0].headers["x-respond-with"]).toBeUndefined();
    expect(webdata(events)).toEqual([
      [
        {
          title: "Example Domain",
          content: "This domain is for use in examples.",
          url: "https://example.com/",
        },
      ],
    ]);
    expect(events[events.length - 1].usage_metadata?.prompt_tokens).toBe(28);
  });

  test.each(["deepseek-search", "jina-fetch"])(
    "%s refuses what it cannot send before any request",
    async (model) => {
      const client = new AutoLLMClient({
        model,
        apiKey: "sk-PROBE",
        baseUrl: origin,
      });
      const image: UniMessage = {
        role: "user",
        content_items: [
          { type: "image_url.done", image_url: "https://example.com/a.png" },
        ],
      };
      async function drain(messages: UniMessage[], config: UniConfig) {
        for await (const event of client.streamingResponse({
          messages,
          config,
        })) {
          void event;
        }
      }

      await expect(drain([image], {})).rejects.toBeInstanceOf(
        UnsupportedContentError,
      );
      await expect(
        drain([text("x")], { fast_mode: true }),
      ).rejects.toBeInstanceOf(UnsupportedParameterError);
      await expect(client.listModels()).rejects.toBeInstanceOf(
        UnsupportedOperationError,
      );
      expect(requests).toEqual([]);
    },
  );

  test.each(["deepseek-webtool", "jina-webtool"])(
    "%s refuses an id that names neither a search nor a fetch",
    (clientType) => {
      expect(
        () =>
          new AutoLLMClient({
            model: "web-reader",
            clientType,
            apiKey: "sk-PROBE",
          }),
      ).toThrow(UnsupportedOperationError);
    },
  );
});
