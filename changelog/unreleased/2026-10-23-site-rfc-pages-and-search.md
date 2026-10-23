# The site's RFC pages at /rfcs/, and docs and RFC search

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `site`, `design`

[中文版](2026-10-23-site-rfc-pages-and-search.zh.md)

## What changed

- The RFCs moved out of the docs sidebar's Design section into their own area, RFCs: the index (`design/README.md`) at `/rfcs/` and each RFC at `/rfcs/mmsp-rfc-NNNN-<slug>/`, with Markdown twins at `/rfcs/index.md` and `/rfcs/mmsp-rfc-NNNN-<slug>.md`, and the same under `/zh/`. The area's sidebar got one group, RFCs, listing the index, then every RFC as its number and its title; previous and next were kept within the area.
- The old URLs `/docs/rfcs/` and `/docs/mmsp-rfc-NNNN-<slug>/` (and their `/zh/` counterparts) became redirect pages to the new ones, one per file of `design/rfcs/`, computed in `site/astro.config.mjs`. The old `.md` URLs were not redirected.
- Added search over the docs and the RFCs: `/search/en.json` and `/search/zh.json` are built with the site, one record per page and per h2/h3 section; `site/src/shared/search.ts` ports the matching of penguin.ooo/docs (NFKC, every word required, scored, snippets with the matches marked) and ranks the current area's results first. The dialog opens from a button at the top of the sidebar, an icon beside the section picker on narrow screens, or ⌘K / Ctrl K, and is driven with ↑ ↓ Enter Esc.
- `llms.txt` gained an `## RFC` section and the RFC pages in its Chinese list, and named the models and status pages Model Index and Model Status; `sitemap.xml` gained the RFC pages.
- The top bar's RFCs entry and the Design philosophy page were pointed at the RFC index at `/rfcs/`.
- `site/README.md` gained the RFC area, the search and `site/src/shared/status-build.ts`, and described the catalog and the status page as built from the probe's files.
