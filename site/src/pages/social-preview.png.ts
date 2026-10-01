import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// The social preview has one copy, with the README images; the build serves it at the URL the
// pages' link previews name. The build runs in site/, so the repository root is one level up.
export const GET: APIRoute = async () =>
  new Response(await readFile(resolve(process.cwd(), "../.github/images/social-preview.png")), {
    headers: { "content-type": "image/png" },
  });
