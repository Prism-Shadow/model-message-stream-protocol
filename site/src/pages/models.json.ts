import type { APIRoute } from "astro";
import { listSupportedModels } from "../../../src_ts/src/registry.ts";
import { providerOf } from "../shared/providers";
import { STATUS_DATA_URL } from "../shared/status";
import { REPO_URL } from "../shared/site";

// the catalog for agents: every registry entry with its provider, key variable, modalities, context
// window and list price, one row per line so an agent can grep it, and one constructor call that
// fits every row; an absent value is left out, not written as null. The page's programs are not
// repeated per row: `call` with a row's fields is the code, and status.key says how a row's
// status is keyed.
export const GET: APIRoute = ({ site }) => {
  const rows = listSupportedModels("USD").map((entry) => {
    const provider = providerOf(entry.base_url);
    const pricing = entry.pricing;
    // the row keeps one output price; a registry row billing thoughts apart would need its own field
    if (pricing && pricing.thoughts_tokens !== pricing.response_tokens) {
      throw new Error(`site/src/pages/models.json.ts: ${entry.model} at ${entry.base_url} bills thoughts apart from the response`);
    }
    return {
      model: entry.model,
      base_url: entry.base_url,
      client: entry.client,
      provider: provider.name,
      input_modalities: entry.input_modalities,
      output_modalities: entry.output_modalities,
      context_window: entry.context_window,
      pricing: pricing && { prompt_tokens: pricing.prompt_tokens, response_tokens: pricing.response_tokens, cached_tokens: pricing.cached_tokens },
      api_key_env: provider.keyEnv,
      api_key_format: provider.keyHint?.en,
    };
  });
  const head = {
    source: `${REPO_URL}/blob/main/src_ts/src/registry.ts`,
    page: new URL("/models/", site).href,
    call: {
      python: "AutoLLMClient(model=model, client_type=client, base_url=base_url, api_key=os.environ[api_key_env])",
      typescript: "new AutoLLMClient({ model, clientType: client, baseUrl: base_url, apiKey: process.env[api_key_env] })",
      docs: new URL("/docs/quickstart/", site).href,
    },
    pricing:
      "USD per 1M tokens: the vendor's list price on its own endpoint, and on a gateway the rate the gateway bills; prompt_tokens is the uncached input, cached_tokens a cache hit, and response_tokens the output, at which thoughts are billed too",
    status: {
      page: new URL("/status/", site).href,
      files: ["latest.json", "history.json", "monthly.json"].map((name) => STATUS_DATA_URL + name),
      key: "client+base_url+model",
    },
  };
  // the head as indented JSON, closed after the rows; JSON.stringify leaves out the undefined values
  const text = `${JSON.stringify(head, null, 2).slice(0, -2)},\n  "models": [\n${rows.map((row) => `    ${JSON.stringify(row)}`).join(",\n")}\n  ]\n}\n`;
  return new Response(text, { headers: { "content-type": "application/json; charset=utf-8" } });
};
