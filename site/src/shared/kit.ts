// The integration kit of one registry entry, as the Model Index's dialog shows it: complete
// TypeScript and Python programs, the README's quickstart written for the entry, the
// mmsp-server.json that serves it, the lines that install, key and run each, and the prompt Copy for
// agent puts on the clipboard. The page assembles a kit in the browser when a row's code button is
// pressed, from what the row carries (its model, endpoint, client, kind, modalities, context window
// and USD prices) and one table of the providers the page names, so the page ships one template
// instead of 345 programs. Nothing here reads the registry or the build's environment: catalog.ts
// decides an entry's kind, and the caller passes the site's origin.
import { localePath, type Locale } from "./i18n";
import type { Modality } from "../../../src_ts/src/registry.ts";

type Text = Record<Locale, string>;

// what the programs and the agent prompt need of a provider; the page carries these once, as a table
export interface KitProvider {
  name: string;
  keyEnv: string;
  // what to export in the key variable: a token, the service-account JSON, ACCESS,SECRET
  keyValue: string;
  // what the key variable holds, where it is not a plain token
  keyHint?: Text;
}

// what a program asks a model of each output kind, and how it shows the answer: text as it
// streams, an embedding by its size, an image or speech as the file it writes
export type Kind = "text" | "embed" | "image" | "audio";

export interface KitEntry {
  model: string;
  base_url: string;
  client: string;
  kind: Kind;
  input_modalities: Modality[];
  output_modalities: Modality[];
  context_window?: number;
  // USD per 1M tokens
  pricing?: { prompt_tokens: number; response_tokens: number; cached_tokens?: number };
}

export interface ServerRow {
  model_id: string;
  base_url: string;
  api_key: string;
  server_model_id: string;
  client_type: string;
}

export interface Kit {
  // a complete program, saved as main.ts
  typescript: string;
  // a complete program, saved as main.py
  python: string;
  server: ServerRow;
  // the body of a POST /v1/stream that asks the server's row what the programs ask
  request: Record<string, unknown>;
}

// what the Model Index's dialog shows of an entry: each tab's file and the lines that install, key
// and run it, and the prompt Copy for agent puts on the clipboard
export interface CatalogKit {
  typescript: string;
  python: string;
  // a whole mmsp-server.json
  server: string;
  agent: string;
  run: Record<"typescript" | "python" | "server", string>;
}

// a row's modalities as the page writes them in an attribute, one letter each in the registry's
// order, since the agent prompt lists them in that order
const LETTERS: Record<Modality, string> = { Text: "T", Image: "I", Video: "V", Audio: "A", Embed: "E" };
const MODALITIES = Object.fromEntries(Object.entries(LETTERS).map(([name, letter]) => [letter, name as Modality]));

export const modalityCode = (modalities: Modality[]) => modalities.map((name) => LETTERS[name]).join("");
export const modalitiesOf = (code: string) => [...code].map((letter) => MODALITIES[letter]);

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

function pythonProgram(kind: Kind, constructor: string[]): string {
  return [
    "import asyncio",
    "import os",
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
 * or speech model by its output kind), and the row of an MMSP server's models table
 * (site/src/docs/server.en.md). Every entry gets the full constructor, the one /models.json's `call`
 * writes, so an entry at its vendor's own endpoint reads the same as one behind a gateway.
 */
export function kitFor(entry: KitEntry, provider: KitProvider): Kit {
  const { model, base_url, client, kind } = entry;
  const env = provider.keyEnv;
  const q = JSON.stringify;
  const typescript = typescriptProgram(kind, [
    "const client = new AutoLLMClient({",
    `  model: ${q(model)},`,
    `  clientType: ${q(client)},`,
    `  baseUrl: ${q(base_url)},`,
    `  apiKey: process.env.${env},`,
    "});",
  ]);
  const python = pythonProgram(kind, [
    "client = AutoLLMClient(",
    `    model=${q(model)},`,
    `    client_type=${q(client)},`,
    `    base_url=${q(base_url)},`,
    `    api_key=os.environ[${q(env)}],`,
    ")",
  ]);
  const serverModelId = model.split("/").at(-1)!;
  const server: ServerRow = { model_id: model, base_url, api_key: `$${env}`, server_model_id: serverModelId, client_type: client };
  const config = ASK[kind].config;
  const request = {
    model: serverModelId,
    messages: [{ role: "user", content_items: [prompt(kind)] }],
    ...(Object.keys(config).length ? { config } : {}),
  };
  return { typescript, python, server, request };
}

const PROMPT = {
  en: {
    goal: (model: string, provider: string, url: string) => `Add \`${model}\` (served by ${provider} at \`${url}\`) to this project through MMSP.`,
    facts: "Facts",
    packages: "Packages: `mmsp` for Python, `@prismshadow/mmsp` for TypeScript",
    modelId: "Model id",
    key: (env: string, value: string) => `API key: the environment variable \`${env}\`, holding ${value}`,
    keyOf: (provider: string) => `${provider}'s API key`,
    modalities: "Modalities",
    context: (window: string, tokens: string) => `Context window: ${window} tokens (${tokens})`,
    prices: "List prices per 1M tokens, USD",
    price: { input: "input", output: "output", cached: "cached" },
    code: "Code",
    program: (language: string, file: string) => `${language}, \`${file}\`:`,
    steps: "Steps",
    list: (env: string) => [
      "Use the project's language: the TypeScript program with `@prismshadow/mmsp`, or the Python one with `mmsp`.",
      "Install the package: `npm install @prismshadow/mmsp` or `pip install mmsp`.",
      `Read the key from \`${env}\`; never hard-code it or commit it.`,
      "Wire the call into the project's existing LLM call site; if there is none, add a minimal module for it.",
      "Run it once and check that the model answers.",
      "Report what you changed: the files, the new dependency, and how to run it.",
    ],
    references: "References",
    separator: ", ",
    colon: ": ",
  },
  zh: {
    goal: (model: string, provider: string, url: string) => `通过 MMSP 把 \`${model}\`（由 ${provider} 提供，地址 \`${url}\`）接入这个项目。`,
    facts: "信息",
    packages: "包：Python 用 `mmsp`，TypeScript 用 `@prismshadow/mmsp`",
    modelId: "模型 id",
    // a space between Chinese and a value that begins in Latin letters, as Chinese typesetting has it
    key: (env: string, value: string) => `API 密钥：环境变量 \`${env}\`，值为${/^[A-Za-z0-9]/.test(value) ? " " : ""}${value}`,
    keyOf: (provider: string) => `${provider} 的 API key`,
    modalities: "模态",
    context: (window: string, tokens: string) => `上下文窗口：${window} tokens（${tokens}）`,
    prices: "每百万 tokens 标价（美元）",
    price: { input: "输入", output: "输出", cached: "缓存" },
    code: "代码",
    program: (language: string, file: string) => `${language}，\`${file}\`：`,
    steps: "步骤",
    list: (env: string) => [
      "使用项目本身的语言：TypeScript 项目用上面的 TypeScript 程序和 `@prismshadow/mmsp`，Python 项目用 Python 程序和 `mmsp`。",
      "安装包：`npm install @prismshadow/mmsp` 或 `pip install mmsp`。",
      `从 \`${env}\` 读取密钥，不要写进代码，也不要提交到仓库。`,
      "把调用接到项目里现有的 LLM 调用处；没有的话，新增一个最小的模块来放它。",
      "运行一次，确认模型有回复。",
      "汇报改了什么：哪些文件、新增的依赖，以及如何运行。",
    ],
    references: "参考",
    separator: "、",
    colon: "：",
  },
} as const;

/**
 * A prompt for an AI agent that wires one entry into the project it works in, in the page's
 * language: the goal, the facts the kit is built from, the kit's TypeScript and Python programs,
 * the steps, and where to read more on `site`. The modality names are the page's own
 * (STRINGS[locale].models.modality), passed in so the browser does not load every string of the
 * site to write five words.
 */
export function agentPromptFor(entry: KitEntry, provider: KitProvider, locale: Locale, site: string, modality: Record<Modality, string>): string {
  const words = PROMPT[locale];
  const kit = kitFor(entry, provider);
  const pricing = entry.pricing;
  const prices = pricing
    ? (
        [
          ["input", pricing.prompt_tokens],
          ["output", pricing.response_tokens],
          ["cached", pricing.cached_tokens],
        ] as const
      )
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => `${words.price[name]} ${formatPrice(value!)}`)
        .join(words.separator)
    : null;
  return [
    words.goal(entry.model, provider.name, entry.base_url),
    "",
    `## ${words.facts}`,
    "",
    `- ${words.packages}`,
    `- \`client_type\`${words.colon}\`${entry.client}\``,
    `- \`base_url\`${words.colon}\`${entry.base_url}\``,
    `- ${words.modelId}${words.colon}\`${entry.model}\``,
    `- ${words.key(provider.keyEnv, provider.keyHint?.[locale] ?? words.keyOf(provider.name))}`,
    `- ${words.modalities}${words.colon}${entry.input_modalities.map((name) => modality[name]).join(words.separator)} → ${entry.output_modalities.map((name) => modality[name]).join(words.separator)}`,
    ...(entry.context_window ? [`- ${words.context(formatContext(entry.context_window), entry.context_window.toLocaleString("en-US"))}`] : []),
    ...(prices ? [`- ${words.prices}${words.colon}${prices}`] : []),
    "",
    `## ${words.code}`,
    "",
    words.program("TypeScript", "main.ts"),
    "",
    "```ts",
    kit.typescript,
    "```",
    "",
    words.program("Python", "main.py"),
    "",
    "```python",
    kit.python,
    "```",
    "",
    `## ${words.steps}`,
    "",
    ...words.list(provider.keyEnv).map((step, index) => `${index + 1}. ${step}`),
    "",
    `## ${words.references}`,
    "",
    `- ${new URL("/llms.txt", site).href}`,
    `- ${new URL("/models.json", site).href}`,
    `- ${new URL(localePath(locale, "/docs/quickstart/"), site).href}`,
    "",
  ].join("\n");
}

/**
 * Everything the dialog shows of one entry in one language. The Server tab's file is started in the
 * background, so one paste also streams one answer through it.
 */
export function catalogKit(entry: KitEntry, provider: KitProvider, locale: Locale, site: string, modality: Record<Modality, string>): CatalogKit {
  const kit = kitFor(entry, provider);
  const hint = provider.keyHint?.[locale];
  const keyLine = `export ${provider.keyEnv}=${provider.keyValue}` + (hint && hint !== provider.keyValue ? `  # ${hint}` : "");
  // a single-quoted shell word cannot hold a single quote, so the prompt's quotes become escaped
  // double quotes
  const body = literal(kit.request, "json").replaceAll("'", '\\"');
  // an embedding, an image or speech streams as lines of numbers or base64; their heads show it
  const heads = entry.output_modalities.includes("Text") ? "" : " | cut -c 1-160";
  return {
    typescript: kit.typescript,
    python: kit.python,
    server: JSON.stringify({ models: [kit.server], api_keys: ["$MMSP_SERVER_API_KEY"] }, null, 2),
    agent: agentPromptFor(entry, provider, locale, site, modality),
    run: {
      typescript: ["npm install @prismshadow/mmsp", keyLine, "npx tsx main.ts"].join("\n"),
      python: ["pip install mmsp", keyLine, "python main.py"].join("\n"),
      server: [
        "pip install mmsp",
        keyLine,
        "export MMSP_SERVER_API_KEY=secret",
        "python -m mmsp.integration.server --config mmsp-server.json &",
        "curl -sSN --retry 5 --retry-connrefused http://127.0.0.1:25752/v1/stream \\",
        '  -H "Authorization: Bearer $MMSP_SERVER_API_KEY" -H "Content-Type: application/json" \\',
        `  -d '${body}'${heads}`,
      ].join("\n"),
    },
  };
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
