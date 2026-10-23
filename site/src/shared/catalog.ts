// The model catalog: every entry of the SDK's registry (src_ts/src/registry.ts, read as the site
// is built) with the provider that serves it, the vendor that made it, the key it needs, its status
// key and its integration kit. The kit is the README's quickstart written for the entry: the
// constructor call the registry test makes, then one request whose answer the program prints, so
// the page cannot offer code the SDK does not run.
import { listSupportedModels, type SupportedModel } from "../../../src_ts/src/registry.ts";
import credentialsSource from "../../../src_ts/src/credentials.ts?raw";
import { providerOf, vendorOf, type Provider, type Vendor } from "./providers";
import type { Locale } from "./i18n";

export { STATUS_DATA_URL } from "./status";
export { PROVIDERS, providerOf, vendorOf, type Provider, type Vendor } from "./providers";

type Text = Record<Locale, string>;

export function statusKey(entry: Pick<SupportedModel, "model" | "base_url" | "client">): string {
  return `${entry.client}|${entry.base_url}|${entry.model}`;
}

// MODEL_FAMILIES of credentials.ts, read as text: importing the SDK would pull every provider
// SDK into the site build. A family routes a model id to its official client without a client type.
const familySource = credentialsSource.slice(credentialsSource.indexOf("export const MODEL_FAMILIES")).split("];")[0];
const FAMILIES = [...familySource.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)].map((match) => [match[1], match[2]] as const);
if (FAMILIES.length === 0) throw new Error("site/src/shared/catalog.ts found no MODEL_FAMILIES in src_ts/src/credentials.ts");

function familyClient(model: string): string | null {
  const lowered = model.toLowerCase();
  return FAMILIES.find(([prefix]) => lowered.startsWith(prefix))?.[1] ?? null;
}

export interface ServerRow {
  model_id: string;
  base_url?: string;
  api_key: string;
  server_model_id: string;
  client_type?: string;
}

export interface Kit {
  // a complete program, saved as main.ts
  typescript: string;
  // a complete program, saved as main.py
  python: string;
  server: ServerRow;
  // the body of a POST /v1/stream that asks the server's row what the programs ask
  request: Record<string, unknown>;
  keyEnv: string;
  // what to export in the key variable: a token, the service-account JSON, ACCESS,SECRET
  keyValue: string;
  keyHint?: Text;
}

// what a program asks a model of each output kind, and how it shows the answer: text as it
// streams, an embedding by its size, an image or speech as the file it writes
type Kind = "text" | "embed" | "image" | "audio";

const ASK: Record<Kind, { prompt: string; config: Record<string, unknown> }> = {
  text: { prompt: "Say 'Hello, World!'", config: {} },
  embed: { prompt: "Hello, World!", config: {} },
  image: { prompt: "A lighthouse at dusk, in watercolor", config: { image_config: { aspect_ratio: "1:1", image_size: "1K" } } },
  audio: { prompt: "Hello, World!", config: {} },
};

// a value as TypeScript writes it, { a: ["b"] }, or as JSON and Python write it, {"a": ["b"]}
export function literal(value: unknown, style: "ts" | "json"): string {
  if (Array.isArray(value)) return `[${value.map((item) => literal(item, style)).join(", ")}]`;
  if (typeof value !== "object" || value === null) return JSON.stringify(value);
  const entries = Object.entries(value).map(([key, item]) => `${style === "ts" ? key : JSON.stringify(key)}: ${literal(item, style)}`);
  if (!entries.length) return "{}";
  return style === "ts" ? `{ ${entries.join(", ")} }` : `{${entries.join(", ")}}`;
}

// every speech model of the registry answers audio/l16; rate=24000; channels=1
const PLAYBACK = "16-bit PCM, 24 kHz, mono: ffplay -f s16le -ar 24000 -ac 1 speech.pcm";

const TS_BODY: Record<Kind, string[]> = {
  text: ['if (item.type === "text.delta") process.stdout.write(item.text);'],
  embed: [
    'if (item.type === "embedding.done") {',
    '  console.log(`${item.embedding.length} dimensions`, item.embedding.slice(0, 4), "...");',
    "}",
  ],
  image: [
    'if (item.type === "text.delta") process.stdout.write(item.text);',
    'if (item.type === "inline_data.done") {',
    '  const name = `image.${item.mime_type.split("/")[1]}`;',
    "  writeFileSync(name, item.data);",
    "  console.log(`\\nwrote ${name}, ${item.data.length} bytes`);",
    "}",
  ],
  audio: [
    'if (item.type === "inline_data.done") {',
    '  writeFileSync("speech.pcm", item.data);',
    "  console.log(`wrote speech.pcm, ${item.data.length} bytes, ${item.mime_type}`);",
    "}",
  ],
};

const PY_BODY: Record<Kind, string[]> = {
  text: ['if item["type"] == "text.delta":', '    print(item["text"], end="", flush=True)'],
  embed: ['if item["type"] == "embedding.done":', '    print(len(item["embedding"]), "dimensions", item["embedding"][:4], "...")'],
  image: [
    'if item["type"] == "text.delta":',
    '    print(item["text"], end="", flush=True)',
    'if item["type"] == "inline_data.done":',
    '    name = "image." + item["mime_type"].split("/")[1]',
    '    Path(name).write_bytes(item["data"])',
    "    print(f\"\\nwrote {name}, {len(item['data'])} bytes\")",
  ],
  audio: [
    'if item["type"] == "inline_data.done":',
    '    Path("speech.pcm").write_bytes(item["data"])',
    "    print(f\"wrote speech.pcm, {len(item['data'])} bytes, {item['mime_type']}\")",
  ],
};

const prompt = (kind: Kind) => ({ type: "text.done", text: ASK[kind].prompt });
const indent = (lines: string[], spaces: number) => lines.map((line) => " ".repeat(spaces) + line);

function typescriptProgram(kind: Kind, constructor: string[]): string {
  return [
    ...(kind === "image" || kind === "audio" ? ['import { writeFileSync } from "node:fs";', ""] : []),
    'import { AutoLLMClient } from "@prismshadow/mmsp";',
    "",
    "async function main() {",
    ...indent(constructor, 2),
    "  for await (const event of client.streamingResponseStateful({",
    "    message: {",
    '      role: "user",',
    `      content_items: [${literal(prompt(kind), "ts")}],`,
    "    },",
    `    config: ${literal(ASK[kind].config, "ts")},`,
    "  })) {",
    "    for (const item of event.content_items) {",
    ...indent(TS_BODY[kind], 6),
    "    }",
    "  }",
    ...(kind === "text" ? ["  console.log();"] : []),
    "}",
    "",
    "main().catch(console.error);",
    ...(kind === "text" ? ["// Hello, World!"] : kind === "audio" ? [`// ${PLAYBACK}`] : []),
  ].join("\n");
}

function pythonProgram(kind: Kind, constructor: string[], long: boolean): string {
  return [
    "import asyncio",
    ...(long ? ["import os"] : []),
    ...(kind === "image" || kind === "audio" ? ["from pathlib import Path"] : []),
    "",
    "from mmsp import AutoLLMClient",
    "",
    "",
    "async def main():",
    ...indent(constructor, 4),
    "    async for event in client.streaming_response_stateful(",
    "        message={",
    '            "role": "user",',
    `            "content_items": [${literal(prompt(kind), "json")}],`,
    "        },",
    `        config=${literal(ASK[kind].config, "json")},`,
    "    ):",
    '        for item in event["content_items"]:',
    ...indent(PY_BODY[kind], 12),
    ...(kind === "text" ? ["    print()"] : []),
    "",
    "",
    "asyncio.run(main())",
    ...(kind === "text" ? ["# Hello, World!"] : kind === "audio" ? [`# ${PLAYBACK}`] : []),
  ].join("\n");
}

/**
 * The code that calls an entry: complete TypeScript and Python programs, the README's quickstart
 * for this entry, that print what the model answers (its text as it streams; an embedding, image
 * or speech model by its output modality), and the row of an MMSP server's models table
 * (site/src/docs/server.en.md). An entry at its vendor's own endpoint, of a model the family table
 * routes to that vendor's client, needs only the model id: the client reads its key variable and
 * calls its default endpoint.
 */
export function kitFor(entry: Pick<SupportedModel, "model" | "base_url" | "client" | "output_modalities">): Kit {
  const provider = providerOf(entry.base_url);
  const { model, base_url, client } = entry;
  const env = provider.keyEnv;
  const short =
    familyClient(model) === client && provider.official?.client === client && provider.official.baseUrl === base_url;
  const out = entry.output_modalities;
  const kind: Kind = out.includes("Text") ? "text" : out.includes("Embed") ? "embed" : out.includes("Image") ? "image" : "audio";
  const q = JSON.stringify;
  const typescript = typescriptProgram(
    kind,
    short
      ? [`const client = new AutoLLMClient({ model: ${q(model)} });`]
      : [
          "const client = new AutoLLMClient({",
          `  model: ${q(model)},`,
          `  clientType: ${q(client)},`,
          `  baseUrl: ${q(base_url)},`,
          `  apiKey: process.env.${env},`,
          "});",
        ],
  );
  const python = pythonProgram(
    kind,
    short
      ? [`client = AutoLLMClient(model=${q(model)})`]
      : [
          "client = AutoLLMClient(",
          `    model=${q(model)},`,
          `    client_type=${q(client)},`,
          `    base_url=${q(base_url)},`,
          `    api_key=os.environ[${q(env)}],`,
          ")",
        ],
    !short,
  );
  const serverModelId = model.split("/").at(-1)!;
  const server: ServerRow = short
    ? { model_id: model, api_key: `$${env}`, server_model_id: serverModelId }
    : { model_id: model, base_url, api_key: `$${env}`, server_model_id: serverModelId, client_type: client };
  const config = ASK[kind].config;
  const request = {
    model: serverModelId,
    messages: [{ role: "user", content_items: [prompt(kind)] }],
    ...(Object.keys(config).length ? { config } : {}),
  };
  return { typescript, python, server, request, keyEnv: env, keyValue: provider.keyValue ?? "your-key", keyHint: provider.keyHint };
}

export interface CatalogRow extends SupportedModel {
  key: string;
  provider: Provider;
  vendor: Vendor | null;
  kit: Kit;
  // the registry's prices in CNY, converted by the registry itself
  pricing_cny?: SupportedModel["pricing"];
}

export function catalogRows(): CatalogRow[] {
  const cny = listSupportedModels("CNY");
  return listSupportedModels("USD").map((entry, index) => ({
    ...entry,
    key: statusKey(entry),
    provider: providerOf(entry.base_url),
    vendor: vendorOf(entry.model),
    kit: kitFor(entry),
    pricing_cny: cny[index].pricing,
  }));
}

// a context window as vendors write it: 1M and 256K for powers of two, 200K and 1M for round
// decimals
export function formatContext(tokens: number): string {
  const trim = (value: number) => String(Number(value.toFixed(2)));
  if (tokens % 1_048_576 === 0) return `${tokens / 1_048_576}M`;
  if (tokens % 1024 === 0 && tokens < 1_048_576) return `${tokens / 1024}K`;
  if (tokens >= 1_000_000) return `${trim(tokens / 1_000_000)}M`;
  return `${trim(tokens / 1000)}K`;
}

// a price per million tokens: two decimals from 1 up, three significant digits below, so a CNY
// list price converted to USD reads 0.143, not 0.1429
export function formatPrice(value: number): string {
  if (value === 0) return "0";
  if (value >= 1) return value.toFixed(2);
  const [whole, decimals = ""] = String(Number(value.toPrecision(3))).split(".");
  return `${whole}.${decimals.padEnd(2, "0")}`;
}
