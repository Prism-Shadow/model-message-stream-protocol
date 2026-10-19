// The model catalog: every entry of the SDK's registry (src_ts/src/registry.ts, read as the site
// is built) with the provider that serves it, the vendor that made it, the key it needs, its status
// key and its integration kit. The kit is the constructor call the registry test makes for the
// entry, so the page cannot offer code the SDK does not run.
import { listSupportedModels, type SupportedModel } from "../../../src_ts/src/registry.ts";
import autoClientSource from "../../../src_ts/src/autoClient.ts?raw";
import { providerOf, vendorOf, type Provider, type Vendor } from "./providers";
import type { Locale } from "./i18n";

export { STATUS_DATA_URL } from "./status";
export { PROVIDERS, providerOf, vendorOf, type Provider, type Vendor } from "./providers";

type Text = Record<Locale, string>;

export function statusKey(entry: Pick<SupportedModel, "model" | "base_url" | "client">): string {
  return `${entry.client}|${entry.base_url}|${entry.model}`;
}

// MODEL_FAMILIES of autoClient.ts, read as text: importing the module would pull every provider
// SDK into the site build. A family routes a model id to its official client without a client type.
const familySource = autoClientSource.slice(autoClientSource.indexOf("export const MODEL_FAMILIES")).split("];")[0];
const FAMILIES = [...familySource.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)].map((match) => [match[1], match[2]] as const);
if (FAMILIES.length === 0) throw new Error("site/src/shared/catalog.ts found no MODEL_FAMILIES in src_ts/src/autoClient.ts");

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
  typescript: string;
  python: string;
  server: ServerRow;
  keyEnv: string;
  keyHint?: Text;
}

/**
 * The code that calls an entry: the TypeScript and Python constructors and the row of an MMSP
 * server's models table (site/src/docs/server.en.md). An entry at its vendor's own endpoint, of a
 * model the family table routes to that vendor's client, needs only the model id: the client
 * reads its key variable and calls its default endpoint.
 */
export function kitFor(entry: Pick<SupportedModel, "model" | "base_url" | "client">): Kit {
  const provider = providerOf(entry.base_url);
  const { model, base_url, client } = entry;
  const env = provider.keyEnv;
  const short =
    familyClient(model) === client && provider.official?.client === client && provider.official.baseUrl === base_url;
  const q = JSON.stringify;
  const typescript = short
    ? `import { AutoLLMClient } from "@prismshadow/mmsp";\n\nconst client = new AutoLLMClient({ model: ${q(model)} });`
    : [
        'import { AutoLLMClient } from "@prismshadow/mmsp";',
        "",
        "const client = new AutoLLMClient({",
        `  model: ${q(model)},`,
        `  clientType: ${q(client)},`,
        `  baseUrl: ${q(base_url)},`,
        `  apiKey: process.env.${env},`,
        "});",
      ].join("\n");
  const python = short
    ? `from mmsp import AutoLLMClient\n\nclient = AutoLLMClient(model=${q(model)})`
    : [
        "import os",
        "",
        "from mmsp import AutoLLMClient",
        "",
        "client = AutoLLMClient(",
        `    model=${q(model)},`,
        `    client_type=${q(client)},`,
        `    base_url=${q(base_url)},`,
        `    api_key=os.environ[${q(env)}],`,
        ")",
      ].join("\n");
  const serverModelId = model.split("/").at(-1)!;
  const server: ServerRow = short
    ? { model_id: model, api_key: `$${env}`, server_model_id: serverModelId }
    : { model_id: model, base_url, api_key: `$${env}`, server_model_id: serverModelId, client_type: client };
  return { typescript, python, server, keyEnv: env, keyHint: provider.keyHint };
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
