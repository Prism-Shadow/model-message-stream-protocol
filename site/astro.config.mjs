// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://mmsp.penguin.ooo",
  trailingSlash: "always",
  redirects: { "/docs/": "/docs/introduction/", "/zh/docs/": "/zh/docs/introduction/" },
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
