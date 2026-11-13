# Specifications change in place; web search and page fetch in the specifications

- **Date:** 2026-11-02
- **Type:** process
- **Scope:** `design`, `agents`
- **PR:** [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)

[中文版](2026-11-02-web-tools-rfcs.zh.md)

## What changed

- [MMSP-RFC-0001](../../design/rfcs/MMSP-RFC-0001-rfc-process.md) and `design/README.md`: an accepted RFC, a specification included, changes in place. Its PR edits both languages, keeps the number and the row, adds a paragraph to the Introduction and appends its link to the `Updated by` line. `Supersedes` remains for a specification that replaces another one whole. `AGENTS.md` says the same.
- [MMSP-RFC-0002](../../design/rfcs/MMSP-RFC-0002-message-protocol.md) Message Protocol: §3.4 gained `webtool.done` and `webtool.delta`. An item's `webdata` lists `WebData` objects with a `title`, a `content` and a `url`: a search's results in rank order, each result's summary as its `content`, or the one page a fetch read, its Markdown as `content`. A search that found nothing is an item with an empty `webdata`.
- [MMSP-RFC-0003](../../design/rfcs/MMSP-RFC-0003-message-requests.md) Message Requests: `webdata` joined the growing fields. §3.2 specified the web tool endpoints: they answer in one JSON, and Jina's event stream, which sends the whole page again as it loads, is not read; a client sends one request per message, each answer goes out as one `webtool` item, and the `stop` carries `finish_reason` `stop` and, as `prompt_tokens`, the tokens billed or one per request billed, summed over the requests; a search asks for the results' summaries, never their pages' bodies. §6.1 named `-search` and `-fetch` among the modality markers, and §6.3 stated that a model that does not think ignores the thinking level.
- [MMSP-RFC-0005](../../design/rfcs/MMSP-RFC-0005-client-routing.md) Client Routing: `deepseek-official` serves `deepseek-search` and `deepseek-fetch` through `deepseek-webtool`, named or deduced, so model ids are matched by prefix or as whole ids; a client whose endpoint lists no models raises `UnsupportedOperationError` from `list_models`, as `anthropic-official` already did on Bedrock.
- [MMSP-RFC-0006](../../design/rfcs/MMSP-RFC-0006-upstream-credentials.md) Upstream Credentials: a row's other default endpoints, `other_base_urls`, take the environment's key as its default endpoint does, and a client passed no base URL calls the one of its default endpoints that serves its model. `ApiKeyRequiredError` for a client given no key covers every client on the OpenAI SDK whose key variable is not `OPENAI_API_KEY`, compatible clients included, except a client of an open server.
