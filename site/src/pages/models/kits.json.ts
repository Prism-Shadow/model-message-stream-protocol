import type { APIRoute } from "astro";
import { catalogKits } from "../../shared/catalog";

// what the Model Index's dialog shows of each entry, fetched by the page on demand
export const GET: APIRoute = () =>
  new Response(JSON.stringify(catalogKits("en")), { headers: { "content-type": "application/json; charset=utf-8" } });
