# Add the site at mmsp.penguin.ooo and redraw the artwork

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `site`, `docs`, `skills`
- **PR:** [#226](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/226)

[中文版](2026-09-29-site-and-artwork.zh.md)

## What changed

- `site/` was added: an Astro project with the overview page, twelve documentation pages (introduction, quickstart, messages, streaming, fidelity, errors, client, configuration, models and endpoints, token usage, tracer and playground, agent skills) and a changelog page rendered from `CHANGELOG.md`. The overview page replays two recorded streams event by event next to the message they add up to.
- `.github/workflows/pages.yml` was added. It builds the site on every pull request that touches it and publishes it to GitHub Pages from `main`; `site/public/CNAME` names the custom domain `mmsp.penguin.ooo`.
- The README header and the concept diagram were redrawn under the name MMSP, and a GitHub social preview (1280 x 640) was added as `.github/images/social-preview.png`. The diagram shows the current data structures: `.done` items in `UniMessage`, a stream of `delta` events closed by the `stop` event that carries the usage. Their HTML sources and the render script are in `site/artwork/`.
- The README links to the site.
- `skills/mmsp-python` and `skills/mmsp-typescript`: the streaming protocol section of `reference/data-models.md` no longer says that an item starting while another streams is held back, which stopped being the case when clients began to yield the deltas of an item contiguously.
