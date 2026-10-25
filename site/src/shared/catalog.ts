// The model catalog, as the site is built: every entry of the SDK's registry (src_ts/src/registry.ts)
// with the provider that serves it, the vendor that made it, the key it needs and its status key.
// The integration kit of an entry is the README's quickstart written for it (kit.ts): the
// constructor call the registry test makes, then one request whose answer the program prints, so
// the page cannot offer code the SDK does not run. The page's dialog assembles a kit in the browser
// from the row; what only the build can decide goes into the row through kitEntry(), the entry's
// kind and whether the SDK's model families let its constructor name the model alone, and into the
// page's provider table through kitProvider().
import { listSupportedModels, type SupportedModel } from "../../../src_ts/src/registry.ts";
import credentialsSource from "../../../src_ts/src/credentials.ts?raw";
import { providerOf, vendorOf, type Provider, type Vendor } from "./providers";
import type { Kind, KitEntry, KitProvider } from "./kit";

export { STATUS_DATA_URL } from "./status";
export { PROVIDERS, providerOf, vendorOf, type Provider, type Vendor } from "./providers";
export { formatContext, formatPrice, literal } from "./kit";

export function statusKey(entry: Pick<SupportedModel, "model" | "base_url" | "client">): string {
  return `${entry.client}+${entry.base_url}+${entry.model}`;
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

// what the page carries of a provider for its kits; a plain token is written as your-key
export function kitProvider(provider: Provider): KitProvider {
  const { name, keyEnv, keyHint } = provider;
  return { name, keyEnv, keyValue: provider.keyValue ?? "your-key", ...(keyHint ? { keyHint } : {}) };
}

/**
 * What kit.ts needs of an entry. Its kind follows its first output that is not text: an entry that
 * answers text is a text one even when it also draws images. Its constructor is the short one when
 * the entry sits at its vendor's own endpoint and the family table routes the model id to that
 * vendor's client.
 */
export function kitEntry(entry: SupportedModel): KitEntry {
  const { model, base_url, client, input_modalities, output_modalities, context_window, pricing } = entry;
  const provider = providerOf(base_url);
  const short =
    familyClient(model) === client && provider.official?.client === client && provider.official.baseUrl === base_url;
  const out = output_modalities;
  const kind: Kind = out.includes("Text") ? "text" : out.includes("Embed") ? "embed" : out.includes("Image") ? "image" : "audio";
  return {
    model,
    base_url,
    client,
    kind,
    short,
    input_modalities,
    output_modalities,
    context_window,
    pricing: pricing && { prompt_tokens: pricing.prompt_tokens, response_tokens: pricing.response_tokens, cached_tokens: pricing.cached_tokens },
  };
}

export interface CatalogRow extends SupportedModel {
  key: string;
  provider: Provider;
  vendor: Vendor | null;
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
    pricing_cny: cny[index].pricing,
  }));
}
