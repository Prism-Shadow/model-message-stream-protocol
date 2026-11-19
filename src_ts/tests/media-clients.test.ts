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

// The image, speech and transcription clients against a local server: what each request carries and
// what its answer becomes.

import http from "http";
import net, { AddressInfo } from "net";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "@jest/globals";
import OpenAI from "openai";
import {
  AutoLLMClient,
  InvalidMessageError,
  ProviderStreamError,
  UnsupportedContentError,
  UnsupportedOperationError,
  UnsupportedParameterError,
} from "../src";
import { ContentItem, UniConfig, UniEvent, UniMessage } from "../src/types";
import { assertStreamGrammar } from "./streamGrammar";

const PNG = Buffer.concat([
  Buffer.from("\x89PNG\r\n\x1a\n", "latin1"),
  Buffer.alloc(24),
]);
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(24),
]);
const PCM = Buffer.from(
  Array.from({ length: 2048 }, (_, index) => index % 256),
);
const MP3 = Buffer.concat([Buffer.from("ID3", "latin1"), Buffer.alloc(61)]);

// Answers in the shape each live endpoint returned them (api_captures/*_images/), by model: OpenAI
// names the format of its PNGs, OpenRouter the type of each image, and TokenDance links each JPEG and
// names neither; the link is filled in with the local server's address.
const IMAGE_ANSWERS: Record<string, unknown> = {
  "gpt-image-2.5-flare": {
    created: 1793813590,
    background: "opaque",
    data: [{ b64_json: PNG.toString("base64"), generation_id: "cb66cd80" }],
    output_format: "png",
    quality: "low",
    size: "1024x1024",
    usage: {
      input_tokens: 18,
      input_tokens_details: { image_tokens: 0, text_tokens: 18 },
      output_tokens: 196,
      output_tokens_details: { image_tokens: 196, text_tokens: 0 },
      total_tokens: 214,
    },
  },
  "bytedance-seed/seedream-5-0-flash": {
    created: 1793813712,
    data: [{ b64_json: JPEG.toString("base64"), media_type: "image/jpeg" }],
    usage: {
      prompt_tokens: 15,
      completion_tokens: 4096,
      total_tokens: 4111,
      cost: 0.018,
    },
  },
  "seedream-5.0-lite": {
    model: "doubao-seedream-5-0-260128",
    created: 1793813961,
    data: [
      {
        url: "{origin}/storage/image.jpeg?X-Tos-Signature=abc",
        size: "2048x2048",
      },
    ],
    usage: { generated_images: 1, output_tokens: 16384, total_tokens: 16384 },
  },
  "expired-link": {
    data: [{ url: "{origin}/storage/expired.jpeg" }],
    usage: { generated_images: 1, output_tokens: 16384, total_tokens: 16384 },
  },
};

// The content type of each speech model's answer: OpenRouter's PCM, OpenAI's MP3, and a stereo PCM
const SPEECH_TYPES: Record<string, string> = {
  "fish-audio/drama-3": "audio/pcm;rate=44100;channels=1",
  "google/gemini-3.8-flash-tts": "audio/pcm;rate=24000;channels=1",
  "tts-1": "audio/mpeg",
  "stereo-pcm": "audio/pcm;rate=48000;channels=2",
};

// DeepSeek's speech names its PCM in full, and DeepSeek answers a refusal in OpenAI's error format
// (api_captures/deepseek_audio/)
const DEEPSEEK_PCM =
  "audio/pcm; rate=24000; encoding=signed-integer; bits=16; channels=1";
const OGG = Buffer.concat([Buffer.from("OggS", "latin1"), Buffer.alloc(60)]);
const FLAC = Buffer.concat([Buffer.from("fLaC", "latin1"), Buffer.alloc(60)]);

function deepseekRefusal(message: string): string {
  return JSON.stringify({
    error: {
      message,
      type: "invalid_request_error",
      param: null,
      code: "invalid_request_error",
    },
  });
}

interface Recorded {
  method: string;
  path: string;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}

// a file of a multipart form: its name, its type and its bytes
type FormFile = [string, string, Buffer];

const SIZE_TABLE: [string, string, string][] = [
  ["1:1", "1024x1024", "2048x2048"],
  ["2:3", "848x1264", "1696x2528"],
  ["3:2", "1264x848", "2528x1696"],
  ["3:4", "896x1200", "1792x2400"],
  ["4:3", "1200x896", "2400x1792"],
  ["9:16", "768x1376", "1536x2752"],
  ["16:9", "1376x768", "2752x1536"],
  ["21:9", "1584x672", "3168x1344"],
];

function text(content: string): UniMessage {
  return {
    role: "user",
    content_items: [{ type: "text.done", text: content }],
  };
}

function audio(data: Buffer, mimeType: string): UniMessage {
  return {
    role: "user",
    content_items: [{ type: "inline_data.done", data, mime_type: mimeType }],
  };
}

function done(events: UniEvent[], itemType: string): Record<string, unknown>[] {
  return events
    .flatMap((event) => event.content_items)
    .filter((item) => item.type === itemType) as unknown as Record<
    string,
    unknown
  >[];
}

function imageParams(config: UniConfig): unknown {
  const client = new AutoLLMClient({
    model: "gpt-image-2.5-flare",
    apiKey: "sk-PROBE",
  });
  return client.transformUniConfigToModelConfig(config);
}

describe("openai-image's size table", () => {
  test.each(SIZE_TABLE)(
    "%s is sent as the size of Gemini's table, within OpenAI's rules",
    (aspectRatio, size1k, size2k) => {
      for (const [resolution, size] of [
        ["1K", size1k],
        ["2K", size2k],
      ] as const) {
        expect(
          imageParams({
            image_config: {
              aspect_ratio: aspectRatio as "1:1",
              resolution,
            },
          }),
        ).toEqual({ model: "gpt-image-2.5-flare", size });
        const [width, height] = size.split("x").map(Number);
        expect(width % 16).toBe(0);
        expect(height % 16).toBe(0);
        expect(width * height).toBeGreaterThanOrEqual(655_360);
        expect(width * height).toBeLessThanOrEqual(8_294_400);
        expect(Math.max(width, height)).toBeLessThanOrEqual(3840);
        expect(
          Math.max(width, height) / Math.min(width, height),
        ).toBeLessThanOrEqual(3);
      }
      // an aspect ratio alone takes its 1K size
      expect(
        imageParams({ image_config: { aspect_ratio: aspectRatio as "1:1" } }),
      ).toEqual({ model: "gpt-image-2.5-flare", size: size1k });
    },
  );

  test("a resolution alone is square, and no image config sends no size", () => {
    expect(imageParams({ image_config: { resolution: "2K" } })).toEqual({
      model: "gpt-image-2.5-flare",
      size: "2048x2048",
    });
    expect(imageParams({})).toEqual({ model: "gpt-image-2.5-flare" });
    expect(imageParams({ image_config: {} })).toEqual({
      model: "gpt-image-2.5-flare",
    });
  });

  test("an image config outside the table is refused", () => {
    expect(() =>
      imageParams({
        image_config: { aspect_ratio: "5:4" as "1:1", resolution: "1K" },
      }),
    ).toThrow(UnsupportedParameterError);
  });
});

describe("media clients", () => {
  let server: http.Server;
  let origin: string;
  let requests: Recorded[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", async () => {
        const raw = Buffer.concat(chunks);
        const path = req.url ?? "";
        const record = (body: unknown) =>
          requests.push({
            method: req.method ?? "",
            path,
            headers: req.headers,
            body,
          });
        if (req.method === "GET") {
          record(null);
          if (path.startsWith("/storage/image.jpeg")) {
            res.writeHead(200, { "Content-Type": "image/jpeg" });
            res.end(JPEG);
          } else {
            res.writeHead(403, { "Content-Type": "application/xml" });
            res.end("<Error><Code>AccessDenied</Code></Error>");
          }
          return;
        }
        if (path === "/v1/audio/transcriptions" || path === "/v1/tools/asr") {
          const form = await new Response(raw, {
            headers: { "content-type": req.headers["content-type"] ?? "" },
          }).formData();
          const body: Record<string, string | FormFile> = {};
          for (const [name, value] of form.entries()) {
            body[name] =
              typeof value === "string"
                ? value
                : [
                    value.name,
                    value.type,
                    Buffer.from(await value.arrayBuffer()),
                  ];
          }
          record(body);
          if (path === "/v1/audio/transcriptions") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ text: "Hello.", usage: { seconds: 7.6 } }),
            );
          } else if (
            (body.file as FormFile)[2].subarray(0, 4).toString("latin1") ===
            "fLaC"
          ) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              deepseekRefusal(
                "Unsupported audio format: expected 16-bit PCM WAV or Ogg Opus, mono or stereo (request_id: 1)",
              ),
            );
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                request_id: "d53308ea",
                text: "Hello.",
                duration_ms: 5720,
              }),
            );
          }
          return;
        }

        const body = JSON.parse(raw.toString("utf8"));
        record(body);
        if (path === "/v1/images/generations") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify(IMAGE_ANSWERS[body.model])
              .split("{origin}")
              .join(origin),
          );
        } else if (path === "/v1/tools/tts" && body.voice_id === "Kore") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            deepseekRefusal(
              "Invalid voice_id 'Kore': supported values are 'stella' (default), 'tide' (request_id: 2)",
            ),
          );
        } else {
          // the audio arrives in pieces of an odd size, as DeepSeek's do, splitting 16-bit samples;
          // DeepSeek's speech takes no model, and the text "cut" answers PCM whose last frame is cut
          const deepseek = path === "/v1/tools/tts";
          const payload = deepseek
            ? body.text === "cut"
              ? PCM.subarray(0, PCM.length - 1)
              : PCM
            : body.model === "tts-1"
              ? MP3
              : PCM;
          res.writeHead(200, {
            "Content-Type": deepseek ? DEEPSEEK_PCM : SPEECH_TYPES[body.model],
          });
          for (let start = 0; start < payload.length; start += 333) {
            res.write(payload.subarray(start, start + 333));
            // a pause lets each piece reach the client by itself
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          res.end();
        }
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

  async function run(
    model: string,
    clientType: string,
    messages: UniMessage[],
    config: UniConfig,
    defaultHeaders?: Record<string, string>,
    baseUrl = `${origin}/v1`,
  ): Promise<UniEvent[]> {
    const client = new AutoLLMClient({
      model,
      clientType,
      apiKey: "sk-PROBE",
      baseUrl,
      defaultHeaders,
    });
    const events: UniEvent[] = [];
    for await (const event of client.streamingResponse({ messages, config })) {
      events.push(event);
    }
    assertStreamGrammar(events);
    return events;
  }

  async function refusal(
    model: string,
    clientType: string,
    messages: UniMessage[],
    config: UniConfig,
    baseUrl = `${origin}/v1`,
  ): Promise<unknown> {
    const client = new AutoLLMClient({
      model,
      clientType,
      apiKey: "sk-PROBE",
      baseUrl,
    });
    try {
      for await (const event of client.streamingResponse({
        messages,
        config,
      })) {
        void event;
      }
    } catch (error) {
      return error;
    }
    throw new Error("the stream did not raise");
  }

  test("an image request carries the model, the prompt and the size alone", async () => {
    const events = await run(
      "gpt-image-2.5-flare",
      "openai-official",
      [text("A red "), text("A paper boat")],
      {
        image_config: { aspect_ratio: "16:9", resolution: "2K" },
        thinking_level: "high" as UniConfig["thinking_level"],
        max_tokens: 10,
      },
    );

    // one request per message, with neither response_format nor stream
    expect(requests.map(({ path, body }) => [path, body])).toEqual([
      [
        "/v1/images/generations",
        { model: "gpt-image-2.5-flare", size: "2752x1536", prompt: "A red " },
      ],
      [
        "/v1/images/generations",
        {
          model: "gpt-image-2.5-flare",
          size: "2752x1536",
          prompt: "A paper boat",
        },
      ],
    ]);
    expect(requests[0].headers.authorization).toBe("Bearer sk-PROBE");
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual([
      [PNG, "image/png"],
      [PNG, "image/png"],
    ]);
    // OpenAI's input and output tokens, summed over the requests
    expect(events[events.length - 1].usage_metadata).toEqual({
      cached_tokens: null,
      prompt_tokens: 36,
      thoughts_tokens: null,
      response_tokens: 392,
    });
    expect(events[events.length - 1].finish_reason).toBe("stop");
  });

  test("an image takes its media_type, and OpenRouter's prompt and completion tokens", async () => {
    const events = await run(
      "bytedance-seed/seedream-5-0-flash",
      "openai-image",
      [text("A boat")],
      {},
    );

    expect(requests[0].body).not.toHaveProperty("size");
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual([[JPEG, "image/jpeg"]]);
    const usage = events[events.length - 1].usage_metadata!;
    expect([usage.prompt_tokens, usage.response_tokens]).toEqual([15, 4096]);
  });

  test("a linked image is downloaded without any credential and typed by its bytes", async () => {
    const events = await run(
      "seedream-5.0-lite",
      "openai-image",
      [text("A boat")],
      { image_config: { resolution: "2K" } },
      { "X-Gateway-Probe": "secret" },
    );

    const [post, download] = requests;
    expect([
      post.headers.authorization,
      post.headers["x-gateway-probe"],
    ]).toEqual(["Bearer sk-PROBE", "secret"]);
    expect([download.method, download.path]).toEqual([
      "GET",
      "/storage/image.jpeg?X-Tos-Signature=abc",
    ]);
    // neither the key nor the default headers nor anything of OpenAI's go with the download
    for (const name of [
      "authorization",
      "x-gateway-probe",
      "openai-organization",
      "openai-project",
    ]) {
      expect(download.headers).not.toHaveProperty(name);
    }
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual([[JPEG, "image/jpeg"]]);
    // TokenDance reports its output tokens alone
    const usage = events[events.length - 1].usage_metadata!;
    expect([usage.prompt_tokens, usage.response_tokens]).toEqual([null, 16384]);
  });

  test("a link that cannot be downloaded raises with its status", async () => {
    const error = await refusal(
      "expired-link",
      "openai-image",
      [text("A boat")],
      {},
    );

    expect(error).toBeInstanceOf(ProviderStreamError);
    expect((error as ProviderStreamError).code).toBe(403);
  });

  test("a voice is sent only from one speaker", () => {
    const client = new AutoLLMClient({
      model: "fish-audio/drama-3",
      clientType: "openai-speech",
      apiKey: "sk-PROBE",
    });

    expect(
      client.transformUniConfigToModelConfig({
        tts_config: [{ voice: "Adrian" }],
      }),
    ).toEqual({
      model: "fish-audio/drama-3",
      voice: "Adrian",
    });
    expect(() =>
      client.transformUniConfigToModelConfig({
        tts_config: [
          { voice: "Adrian", speaker: "A" },
          { voice: "Delia", speaker: "B" },
        ],
      }),
    ).toThrow(UnsupportedParameterError);
  });

  test("speech streams its PCM as one item per message and counts the input's bytes", async () => {
    const texts = ["Héllo, wörld.", "你好，世界。"];
    const events = await run(
      "fish-audio/drama-3",
      "openai-speech",
      texts.map(text),
      {},
    );

    // no voice without tts_config, and the endpoint's default format
    expect(requests.map(({ body }) => body)).toEqual(
      texts.map((input) => ({ model: "fish-audio/drama-3", input })),
    );
    expect(requests[0].headers.authorization).toBe("Bearer sk-PROBE");
    const deltas = done(events, "inline_data.delta");
    expect(deltas.length).toBeGreaterThanOrEqual(2);
    expect(new Set(deltas.map((delta) => delta.mime_type))).toEqual(
      new Set(["audio/l16; rate=44100; channels=1"]),
    );
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual([
      [PCM, "audio/l16; rate=44100; channels=1"],
      [PCM, "audio/l16; rate=44100; channels=1"],
    ]);
    // 15 + 18 UTF-8 bytes, as Fish Audio bills them
    expect(events[events.length - 1].usage_metadata).toEqual({
      cached_tokens: null,
      prompt_tokens: 33,
      thoughts_tokens: null,
      response_tokens: 0,
    });
  });

  test.each([
    ["fish-audio/drama-3", "openai-speech", "/v1", 2],
    ["stereo-pcm", "openai-speech", "/v1", 4],
    ["deepseek-tts", "deepseek-official", "", 2],
  ] as const)(
    "%s sends PCM in whole frames whatever the chunks split",
    async (model, clientType, basePath, frameSize) => {
      const events = await run(
        model,
        clientType,
        [text("Hi")],
        {},
        undefined,
        `${origin}${basePath}`,
      );

      // the endpoint's 333-byte pieces split samples; every fragment holds whole frames, so it plays alone
      const deltas = done(events, "inline_data.delta");
      expect(deltas.length).toBeGreaterThanOrEqual(2);
      expect(
        deltas.every(
          (delta) => (delta.data as Buffer).length % frameSize === 0,
        ),
      ).toBe(true);
      expect(
        Buffer.concat(deltas.map((delta) => delta.data as Buffer)),
      ).toEqual(PCM);
    },
  );

  test("speech sends the bytes of a cut last frame as the last fragment", async () => {
    const events = await run(
      "deepseek-tts",
      "deepseek-official",
      [text("cut")],
      {},
      undefined,
      origin,
    );

    const deltas = done(events, "inline_data.delta");
    expect(
      deltas
        .slice(0, -1)
        .every((delta) => (delta.data as Buffer).length % 2 === 0),
    ).toBe(true);
    expect((deltas[deltas.length - 1].data as Buffer).length % 2).toBe(1);
    expect(done(events, "inline_data.done").map((item) => item.data)).toEqual([
      PCM.subarray(0, PCM.length - 1),
    ]);
  });

  test.each([
    ["fish-audio/drama-3", "openai-speech"],
    ["deepseek-tts", undefined],
  ] as const)(
    "%s turns a chunk with no whole frame into the empty delta event",
    (model, clientType) => {
      const client = new AutoLLMClient({
        model,
        clientType,
        apiKey: "sk-PROBE",
      });

      const event = client.transformModelOutputToUniEvent([
        0,
        "audio/pcm;rate=24000;channels=1",
        Buffer.alloc(0),
      ]);

      expect(event.content_items).toEqual([]);
      expect(event.event_type).toBe("delta");
    },
  );

  test("speech in another format keeps its content type and sends the voice", async () => {
    const events = await run("tts-1", "openai-speech", [text("Hi")], {
      tts_config: [{ voice: "alloy" }],
    });

    expect(requests[0].body).toEqual({
      model: "tts-1",
      input: "Hi",
      voice: "alloy",
    });
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual([[MP3, "audio/mpeg"]]);
  });

  test("Gemini speech on an OpenAI-compatible endpoint defaults its voice to Kore", async () => {
    await run(
      "google/gemini-3.8-flash-tts",
      "openai-speech",
      [text("Hi")],
      {},
    );
    await run(
      "google/gemini-3.8-flash-tts",
      "openai-speech",
      [text("Hi")],
      { tts_config: [{ voice: "Puck" }] },
    );

    expect(requests.map(({ body }) => body)).toEqual([
      { model: "google/gemini-3.8-flash-tts", input: "Hi", voice: "Kore" },
      { model: "google/gemini-3.8-flash-tts", input: "Hi", voice: "Puck" },
    ]);
  });

  test.each([
    ["fish-audio/drama-3", "openai-speech", "/v1"],
    ["deepseek-tts", "deepseek-official", ""],
  ] as const)(
    "%s raises on an answer cut off mid-way and never stops",
    async (model, clientType, basePath) => {
      // a chunked answer that breaks off before its last chunk, as DeepSeek's does when synthesis
      // fails after the audio has begun: "请把提前结束的响应视为失败"
      const cut = net.createServer((socket) => {
        let request = Buffer.alloc(0);
        socket.on("data", (data: Buffer) => {
          request = Buffer.concat([request, data]);
          const end = request.indexOf("\r\n\r\n");
          const length = /content-length: *(\d+)/i.exec(
            request.toString("latin1"),
          );
          if (
            end < 0 ||
            !length ||
            request.length < end + 4 + Number(length[1])
          ) {
            return;
          }
          socket.write(
            Buffer.concat([
              Buffer.from(
                "HTTP/1.1 200 OK\r\nContent-Type: audio/pcm; rate=24000; channels=1\r\n" +
                  "Transfer-Encoding: chunked\r\n\r\n200\r\n",
                "latin1",
              ),
              PCM.subarray(0, 512),
              Buffer.from("\r\n", "latin1"),
            ]),
          );
          socket.destroy();
        });
      });
      await new Promise<void>((resolve) => cut.listen(0, "127.0.0.1", resolve));
      const port = (cut.address() as AddressInfo).port;
      const client = new AutoLLMClient({
        model,
        clientType,
        apiKey: "sk-PROBE",
        baseUrl: `http://127.0.0.1:${port}${basePath}`,
      });

      const events: UniEvent[] = [];
      let caught: unknown;
      try {
        for await (const event of client.streamingResponse({
          messages: [text("Hi")],
          config: {},
        })) {
          events.push(event);
        }
      } catch (error) {
        caught = error;
      } finally {
        await new Promise<void>((resolve) => cut.close(() => resolve()));
      }

      // undici's error, from another realm than Jest's Error
      expect(String(caught)).toContain("terminated");
      expect(done(events, "inline_data.delta").length).toBeGreaterThan(0);
      expect(events.every((event) => event.event_type === "delta")).toBe(true);
    },
  );

  test.each(
    [
      ["fish-audio/drama-3", "openai-speech", "/v1"],
      ["deepseek-tts", "deepseek-speech", ""],
    ].flatMap(([model, clientType, basePath]) =>
      ["return", "abort"].map((stop) => [clientType, stop, model, basePath]),
    ),
  )(
    "stopping a stream of %s (%s) closes its connection",
    async (clientType, stop, model, basePath) => {
      let markClosed = () => {};
      const closed = new Promise<void>((resolve) => (markClosed = resolve));
      const speaking = http.createServer((req, res) => {
        req.resume();
        req.on("end", () => {
          res.writeHead(200, {
            "Content-Type": "audio/pcm;rate=44100;channels=1",
          });
          // the endpoint is still speaking: nothing more arrives until the client closes the connection
          res.write(PCM);
        });
        res.on("close", () => markClosed());
      });
      await new Promise<void>((resolve) => {
        speaking.listen(0, "127.0.0.1", resolve);
      });
      try {
        const controller = new AbortController();
        const client = new AutoLLMClient({
          model,
          clientType,
          apiKey: "sk-PROBE",
          baseUrl: `http://127.0.0.1:${(speaking.address() as AddressInfo).port}${basePath}`,
        });
        const stream = client.streamingResponse({
          messages: [text("Count to a thousand.")],
          config: {},
          signal: controller.signal,
        });
        const first = await stream.next();
        expect(first.value?.content_items[0].type).toBe("inline_data.delta");

        if (stop === "return") {
          await stream.return(undefined);
        } else {
          const reading = stream.next();
          await new Promise((resolve) => setTimeout(resolve, 50));
          controller.abort("stop");
          await expect(reading).rejects.toBeDefined();
        }
        await Promise.race([
          closed,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("the connection stayed open")),
              500,
            ),
          ),
        ]);
      } finally {
        speaking.closeAllConnections();
        await new Promise<void>((resolve) => {
          speaking.close(() => resolve());
        });
      }
    },
  );

  test("a transcription uploads the audio as it is and counts its seconds rounded up", async () => {
    const events = await run(
      "fish-audio/transcribe-1",
      "openai-transcription",
      [audio(MP3, "audio/mpeg"), audio(MP3, "audio/mpeg")],
      {},
    );

    expect(requests[0].headers.authorization).toBe("Bearer sk-PROBE");
    expect(requests[0].headers["content-type"]).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    // the model and the file, and no prompt
    expect(requests[0].body).toEqual({
      model: "fish-audio/transcribe-1",
      file: ["audio.mp3", "audio/mpeg", MP3],
    });
    expect(done(events, "text.done").map((item) => item.text)).toEqual([
      "Hello.",
      "Hello.",
    ]);
    expect(events[events.length - 1].usage_metadata).toEqual({
      cached_tokens: null,
      prompt_tokens: 16,
      thoughts_tokens: null,
      response_tokens: 0,
    });
  });

  test.each([
    "audio/l16; rate=24000; channels=1",
    "audio/pcm;rate=24000;channels=2",
  ])(
    "headerless PCM (%s) is uploaded as WAV of its rate and channels",
    async (mimeType) => {
      await run(
        "fish-audio/transcribe-1",
        "openai-transcription",
        [audio(PCM, mimeType)],
        {},
      );

      const [name, contentType, data] = (
        requests[0].body as Record<string, FormFile>
      ).file;
      expect([name, contentType]).toEqual(["audio.wav", "audio/wav"]);
      const channels = mimeType.includes("channels=2") ? 2 : 1;
      expect(data.subarray(0, 4).toString("latin1")).toBe("RIFF");
      expect(data.subarray(8, 12).toString("latin1")).toBe("WAVE");
      expect(data.readUInt16LE(20)).toBe(1);
      expect(data.readUInt16LE(22)).toBe(channels);
      expect(data.readUInt32LE(24)).toBe(24000);
      expect(data.readUInt16LE(34)).toBe(16);
      expect(data.readUInt32LE(40)).toBe(PCM.length);
      expect(data.subarray(44)).toEqual(PCM);
    },
  );

  test.each<[string, ContentItem[], new (...args: never[]) => Error]>([
    [
      "pcm-without-rate",
      [{ type: "inline_data.done", data: PCM, mime_type: "audio/l16" }],
      InvalidMessageError,
    ],
    [
      "two-audio-items",
      [
        { type: "inline_data.done", data: MP3, mime_type: "audio/mpeg" },
        { type: "inline_data.done", data: MP3, mime_type: "audio/mpeg" },
      ],
      InvalidMessageError,
    ],
    [
      "text-beside-audio",
      [
        { type: "inline_data.done", data: MP3, mime_type: "audio/mpeg" },
        { type: "text.done", text: "Transcribe this." },
      ],
      UnsupportedContentError,
    ],
    [
      "image-inline-data",
      [{ type: "inline_data.done", data: PNG, mime_type: "image/png" }],
      UnsupportedContentError,
    ],
    [
      "image-url",
      [{ type: "image_url.done", image_url: "https://example.com/a.png" }],
      UnsupportedContentError,
    ],
  ])(
    "a transcription refuses a message that is not one audio item (%s)",
    async (_name, contentItems, errorClass) => {
      for (const [model, clientType] of [
        ["fish-audio/transcribe-1", "openai-transcription"],
        ["deepseek-asr", "deepseek-transcription"],
      ]) {
        const error = await refusal(
          model,
          clientType,
          [{ role: "user", content_items: contentItems }],
          {},
        );

        expect(error).toBeInstanceOf(errorClass);
      }
      expect(requests).toEqual([]);
    },
  );

  test("deepseek-speech asks for PCM and sends a voice only from one speaker", () => {
    const client = new AutoLLMClient({
      model: "deepseek-tts",
      apiKey: "sk-PROBE",
    });

    expect(
      client.transformUniConfigToModelConfig({
        thinking_level: "high" as UniConfig["thinking_level"],
        max_tokens: 10,
      }),
    ).toEqual({ format: "pcm" });
    expect(
      client.transformUniConfigToModelConfig({
        tts_config: [{ voice: "tide" }],
      }),
    ).toEqual({ format: "pcm", voice_id: "tide" });
    expect(() =>
      client.transformUniConfigToModelConfig({
        tts_config: [
          { voice: "stella", speaker: "A" },
          { voice: "tide", speaker: "B" },
        ],
      }),
    ).toThrow(UnsupportedParameterError);
  });

  test("deepseek-speech streams its PCM as one item per message and counts the characters billed", async () => {
    // a Han character outside the Basic Multilingual Plane, two inside it, a space and a
    // compatibility ideograph, escaped so that no editor normalizes the last one away
    const texts = [
      "Hello, world.",
      "\u{4f60}\u{597d}\u{ff0c}\u{4e16}\u{754c}\u{3002}",
      "\u{20bb7}\u{91ce}\u{5bb6} \u{f900}",
    ];
    const events = await run(
      "deepseek-tts",
      "deepseek-official",
      texts.map(text),
      {},
      undefined,
      origin,
    );

    // the text and the format alone: no voice without tts_config, no model, no filter_markdown
    expect(requests.map(({ path, body }) => [path, body])).toEqual(
      texts.map((input) => ["/v1/tools/tts", { text: input, format: "pcm" }]),
    );
    expect(requests[0].headers.authorization).toBe("Bearer sk-PROBE");
    const deltas = done(events, "inline_data.delta");
    expect(deltas.length).toBeGreaterThanOrEqual(3);
    expect(new Set(deltas.map((delta) => delta.mime_type))).toEqual(
      new Set(["audio/l16; rate=24000; channels=1"]),
    );
    expect(
      done(events, "inline_data.done").map((item) => [
        item.data,
        item.mime_type,
      ]),
    ).toEqual(texts.map(() => [PCM, "audio/l16; rate=24000; channels=1"]));
    // 13 characters, then 4 Han characters and 2 others, then 4 Han characters and a space
    expect(events[events.length - 1].usage_metadata).toEqual({
      cached_tokens: null,
      prompt_tokens: 13 + 10 + 9,
      thoughts_tokens: null,
      response_tokens: 0,
    });
    expect(events[events.length - 1].finish_reason).toBe("stop");
  });

  test("deepseek-speech refuses a message with no text before any request", async () => {
    const error = await refusal(
      "deepseek-tts",
      "deepseek-speech",
      [text("Hi"), text("")],
      {},
      origin,
    );

    expect(error).toBeInstanceOf(InvalidMessageError);
    expect((error as InvalidMessageError).messageIndex).toBe(1);
    expect(requests).toEqual([]);
  });

  test.each([
    [DEEPSEEK_PCM, "audio/l16; rate=24000; channels=1"],
    ["Audio/PCM;channels=2;rate=16000", "audio/l16; rate=16000; channels=2"],
    ["audio/wav", "audio/wav"],
  ])("deepseek-speech names %s as %s", (contentType, mimeType) => {
    const client = new AutoLLMClient({
      model: "deepseek-tts",
      apiKey: "sk-PROBE",
    });

    expect(
      client.transformModelOutputToUniEvent([
        1,
        contentType,
        Buffer.from([0, 1]),
      ]).content_items,
    ).toEqual([
      {
        type: "inline_data.delta",
        data: Buffer.from([0, 1]),
        mime_type: mimeType,
        fidelity: { item_id: "1" },
      },
    ]);
  });

  test("deepseek-transcription uploads the file alone and counts its seconds rounded up", async () => {
    const events = await run(
      "deepseek-asr",
      "deepseek-official",
      [
        audio(OGG, "audio/ogg"),
        audio(PCM, "audio/l16; rate=24000; channels=1"),
      ],
      { thinking_level: "high" as UniConfig["thinking_level"] },
      undefined,
      origin,
    );

    const [first, second] = requests;
    expect([first.path, first.headers.authorization]).toEqual([
      "/v1/tools/asr",
      "Bearer sk-PROBE",
    ]);
    expect(first.headers["content-type"]).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    // the file alone, sent as it is: no model and no prompt
    expect(first.body).toEqual({ file: ["audio.ogg", "audio/ogg", OGG] });
    // headerless PCM goes as WAV of its rate and channels
    const form = second.body as Record<string, FormFile>;
    expect(Object.keys(form)).toEqual(["file"]);
    const [name, contentType, data] = form.file;
    expect([name, contentType]).toEqual(["audio.wav", "audio/wav"]);
    expect(data.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(data.readUInt16LE(22)).toBe(1);
    expect(data.readUInt32LE(24)).toBe(24000);
    expect(data.readUInt16LE(34)).toBe(16);
    expect(data.subarray(44)).toEqual(PCM);
    expect(done(events, "text.done").map((item) => item.text)).toEqual([
      "Hello.",
      "Hello.",
    ]);
    // 5,720 ms is billed as 6 seconds, for each request
    expect(events[events.length - 1].usage_metadata).toEqual({
      cached_tokens: null,
      prompt_tokens: 12,
      thoughts_tokens: null,
      response_tokens: 0,
    });
    expect(events[events.length - 1].finish_reason).toBe("stop");
  });

  test("a refusal of DeepSeek's is the SDK's error with DeepSeek's message", async () => {
    const speechError = await refusal(
      "deepseek-tts",
      "deepseek-speech",
      [text("Hi")],
      { tts_config: [{ voice: "Kore" }] },
      origin,
    );
    expect(speechError).toBeInstanceOf(OpenAI.BadRequestError);
    expect((speechError as { status: number }).status).toBe(400);
    expect((speechError as Error).message).toContain("Invalid voice_id 'Kore'");

    const transcriptionError = await refusal(
      "deepseek-asr",
      "deepseek-transcription",
      [audio(FLAC, "audio/flac")],
      {},
      origin,
    );
    expect(transcriptionError).toBeInstanceOf(OpenAI.BadRequestError);
    expect((transcriptionError as Error).message).toContain(
      "Unsupported audio format",
    );
  });

  test.each([
    ["deepseek-tts", undefined],
    ["deepseek-tts", "deepseek-speech"],
    ["deepseek-asr", undefined],
    ["deepseek-asr", "deepseek-transcription"],
  ])("%s with client type %s lists no models", async (model, clientType) => {
    const client = new AutoLLMClient({
      model,
      clientType,
      apiKey: "sk-PROBE",
      baseUrl: origin,
    });

    await expect(client.listModels()).rejects.toBeInstanceOf(
      UnsupportedOperationError,
    );
    expect(requests).toEqual([]);
  });

  test.each([
    ["gpt-image-2.5-flare", "openai-image"],
    ["fish-audio/drama-3", "openai-speech"],
    ["fish-audio/transcribe-1", "openai-transcription"],
    ["deepseek-tts", "deepseek-speech"],
    ["deepseek-asr", "deepseek-transcription"],
  ])(
    "%s refuses fast mode and what it cannot send before any request",
    async (model, clientType) => {
      const image: UniMessage = {
        role: "user",
        content_items: [
          { type: "image_url.done", image_url: "https://example.com/a.png" },
        ],
      };

      expect(await refusal(model, clientType, [image], {})).toBeInstanceOf(
        UnsupportedContentError,
      );
      expect(
        await refusal(model, clientType, [text("x")], { fast_mode: true }),
      ).toBeInstanceOf(UnsupportedParameterError);
      expect(requests).toEqual([]);
    },
  );
});
