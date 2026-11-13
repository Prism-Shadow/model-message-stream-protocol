# Jina Web Tools Documentation

Jina's Reader and Search APIs, which the `jina-webtool` client serves as `jina-fetch` and `jina-search`.

## Documentation

- [reader-and-search-api.md](./docs/reader-and-search-api.md) - Authentication, rate limits, the error table, `POST https://r.jina.ai/` (Reader: `url` in, `data.title` / `data.content` / `data.url` out) and `POST https://s.jina.ai/search` (Search: `q`, `num` 0–20 default 10, `X-Respond-With: no-content` for descriptions only); `Accept: application/json` selects the JSON envelope `{code, status, data, meta}`
- [meta-prompt-reader-search.md](./docs/meta-prompt-reader-search.md) - The Reader and Search sections of the plain-text guide docs.jina.ai serves to coding agents

## Notes

The two APIs live on two hosts with one key, `JINA_API_KEY`; `eu.r.jina.ai` and `eu.s.jina.ai` keep processing in the EU. Usage is in tokens: `meta.usage.tokens` is what a request bills. A search bills a flat 10,000 tokens whatever `num` is (captured 2026-11-02), and a read bills the page's tokens. `Accept: text/event-stream` re-sends the whole page as it loads rather than streaming parts. Jina's models API lists its token price as $0.05 per million. Live captures: `api_captures/webtool/` (git-ignored).
