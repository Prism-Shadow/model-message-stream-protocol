# The site follows the system's language and theme, and hands MMSP to a coding agent

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `site`, `docs`

[中文版](2026-09-29-site-languages-and-themes.zh.md)

## What changed

- The site is in English at `/` and in Chinese at `/zh/`, with the twelve documentation pages and the changelog in both. The home page and the docs landing open in the browser's language; the language menu in the top bar switches, the choice is kept in the browser, and a chosen language applies to every page. A link to any other page keeps its language, and every page names its counterpart in the other language for search engines.
- The theme follows the system, light or dark, and the theme menu in the top bar pins one. Both choices apply before the first paint, so a page never flashes the other language or the other theme.
- The overview page gained a section that hands MMSP to a coding agent: one line installs the `mmsp-python` or `mmsp-typescript` skill from the repository's tarball, and a prompt points an assistant that takes no skills at the same file. The agent skills page has the same lines.
- The stream on the overview page loops: after its last event it rests, then replays while it is on screen.
- The mark is the four letters in a grid. The favicon, the README header and the social preview use it.
- A new page, The agent loop, describes the loop every agent runs on MMSP and gives a complete implementation in Python and TypeScript: stream, run every tool the turn asked for, send the results back in one message, stop when a turn asks for none.
- On every documentation page the table of contents follows the reader, and a Copy Markdown button copies the page as Markdown. Every page is also served as Markdown at its own URL plus `.md`, and `/llms.txt` indexes them.
- Search engines get `/sitemap.xml` with both languages of every page, `/robots.txt`, a `favicon.ico`, complete Open Graph and Twitter tags, and structured data: `WebSite` on the home page, `TechArticle` on the others.
- The GitHub button in the top bar shows the repository's star count, read from the GitHub API and kept in the browser for an hour.
- The documentation files moved from `site/src/docs/<page>.md` to `site/src/docs/<page>.en.md` and `<page>.zh.md`.
