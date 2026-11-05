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
  InvalidMessageError,
  ProviderStreamError,
  UnsupportedContentError,
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

// The content type of each speech model's answer: OpenRouter's PCM, and OpenAI's MP3
const SPEECH_TYPES: Record<string, string> = {
  "fish-audio/drama-3": "audio/pcm;rate=44100;channels=1",
  "tts-1": "audio/mpeg",
};

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
      for (const [imageSize, size] of [
        ["1K", size1k],
        ["2K", size2k],
      ] as const) {
        expect(
          imageParams({
            image_config: {
              aspect_ratio: aspectRatio as "1:1",
              image_size: imageSize,
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

  test("an image size alone is square, and no image config sends no size", () => {
    expect(imageParams({ image_config: { image_size: "2K" } })).toEqual({
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
        image_config: { aspect_ratio: "5:4" as "1:1", image_size: "1K" },
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
        if (path === "/v1/audio/transcriptions") {
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
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ text: "Hello.", usage: { seconds: 7.6 } }));
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
        } else {
          // the audio arrives in pieces, as the endpoint makes it
          const payload = body.model === "fish-audio/drama-3" ? PCM : MP3;
          res.writeHead(200, { "Content-Type": SPEECH_TYPES[body.model] });
          for (let start = 0; start < payload.length; start += 500) {
            res.write(payload.subarray(start, start + 500));
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
  ): Promise<UniEvent[]> {
    const client = new AutoLLMClient({
      model,
      clientType,
      apiKey: "sk-PROBE",
      baseUrl: `${origin}/v1`,
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
  ): Promise<unknown> {
    const client = new AutoLLMClient({
      model,
      clientType,
      apiKey: "sk-PROBE",
      baseUrl: `${origin}/v1`,
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
        image_config: { aspect_ratio: "16:9", image_size: "2K" },
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
      { image_config: { image_size: "2K" } },
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

  test.each(["return", "abort"])(
    "stopping a speech stream (%s) closes its connection",
    async (stop) => {
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
          model: "fish-audio/drama-3",
          clientType: "openai-speech",
          apiKey: "sk-PROBE",
          baseUrl: `http://127.0.0.1:${(speaking.address() as AddressInfo).port}/v1`,
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
      const error = await refusal(
        "fish-audio/transcribe-1",
        "openai-transcription",
        [{ role: "user", content_items: contentItems }],
        {},
      );

      expect(error).toBeInstanceOf(errorClass);
      expect(requests).toEqual([]);
    },
  );

  test.each([
    ["gpt-image-2.5-flare", "openai-image"],
    ["fish-audio/drama-3", "openai-speech"],
    ["fish-audio/transcribe-1", "openai-transcription"],
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
