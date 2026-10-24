// @ts-check
import { readdirSync } from "node:fs";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// the RFC pages moved from /docs/ to /rfcs/; each old URL is a page that sends its reader on, one per
// file of design/rfcs/, so a new RFC needs no change here
const rfcSlugs = readdirSync(new URL("../design/rfcs", import.meta.url))
  .filter((name) => /^MMSP-RFC-\d{4}-.+\.md$/.test(name) && !name.endsWith(".zh.md"))
  .map((name) => name.slice(0, -".md".length).toLowerCase());
// the rule RFCs were renumbered on 2026-10-24 (MMSP-RFC-0001); each old page sends its reader to the RFC
// that holds its content
const renumbered = {
  "mmsp-rfc-0003-stream-grammar": "mmsp-rfc-0003-async-streaming",
  "mmsp-rfc-0004-explicit-routing": "mmsp-rfc-0006-explicit-routing",
  "mmsp-rfc-0005-credential-scope": "mmsp-rfc-0007-credential-scope",
  "mmsp-rfc-0006-thinking-levels-usable": "mmsp-rfc-0010-thinking-levels-usable",
  "mmsp-rfc-0007-typed-rejection": "mmsp-rfc-0009-typed-errors",
  "mmsp-rfc-0008-minimal-replay": "mmsp-rfc-0004-lean-messages",
  "mmsp-rfc-0009-two-packages-one-contract": "mmsp-rfc-0002-one-protocol",
  "mmsp-rfc-0010-stop-metadata": "mmsp-rfc-0005-essential-fields",
  "mmsp-rfc-0011-thinking-round-trip": "mmsp-rfc-0005-essential-fields",
  "mmsp-rfc-0012-direct-conversion": "mmsp-rfc-0013-direct-implementation",
};
const moved = Object.fromEntries([
  ["/docs/rfcs/", "/rfcs/"],
  ["/zh/docs/rfcs/", "/zh/rfcs/"],
  ...rfcSlugs.flatMap((slug) => [
    [`/docs/${slug}/`, `/rfcs/${slug}/`],
    [`/zh/docs/${slug}/`, `/zh/rfcs/${slug}/`],
  ]),
  ...Object.entries(renumbered).flatMap(([old, now]) => [
    [`/docs/${old}/`, `/rfcs/${now}/`],
    [`/zh/docs/${old}/`, `/zh/rfcs/${now}/`],
    [`/rfcs/${old}/`, `/rfcs/${now}/`],
    [`/zh/rfcs/${old}/`, `/zh/rfcs/${now}/`],
  ]),
]);

export default defineConfig({
  site: "https://mmsp.penguin.ooo",
  trailingSlash: "always",
  redirects: { "/docs/": "/docs/introduction/", "/zh/docs/": "/zh/docs/introduction/", ...moved },
  markdown: {
    // straight quotes stay straight, as they are written in code and in the README
    smartypants: false,
    // one render carries both palettes; styles/global.css flips them on html.dark
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" } },
  },
  vite: {
    plugins: [tailwindcss()],
    // the changelog page renders the repository's CHANGELOG.md, one level above the site
    server: { fs: { allow: [".."] } },
  },
});
