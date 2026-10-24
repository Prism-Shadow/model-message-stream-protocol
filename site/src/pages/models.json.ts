import type { APIRoute } from "astro";
import { STATUS_DATA_URL, catalogRows } from "../shared/catalog";
import { REPO_URL } from "../shared/site";

// the catalog for agents: every registry entry with its provider, key variable, list price, the
// code that calls it, and the key its status is filed under in the probe's files
export const GET: APIRoute = ({ site }) => {
  const models = catalogRows().map((row) => ({
    model: row.model,
    base_url: row.base_url,
    client: row.client,
    provider: row.provider.name,
    vendor: row.vendor?.name ?? null,
    input_modalities: row.input_modalities,
    output_modalities: row.output_modalities,
    context_window: row.context_window ?? null,
    pricing: row.pricing ?? null,
    api_key_env: row.kit.keyEnv,
    ...(row.kit.keyHint ? { api_key_format: row.kit.keyHint.en } : {}),
    status_key: row.key,
    kit: { typescript: row.kit.typescript, python: row.kit.python, server: row.kit.server },
  }));
  const body = {
    source: `${REPO_URL}/blob/main/src_ts/src/registry.ts`,
    page: new URL("/models/", site).href,
    pricing: "USD per 1M tokens, list price; thoughts_tokens and response_tokens are both billed at the output price",
    status: {
      page: new URL("/status/", site).href,
      files: ["latest.json", "history.json", "monthly.json"].map((name) => STATUS_DATA_URL + name),
      key: "client+base_url+model",
    },
    models,
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
};
