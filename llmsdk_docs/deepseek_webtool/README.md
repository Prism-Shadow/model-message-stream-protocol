# DeepSeek Web Tools Documentation

DeepSeek's Search and Fetch APIs, which the `deepseek-webtool` client serves as `deepseek-search` and `deepseek-fetch`.

## Documentation

- [search-guide.zh.md](./docs/search-guide.zh.md) - Search and Fetch together: endpoints under `https://api.deepseek.com`, Bearer auth, request fields, search operators, responses, errors (OpenAI error format), per-request billing (¥5 per 1,000 successful requests each) and QPS limits
- [search-api.zh.md](./docs/search-api.zh.md) - `POST /v1/tools/search` reference: `query` (1–128 characters), `count` (1–50, default 10), `ori_question`, `localization`, `need_content`; each result's `title`, `url`, `snippet`, `summary`, `content`, `rerank_score`, `authority`, `date`
- [fetch-api.zh.md](./docs/fetch-api.zh.md) - `POST /v1/tools/fetch` reference: `url` in, `title` and Markdown `content` out
- [tokendance-deepseek-fetch.zh.md](./docs/tokendance-deepseek-fetch.zh.md) - TokenDance's gateway for the same API, at `https://tokendance.space/gateway/deepseek/v1/tools/...`, ¥0.005 per request

## Notes

Both endpoints answer in one JSON and do not stream. The API also answers without the `/v1` prefix; TokenDance answers only with it. Live captures: `api_captures/webtool/` (git-ignored).
