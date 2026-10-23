// @ts-check
import { readdirSync } from "node:fs";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// the RFC pages moved from /docs/ to /rfcs/; each old URL is a page that sends its reader on, one per
// file of design/rfcs/, so a new RFC needs no change here
const rfcSlugs = readdirSync(new URL("../design/rfcs", import.meta.url))
  .filter((name) => /^MMSP-RFC-\d{4}-.+\.md$/.test(name) && !name.endsWith(".zh.md"))
  .map((name) => name.slice(0, -".md".length).toLowerCase());
const moved = Object.fromEntries([
  ["/docs/rfcs/", "/rfcs/"],
  ["/zh/docs/rfcs/", "/zh/rfcs/"],
  ...rfcSlugs.flatMap((slug) => [
    [`/docs/${slug}/`, `/rfcs/${slug}/`],
    [`/zh/docs/${slug}/`, `/zh/rfcs/${slug}/`],
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
