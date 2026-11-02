# Web search and page fetch in the specifications, MMSP-RFC-0014 to MMSP-RFC-0017

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`
- **PR:** [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)

[中文版](2026-11-02-web-tools-rfcs.zh.md)

## What changed

- [MMSP-RFC-0014](../../design/rfcs/MMSP-RFC-0014-message-protocol.md) Message Protocol superseded MMSP-RFC-0002 and added `webtool.done` and `webtool.delta` to the closed set of item kinds. An item's `webdata` lists `WebData` objects with a `title`, a `content` and a `url`: a search's results in rank order, each result's summary as its `content`, or the one page a fetch read, its Markdown as `content`. A search that found nothing is an item with an empty `webdata`.
- [MMSP-RFC-0015](../../design/rfcs/MMSP-RFC-0015-message-requests.md) Message Requests superseded MMSP-RFC-0003. `webdata` joined the growing fields. §3.2 specified the web tool endpoints: they answer in one JSON, and Jina's event stream, which sends the whole page again as it loads, is not read; a client sends one request per message, each answer goes out as one `webtool` item, and the `stop` carries `finish_reason` `stop` and, as `prompt_tokens`, the tokens billed or one per request billed, summed over the requests; a search asks for the results' summaries, never their pages' bodies. §6.1 named `-search` and `-fetch` among the modality markers, and §6.3 stated that a model that does not think ignores the thinking level.
- [MMSP-RFC-0016](../../design/rfcs/MMSP-RFC-0016-client-routing.md) Client Routing superseded MMSP-RFC-0005. `deepseek-official` serves `deepseek-search` and `deepseek-fetch` through `deepseek-webtool`, named or deduced, so model ids are matched by prefix or as whole ids; a client whose endpoint lists no models raises `UnsupportedOperationError` from `list_models`, as `anthropic-official` already did on Bedrock.
- [MMSP-RFC-0017](../../design/rfcs/MMSP-RFC-0017-upstream-credentials.md) Upstream Credentials superseded MMSP-RFC-0006. A row's other default endpoints, `other_base_urls`, take the environment's key as its default endpoint does, and a client passed no base URL calls the one of its default endpoints that serves its model. `ApiKeyRequiredError` for a client given no key covers every client on the OpenAI SDK whose key variable is not `OPENAI_API_KEY`, compatible clients included, except a client of an open server.
- `design/README.md` and `design/README.zh.md` indexed the four specifications and marked MMSP-RFC-0002, MMSP-RFC-0003, MMSP-RFC-0005 and MMSP-RFC-0006 superseded; each of their files gained a `Superseded by` line in both languages. `AGENTS.md`, the `mmsp-dev` skill, the docstring of `UnknownEventError` in both packages and the citation example in `design/0000-template.md` cited the new numbers.
