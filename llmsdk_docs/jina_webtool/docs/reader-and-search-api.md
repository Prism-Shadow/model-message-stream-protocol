> Source: https://docs.jina.ai/api.md (snapshot 2026-11-02; the introduction, the Reader POST and the Search POST sections. Spec: https://docs.jina.ai/openapi.json)

# Jina AI API reference

Jina AI APIs on three hosts: Reader (`r.jina.ai`), Search (`s.jina.ai`) and the Search Foundation models (`api.jina.ai`).

| I want to | Endpoint |
|---|---|
| Read a web page or PDF as LLM-friendly Markdown | [GET r.jina.ai/{url}](https://docs.jina.ai/#tag/reader/GET/{url}) · [POST r.jina.ai](https://docs.jina.ai/#tag/reader/POST/) |
| Search the web and get the result pages as text | [GET s.jina.ai/{q}](https://docs.jina.ai/#tag/search/GET/{q}) · [POST s.jina.ai/search](https://docs.jina.ai/#tag/search/POST/search) |
| Embed text, images, audio, video or PDFs | [POST /v1/embeddings](https://docs.jina.ai/#tag/search-foundation-models/POST/v1/embeddings) |
| Rerank candidates against a query | [POST /v1/rerank](https://docs.jina.ai/#tag/search-foundation-models/POST/v1/rerank) |
| Transcribe a document image (OCR) | [POST /v1/chat/completions](https://docs.jina.ai/#tag/generative-models/POST/v1/chat/completions) |
| Embed a large dataset asynchronously | [POST /v1/batch/embeddings](https://docs.jina.ai/#tag/batch-embeddings/POST/v1/batch/embeddings) |
| See which models exist and what they cost | [GET /v1/models](https://docs.jina.ai/#tag/model-list/GET/v1/models) |

**Authentication.** Send `Authorization: Bearer <your Jina API key>`. Get a key at https://jina.ai/?sui=apikey. Reader also answers without a key, at a lower rate limit; Search needs one.

**EU.** `eu.r.jina.ai` and `eu.s.jina.ai` keep all processing inside the EU.

**For LLMs.** `curl docs.jina.ai` returns the meta-prompt, a plain-text guide to these APIs written for coding agents. This reference as Markdown: `curl docs.jina.ai/api.md`.

**Rate limits.** r.jina.ai 500 RPM (5k premium), s.jina.ai 100 RPM (1k premium).

_Merged from https://api.jina.ai/openapi.json, https://r.jina.ai/openapi.json, https://s.jina.ai/openapi.json. Plain text: https://docs.jina.ai/api.md. Spec: https://docs.jina.ai/openapi.json._

Best-in-class embeddings, rerankers and document models for multilingual and multimodal search.

### Capabilities

- **Text embeddings** — dense vectors for semantic search, similarity, clustering and classification, in 100+ languages.
- **Multimodal embeddings** — images, video, audio and PDFs embedded into the same space as text, so a query in one modality retrieves another.
- **Reranking** — score a query against a candidate set and reorder it; more accurate than embedding similarity, and the usual second stage after it.
- **Document OCR** — read a page image and return its content as text or markdown, with tables and layout preserved, over the OpenAI chat completions schema.
- **Batch embeddings** — the same embedding models over JSONL, asynchronously, for workloads too large to send inline.

### Authentication

Every endpoint except `GET /v1/models` requires a key:

```
Authorization: Bearer jina_YOUR_API_KEY
```

Get one at [jina.ai/api-dashboard/key-manager](https://jina.ai/api-dashboard/key-manager).

### Rate limits

Requests per minute and tokens per minute. Anything over a limit answers `429`.

| Endpoint | Free | Paid | Premium |
|---|---|---|---|
| `/v1/embeddings` | 500 RPM · 1M TPM | 500 RPM · 10M TPM | 5,000 RPM · 100M TPM |
| `/v1/rerank` | 500 RPM · 1M TPM | 500 RPM · 10M TPM | 5,000 RPM · 100M TPM |
| `/v1/chat/completions` | 100 RPM · 500K TPM | 100 RPM · 5M TPM | 1,000 RPM · 50M TPM |

### Errors

Failures carry a `detail`, a `code` from the table below and the `request_id` to quote in a support request. `/v1/chat/completions` is the exception: it answers in OpenAI's error envelope, with the same code inside it.

| Code | Status | Meaning |
|---|---|---|
| `INPUT_INVALID_LABELS` | 400 | Invalid training labels |
| `INPUT_LABEL_LIMIT_EXCEEDED` | 400 | Label limit exceeded: <current> labels provided, maximum <limit> allowed for your plan |
| `INPUT_MODEL_NOT_FOUND` | 400 | Model '<model>' not found |
| `INPUT_TOKEN_LIMIT_EXCEEDED` | 400 | Input text exceeds the model's maximum of <max_tokens> tokens |
| `AUTH_INVALID_API_KEY` | 401 | Invalid API key |
| `AUTH_INVALID_FORMAT` | 401 | Invalid authorization format |
| `AUTH_MISSING_API_KEY` | 401 | Authentication required |
| `AUTHZ_INSUFFICIENT_BALANCE` | 403 | Insufficient account balance |
| `AUTHZ_RESOURCE_LIMIT_EXCEEDED` | 403 | Resource limit exceeded for your plan |
| `RESOURCE_NOT_FOUND` | 404 | <resource_type> '<resource_id>' not found or access denied |
| `CONFLICT_RESOURCE_BUSY` | 409 | <resource_type> '<resource_id>' is currently being modified |
| `RATE_CONCURRENCY_LIMIT_EXCEEDED` | 429 | Concurrency limit exceeded: <current>/<limit> concurrent requests |
| `RATE_IP_LIMIT_EXCEEDED` | 429 | IP rate limit exceeded |
| `RATE_REQUEST_LIMIT_EXCEEDED` | 429 | Request rate limit exceeded: <current>/<limit> requests per minute |
| `RATE_TOKEN_LIMIT_EXCEEDED` | 429 | Token rate limit exceeded: <current>/<limit> tokens per minute |
| `INTERNAL_ERROR` | 500 | An unexpected error occurred |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `SERVICE_TIMEOUT` | 504 | Service request timed out |

## Reader API (r.jina.ai)

### Reader

Read a URL and get its content back in an LLM-friendly format.

#### POST https://r.jina.ai/

**Read a URL (JSON body)**

Send `{"url": "..."}` as JSON, with the same `X-*` headers as the GET form.

`Accept: application/json` returns JSON: the content is in `data.content`, and with `X-With-Links-Summary` / `X-With-Images-Summary` the links and images are in `data.links` and `data.images`. `Accept: text/event-stream` streams the result.

Authentication: optional.

Parameters:
- `url` (query, string): The URL to read. Not needed when the URL is already in the path (`https://r.jina.ai/<url>`).
- `preloadUrl` (query, string): URL to preload before scraping. Ignored when no URL is provided.
- `noServiceWorker` (query, boolean | string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.
- `html` (query, string): Raw HTML to convert, instead of fetching a URL. Used when no `url` is given.
- `base` (query, "initial" | "final", default "final"): Select base modes of relative URLs. Supported: initial, final
- `pdf` (query, string): Base64 encoded PDF.
- `file` (query, string): Base64-encoded file (PDF, DOC, XLS, PPT, ...) to convert instead of a URL.
- `page` (query, integer | string | array<integer | string>): Steer which page(s) to return for document files. See PageSelection.
- `respondWith` (query, "content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | "frontmatter" | "readability" | "jina-ocr-v1" | "jina-ocr" | ... (15 values) | string, default "content"): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `withGeneratedAlt` (query, boolean | string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `retainImages` (query, "none" | "all" | "alt" | "all_p" | "alt_p", default "all"): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `retainMedia` (query, "none" | "text" | "link" | "image" | "html", default "link"): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `preset` (query, "reader" | "index" | "research" | "agent" | "spider" | "ocr" | "ocr+" | "ocr++" | "pdf" | "pdf+" | "pdf++"): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `retainLinks` (query, "none" | "all" | "text" | "gpt-oss", default "all"): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `withLinksSummary` (query, boolean | string | string): Enable dedicated summary section for hyper links on the page.
- `withImagesSummary` (query, boolean | string): Enable dedicated summary section for images on the page.
- `noCache` (query, boolean | string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `removeOverlay` (query, boolean | string): Specify whether to remove overlay elements from the page.
- `detachInvisibles` (query, boolean | string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `noGfm` (query, boolean | string | string): Opt out of GitHub Flavored Markdown. `true` disables GFM; `table` drops only GFM tables and keeps the table HTML.
- `cacheTolerance` (query, number): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `targetSelector` (query, string): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `waitForSelector` (query, string): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `removeSelector` (query, string): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `keepImgDataUrl` (query, boolean | string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `withIframe` (query, boolean | string | string): Enable filling iframe contents into main. (violates standards)
- `withShadowDom` (query, boolean | string): Enable filling shadow dom contents into main. (violates standards)
- `skipCertVerification` (query, boolean | string): Enable skipping SSL certificate verification. (violates security best practices)
- `webBotAuth` (query, boolean | string | "authority" | "target-uri")
- `setCookies` (query, any | string): Cookies to send when fetching the URL, for pages that need a login. Requests with cookies are not cached.
- `exportStorageState` (query, boolean | string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `proxyUrl` (query, string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `proxyResources` (query, boolean | string): Whether to load resources like image/style/scripts via the proxy server.
- `proxy` (query, string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `userAgent` (query, string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `engine` (query, "auto" | "browser" | "curl" | "cf-browser-rendering" | string): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `injectPageScript` (query, string): JavaScript to run in the page before extraction, inline or as a URL, e.g. to change the DOM.
- `injectFrameScript` (query, string): Like `injectPageScript`, for frames.
- `timeout` (query, number): - Some validators will be applied on value(s): (v) =&gt; v &gt; 0 &amp;&amp; v &lt;= 180
- `locale` (query, string): Specify browser locale for the page.
- `referer` (query, string): Specify referer for the page.
- `tokenBudget` (query, number): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `assertStatusCode` (query, number): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `instruction` (query, string)
- `jsonSchema` (query, any): Can be any value - string, number, boolean, array or object.
- `robotsTxt` (query, boolean | string | string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `zeroDataRetention` (query, boolean | string)
- `respondTiming` (query, "html" | "visible-content" | "mutation-idle" | "resource-idle" | "media-idle" | "network-idle"): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `markdownChunking` (query, "true" | "h1" | "h2" | "h3" | "h4" | "h5" | "structured" | "s1" | "s2" | "s3" | "s4" | "s5" | string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `maxTokens` (query, number): - Some validators will be applied on value(s): (v) =&gt; v &gt;= 500
- `Accept` (header, string): Specifies your preference for the response format. Supported formats: - text/event-stream - application/json or text/json - text/plain
- `X-Cache-Tolerance` (header, string): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `X-No-Cache` (header, string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `X-Respond-With` (header, string): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `X-Wait-For-Selector` (header, string): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `X-Target-Selector` (header, string): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `X-Remove-Selector` (header, string): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `X-Keep-Img-Data-Url` (header, string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `X-Proxy-Url` (header, string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `X-Proxy-Resources` (header, string): Whether to load resources like image/style/scripts via the proxy server.
- `X-Proxy` (header, string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `X-Robots-Txt` (header, string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `DNT` (header, string): When set to 1, prevent the result of this request to be cached in the system.
- `X-Set-Cookie` (header, string): Sets cookie(s) to the headless browser for your request. Syntax is the same with standard Set-Cookie
- `X-Export-Storage-State` (header, string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `X-With-Generated-Alt` (header, string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `X-With-Images-Summary` (header, string): Enable dedicated summary section for images on the page.
- `X-With-links-Summary` (header, string): Enable dedicated summary section for hyper links on the page.
- `X-Retain-Links` (header, string): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `X-Retain-Images` (header, string): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `X-Retain-Media` (header, string): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `X-Preset` (header, string): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `X-With-Iframe` (header, string): Enable filling iframe contents into main. (violates standards)
- `X-With-Shadow-Dom` (header, string): Enable filling shadow dom contents into main. (violates standards)
- `X-Skip-Cert-Verification` (header, string): Enable skipping SSL certificate verification. (violates security best practices)
- `X-User-Agent` (header, string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `X-Timeout` (header, string): Specify timeout in seconds. Max 180.
- `X-Locale` (header, string): Specify browser locale for the page.
- `X-Referer` (header, string): Specify referer for the page.
- `X-Token-Budget` (header, string): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `X-Max-Tokens` (header, string): Trim the response content at a maximum number of tokens.
- `X-Assert-Status-Code` (header, string): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `X-Respond-Timing` (header, string): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `X-Engine` (header, string): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `X-Base` (header, string): Select base modes of relative URLs. Supported: initial, final
- `X-Remove-Overlay` (header, string): Specify whether to remove overlay elements from the page.
- `X-Detach-Invisibles` (header, string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `X-Markdown-Chunking` (header, string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `X-Md-Heading-Style` (header, string): Heading style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: setext, atx
- `X-Md-Hr` (header, string): Hr text of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options).
- `X-Md-Bullet-List-Marker` (header, string): Bullet list marker of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: -, +, *
- `X-Md-Em-Delimiter` (header, string): Em delimiter of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: _, *
- `X-Md-Strong-Delimiter` (header, string): Strong delimiter of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: **, __
- `X-Md-Link-Style` (header, string): Link style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: inlined, referenced, discarded
- `X-Md-Link-Reference-Style` (header, string): Link reference style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: full, collapsed, shortcut, discarded
- `X-Page` (header, string): Steer which page to return for uploaded files (PDF, DOC, XLS, PPT, etc.). 1-indexed, 0 is the same as 1. Accepts a page number, a list and/or ranges like `1,3,5-7`. At most 35 pages can be selected. With multiple pages, DocLayout / OCR runs over each selected page. Ignored when the target is not a document.
- `X-Preload-Url` (header, string): URL to preload before scraping. Ignored when no URL is provided.
- `X-No-Service-Worker` (header, string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.

Request body (`application/json`):
- `url` (string): The URL to read. Not needed when the URL is already in the path (`https://r.jina.ai/<url>`).
- `preloadUrl` (string): URL to preload before scraping. Ignored when no URL is provided.
- `noServiceWorker` (boolean | string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.
- `html` (string): Raw HTML to convert, instead of fetching a URL. Used when no `url` is given.
- `base` ("initial" | "final", default "final"): Select base modes of relative URLs. Supported: initial, final
- `pdf` (string): Base64 encoded PDF.
- `file` (string): Base64-encoded file (PDF, DOC, XLS, PPT, ...) to convert instead of a URL.
- `page` (integer | string | array<integer | string>): Steer which page(s) to return for document files. See PageSelection.
- `respondWith` ("content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | "frontmatter" | "readability" | "jina-ocr-v1" | "jina-ocr" | ... (15 values) | string, default "content"): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `withGeneratedAlt` (boolean | string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `retainImages` ("none" | "all" | "alt" | "all_p" | "alt_p", default "all"): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `retainMedia` ("none" | "text" | "link" | "image" | "html", default "link"): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `preset` ("reader" | "index" | "research" | "agent" | "spider" | "ocr" | "ocr+" | "ocr++" | "pdf" | "pdf+" | "pdf++"): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `retainLinks` ("none" | "all" | "text" | "gpt-oss", default "all"): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `withLinksSummary` (boolean | string | string): Enable dedicated summary section for hyper links on the page.
- `withImagesSummary` (boolean | string): Enable dedicated summary section for images on the page.
- `noCache` (boolean | string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `removeOverlay` (boolean | string): Specify whether to remove overlay elements from the page.
- `detachInvisibles` (boolean | string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `noGfm` (boolean | string | string): Opt out of GitHub Flavored Markdown. `true` disables GFM; `table` drops only GFM tables and keeps the table HTML.
- `cacheTolerance` (number): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `targetSelector` (array<string>): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `waitForSelector` (array<string>): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `removeSelector` (array<string>): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `keepImgDataUrl` (boolean | string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `withIframe` (boolean | string | string): Enable filling iframe contents into main. (violates standards)
- `withShadowDom` (boolean | string): Enable filling shadow dom contents into main. (violates standards)
- `skipCertVerification` (boolean | string): Enable skipping SSL certificate verification. (violates security best practices)
- `webBotAuth` (boolean | string | "authority" | "target-uri")
- `setCookies` (array<any | string>): Cookies to send when fetching the URL, for pages that need a login. Requests with cookies are not cached.
- `storageState` (StorageState)
  - `cookies` (array<Cookie>, default [])
    - `name` (string, required): [REQUIRED]
    - `value` (string, required): [REQUIRED]
    - `domain` (string)
    - `path` (string, default "/")
    - `expires` (string)
    - `httpOnly` (boolean)
    - `secure` (boolean)
    - `sameSite` ("Strict" | "Lax" | "None" | string)
  - `origins` (array<LocalStorageOrigin>, default [])
    - `origin` (string, required): [REQUIRED]
    - `localStorage` (array<LocalStorageItem>, default [])
- `exportStorageState` (boolean | string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `proxyUrl` (string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `proxyResources` (boolean | string): Whether to load resources like image/style/scripts via the proxy server.
- `proxy` (string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `userAgent` (string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `engine` ("auto" | "browser" | "curl" | "cf-browser-rendering" | string): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `injectPageScript` (array<string>): JavaScript to run in the page before extraction, inline or as a URL, e.g. to change the DOM.
- `injectFrameScript` (array<string>): Like `injectPageScript`, for frames.
- `timeout` (number): - Some validators will be applied on value(s): (v) =&gt; v &gt; 0 &amp;&amp; v &lt;= 180
- `locale` (string): Specify browser locale for the page.
- `referer` (string): Specify referer for the page.
- `tokenBudget` (number): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `assertStatusCode` (number): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `viewport` (Viewport)
  - `width` (number, default 1280)
  - `height` (number, default 1280)
  - `deviceScaleFactor` (number)
  - `isMobile` (boolean)
  - `isLandscape` (boolean)
  - `hasTouch` (boolean)
- `instruction` (string)
- `jsonSchema` (any): Can be any value - string, number, boolean, array or object.
- `robotsTxt` (boolean | string | string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `zeroDataRetention` (boolean | string)
- `markdown` (TurnDownTweakableOptions)
  - `headingStyle` ("setext" | "atx"): Turndown options > headingStyle
  - `hr` (string): Turndown options > hr - Some validators will be applied on value(s): (v) =&gt; v.length &gt; 0 &amp;&amp; v.length &lt;= 128
  - `bulletListMarker` ("-" | "+" | "*"): Turndown options > bulletListMarker
  - `emDelimiter` ("_" | "*"): Turndown options > emDelimiter
  - `strongDelimiter` ("__" | "**"): Turndown options > strongDelimiter
  - `linkStyle` ("inlined" | "referenced" | "discarded"): Turndown options > linkStyle
  - `linkReferenceStyle` ("full" | "collapsed" | "shortcut" | "discarded"): Turndown options > linkReferenceStyle
- `ocr` (OCRPreferences)
  - `preferEndToEnd` (boolean): Prefer end-to-end OCR mode (over PDF text)
  - `preferImgOrder` (boolean): Prefer better image order over particular markdown format (only applies in end-to-end mode)
  - `inlineFormula` (boolean): Blocks with inline formulas should go through OCR (only applies in non-end-to-end mode)
  - `blockFormula` (boolean, default true): Formula blocks should go through OCR (only applies in non-end-to-end mode)
  - `table` (boolean, default true): Table blocks should go through OCR (only applies in non-end-to-end mode)
- `respondTiming` ("html" | "visible-content" | "mutation-idle" | "resource-idle" | "media-idle" | "network-idle"): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `markdownChunking` ("true" | "h1" | "h2" | "h3" | "h4" | "h5" | "structured" | "s1" | "s2" | "s3" | "s4" | "s5" | string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `maxTokens` (number): - Some validators will be applied on value(s): (v) =&gt; v &gt;= 500
- `customHeader` (object)

Responses:
- `200`: OK
- `400`: Bad Request
- `401`: Unauthorized
- `402`: Payment Required
- `403`: Forbidden
- `409`: Conflict
- `413`: Payload Too Large
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `451`: Unavailable For Legal Reasons
- `500`: Internal Server Error
- `503`: Service Unavailable


#### POST https://s.jina.ai/search

**Search the web (JSON body)**

Send `{"q": "..."}` as JSON, optionally with `gl`, `hl`, `location`, `num` and `page`. Same `X-*` headers as the GET form.

Authentication: optional.

Parameters:
- `url` (query, string): The URL to read. Not needed when the URL is already in the path (`https://r.jina.ai/<url>`).
- `preloadUrl` (query, string): URL to preload before scraping. Ignored when no URL is provided.
- `noServiceWorker` (query, boolean | string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.
- `html` (query, string): Raw HTML to convert, instead of fetching a URL. Used when no `url` is given.
- `base` (query, "initial" | "final", default "final"): Select base modes of relative URLs. Supported: initial, final
- `pdf` (query, string): Base64 encoded PDF.
- `file` (query, string): Base64-encoded file (PDF, DOC, XLS, PPT, ...) to convert instead of a URL.
- `page` (query, number): Steer which page to return for uploaded files (PDF, DOC, XLS, PPT, etc.). 1-indexed, 0 is the same as 1. Accepts a page number, a list and/or ranges like `1,3,5-7`. At most 35 pages can be selected. With multiple pages, DocLayout / OCR runs over each selected page. Ignored when the target is not a document.
- `respondWith` (query, "content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | "frontmatter" | "readability" | "jina-ocr-v1" | "jina-ocr" | ... (15 values) | string, default "content"): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `withGeneratedAlt` (query, boolean | string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `retainImages` (query, "none" | "all" | "alt" | "all_p" | "alt_p", default "all"): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `retainMedia` (query, "none" | "text" | "link" | "image" | "html", default "link"): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `preset` (query, "reader" | "index" | "research" | "agent" | "spider" | "ocr" | "ocr+" | "ocr++" | "pdf" | "pdf+" | "pdf++"): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `retainLinks` (query, "none" | "all" | "text" | "gpt-oss", default "all"): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `withLinksSummary` (query, boolean | string | string): Enable dedicated summary section for hyper links on the page.
- `withImagesSummary` (query, boolean | string): Enable dedicated summary section for images on the page.
- `noCache` (query, boolean | string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `removeOverlay` (query, boolean | string): Specify whether to remove overlay elements from the page.
- `detachInvisibles` (query, boolean | string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `noGfm` (query, boolean | string | string): Opt out of GitHub Flavored Markdown. `true` disables GFM; `table` drops only GFM tables and keeps the table HTML.
- `cacheTolerance` (query, number): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `targetSelector` (query, string): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `waitForSelector` (query, string): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `removeSelector` (query, string): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `keepImgDataUrl` (query, boolean | string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `withIframe` (query, boolean | string | string): Enable filling iframe contents into main. (violates standards)
- `withShadowDom` (query, boolean | string): Enable filling shadow dom contents into main. (violates standards)
- `skipCertVerification` (query, boolean | string): Enable skipping SSL certificate verification. (violates security best practices)
- `webBotAuth` (query, boolean | string | "authority" | "target-uri")
- `setCookies` (query, any | string): Cookies to send when fetching each result page, for pages that need a login. Requests with cookies are not cached.
- `exportStorageState` (query, boolean | string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `proxyUrl` (query, string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `proxyResources` (query, boolean | string): Whether to load resources like image/style/scripts via the proxy server.
- `proxy` (query, string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `userAgent` (query, string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `engine` (query, "google" | "bing" | "reader"): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `injectPageScript` (query, string): JavaScript to run in each result page before extraction, inline or as a URL.
- `injectFrameScript` (query, string): Like `injectPageScript`, for frames.
- `timeout` (query, number): - Some validators will be applied on value(s): (v) =&gt; v &gt; 0 &amp;&amp; v &lt;= 180
- `locale` (query, string): Specify browser locale for the page.
- `referer` (query, string): Specify referer for the page.
- `tokenBudget` (query, number): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `assertStatusCode` (query, number): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `instruction` (query, string)
- `jsonSchema` (query, any): Can be any value - string, number, boolean, array or object.
- `robotsTxt` (query, boolean | string | string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `zeroDataRetention` (query, boolean | string)
- `respondTiming` (query, "html" | "visible-content" | "mutation-idle" | "resource-idle" | "media-idle" | "network-idle"): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `markdownChunking` (query, "true" | "h1" | "h2" | "h3" | "h4" | "h5" | "structured" | "s1" | "s2" | "s3" | "s4" | "s5" | string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `maxTokens` (query, number): - Some validators will be applied on value(s): (v) =&gt; v &gt;= 500
- `ext` (query, string): Search operator `ext:` (file extension).
- `filetype` (query, string): Search operator `filetype:`, e.g. `pdf`.
- `intitle` (query, string): Search operator `intitle:`: words that must appear in the page title.
- `loc` (query, string): Search operator `loc:` (location).
- `site` (query, string): Keep results to this domain, e.g. `https://jina.ai`. Same as the `X-Site` header.
- `type` (query, "web" | "images" | "news", default "web"): Result type: `web` (default), `images` or `news`.
- `num` (query, number): Maximum number of results, 0 to 20, default 10. Larger values can add latency and drop special result types.
- `count` (query, number): Same as `num`.
- `provider` (query, "google" | "bing" | "reader"): Search engine to use: `google`, `bing` or `reader`.
- `gl` (query, string): Country to search from, as a two-letter country code.
- `hl` (query, string): Language of the search, as a two-letter language code.
- `location` (query, string): Where the search should originate from. City level works best.
- `fallback` (query, boolean): If `true` and the search returns nothing, fall back to local search results. Default `false`.
- `q` (query, string): The search query. Not needed when the query is already in the path (`https://s.jina.ai/<query>`).
- `nfpr` (query, boolean): Passed to the search engine; on Google, `true` turns off query auto-correction.
- `Accept` (header, string): Specifies your preference for the response format. Supported formats: - text/event-stream - application/json or text/json - text/plain
- `X-Cache-Tolerance` (header, string): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `X-No-Cache` (header, string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `X-Respond-With` (header, string): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `X-Wait-For-Selector` (header, string): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `X-Target-Selector` (header, string): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `X-Remove-Selector` (header, string): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `X-Keep-Img-Data-Url` (header, string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `X-Proxy-Url` (header, string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `X-Proxy-Resources` (header, string): Whether to load resources like image/style/scripts via the proxy server.
- `X-Proxy` (header, string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `X-Robots-Txt` (header, string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `DNT` (header, string): When set to 1, prevent the result of this request to be cached in the system.
- `X-Set-Cookie` (header, string): Sets cookie(s) to the headless browser for your request. Syntax is the same with standard Set-Cookie
- `X-Export-Storage-State` (header, string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `X-With-Generated-Alt` (header, string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `X-With-Images-Summary` (header, string): Enable dedicated summary section for images on the page.
- `X-With-links-Summary` (header, string): Enable dedicated summary section for hyper links on the page.
- `X-Retain-Links` (header, string): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `X-Retain-Images` (header, string): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `X-Retain-Media` (header, string): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `X-Preset` (header, string): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `X-With-Iframe` (header, string): Enable filling iframe contents into main. (violates standards)
- `X-With-Shadow-Dom` (header, string): Enable filling shadow dom contents into main. (violates standards)
- `X-Skip-Cert-Verification` (header, string): Enable skipping SSL certificate verification. (violates security best practices)
- `X-User-Agent` (header, string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `X-Timeout` (header, string): Specify timeout in seconds. Max 180.
- `X-Locale` (header, string): Specify browser locale for the page.
- `X-Referer` (header, string): Specify referer for the page.
- `X-Token-Budget` (header, string): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `X-Max-Tokens` (header, string): Trim the response content at a maximum number of tokens.
- `X-Assert-Status-Code` (header, string): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `X-Respond-Timing` (header, string): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `X-Engine` (header, string): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `X-Base` (header, string): Select base modes of relative URLs. Supported: initial, final
- `X-Remove-Overlay` (header, string): Specify whether to remove overlay elements from the page.
- `X-Detach-Invisibles` (header, string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `X-Markdown-Chunking` (header, string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `X-Md-Heading-Style` (header, string): Heading style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: setext, atx
- `X-Md-Hr` (header, string): Hr text of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options).
- `X-Md-Bullet-List-Marker` (header, string): Bullet list marker of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: -, +, *
- `X-Md-Em-Delimiter` (header, string): Em delimiter of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: _, *
- `X-Md-Strong-Delimiter` (header, string): Strong delimiter of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: **, __
- `X-Md-Link-Style` (header, string): Link style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: inlined, referenced, discarded
- `X-Md-Link-Reference-Style` (header, string): Link reference style of the generated markdown. This is an option passed through to [Turndown](https://github.com/mixmark-io/turndown?tab=readme-ov-file#options). Supported: full, collapsed, shortcut, discarded
- `X-Page` (header, string): Steer which page to return for uploaded files (PDF, DOC, XLS, PPT, etc.). 1-indexed, 0 is the same as 1. Accepts a page number, a list and/or ranges like `1,3,5-7`. At most 35 pages can be selected. With multiple pages, DocLayout / OCR runs over each selected page. Ignored when the target is not a document.
- `X-Preload-Url` (header, string): URL to preload before scraping. Ignored when no URL is provided.
- `X-No-Service-Worker` (header, string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.

Request body (`application/json`):
- `url` (string): The URL to read. Not needed when the URL is already in the path (`https://r.jina.ai/<url>`).
- `preloadUrl` (string): URL to preload before scraping. Ignored when no URL is provided.
- `noServiceWorker` (boolean | string): Disable service workers when running the browser. Useful for bypassing service-worker-based caching or interception.
- `html` (string): Raw HTML to convert, instead of fetching a URL. Used when no `url` is given.
- `base` ("initial" | "final", default "final"): Select base modes of relative URLs. Supported: initial, final
- `pdf` (string): Base64 encoded PDF.
- `file` (string): Base64-encoded file (PDF, DOC, XLS, PPT, ...) to convert instead of a URL.
- `page` (number): Steer which page to return for uploaded files (PDF, DOC, XLS, PPT, etc.). 1-indexed, 0 is the same as 1. Accepts a page number, a list and/or ranges like `1,3,5-7`. At most 35 pages can be selected. With multiple pages, DocLayout / OCR runs over each selected page. Ignored when the target is not a document.
- `respondWith` ("content" | "markdown" | "html" | "text" | "pageshot" | "screenshot" | "vlm" | "readerlm-v2" | "frontmatter" | "readability" | "jina-ocr-v1" | "jina-ocr" | ... (15 values) | string, default "content"): Specifies the (non-default) form of the crawled data you prefer. Supported formats: - markdown - html - text - pageshot - screenshot - content - frontmatter - any combination of the above - vlm - jina-ocr-v1 - jina-ocr - readerlm-v2 Default: content
- `withGeneratedAlt` (boolean | string): Enable automatic alt-text generating for images without an meaningful alt-text. Note: Does not work when `X-Respond-With` is specified
- `retainImages` ("none" | "all" | "alt" | "all_p" | "alt_p", default "all"): Image retention modes. Supported modes: - all: all images - none: no images - alt: only alt text - all_p: all images and with generated alt text - alt_p: only alt text and with generated alt
- `retainMedia` ("none" | "text" | "link" | "image" | "html", default "link"): Media retention modes for video, audio, and embedded video iframes. Supported modes: - none: no media - text: plain label, e.g. `Video 1` - link: markdown link, e.g. `[Video 1](url)` (default) - image: markdown image syntax, e.g. `![Video 1](url)` - html: original HTML with irrelevant attributes (class, id, style, data-*, aria-*) stripped
- `preset` ("reader" | "index" | "research" | "agent" | "spider" | "ocr" | "ocr+" | "ocr++" | "pdf" | "pdf+" | "pdf++"): Apply a preset configuration for common scenarios. Supported presets: - reader: optimized for display to human users - index: optimized for semantic indexing - research: optimized for academic/research AI agents - agent: optimized for day-to-day AI agents - spider: optimized for recursive site crawling Preset values are applied only to options not explicitly set by the caller.
- `retainLinks` ("none" | "all" | "text" | "gpt-oss", default "all"): Link retention modes. Supported modes: - all: all links - none: no links - text: only link text - gpt-oss: gpt-oss link citation format `【{id}†.*】`
- `withLinksSummary` (boolean | string | string): Enable dedicated summary section for hyper links on the page.
- `withImagesSummary` (boolean | string): Enable dedicated summary section for images on the page.
- `noCache` (boolean | string): Ignores internal cache if this header is specified with a value. Equivalent to X-Cache-Tolerance: 0
- `removeOverlay` (boolean | string): Specify whether to remove overlay elements from the page.
- `detachInvisibles` (boolean | string): Temporarily detach elements with computed `display:none` before snapshotting, then restore them. Requires the browser engine and disables caching.
- `noGfm` (boolean | string | string): Opt out of GitHub Flavored Markdown. `true` disables GFM; `table` drops only GFM tables and keeps the table HTML.
- `cacheTolerance` (number): Sets internal cache tolerance in seconds if this header is specified with a integer.
- `targetSelector` (array<string>): Specifies a CSS selector for return target instead of the full html. Implies `X-Wait-For-Selector: (same selector)`
- `waitForSelector` (array<string>): Specifies a CSS selector to wait for the appearance of such an element before returning. Example: `X-Wait-For-Selector: .content-block`
- `removeSelector` (array<string>): Specifies a CSS selector to remove elements from the full html. Example `X-Remove-Selector: nav`
- `keepImgDataUrl` (boolean | string): Keep data-url as it instead of transforming them to object-url. (Only applicable when targeting markdown format) Example `X-Keep-Img-Data-Url: true`
- `withIframe` (boolean | string | string): Enable filling iframe contents into main. (violates standards)
- `withShadowDom` (boolean | string): Enable filling shadow dom contents into main. (violates standards)
- `skipCertVerification` (boolean | string): Enable skipping SSL certificate verification. (violates security best practices)
- `webBotAuth` (boolean | string | "authority" | "target-uri")
- `setCookies` (array<any | string>): Cookies to send when fetching each result page, for pages that need a login. Requests with cookies are not cached.
- `storageState` (StorageState)
  - `cookies` (array<Cookie>, default [])
    - `name` (string, required): [REQUIRED]
    - `value` (string, required): [REQUIRED]
    - `domain` (string)
    - `path` (string, default "/")
    - `expires` (string)
    - `httpOnly` (boolean)
    - `secure` (boolean)
    - `sameSite` ("Strict" | "Lax" | "None" | string)
  - `origins` (array<LocalStorageOrigin>, default [])
    - `origin` (string, required): [REQUIRED]
    - `localStorage` (array<LocalStorageItem>, default [])
- `exportStorageState` (boolean | string): Export the browser storage state (cookies and per-origin localStorage) accumulated during the crawl. When enabled, the JSON response includes a `storageState` field whose shape mirrors the `storageState` request option, so it can be fed back into a subsequent request. Requires the browser engine and disables caching.
- `proxyUrl` (string): Specifies your custom proxy if you prefer to use one. Supported protocols: - http - https - socks4 - socks5 For authentication, https://user:pass@host:port
- `proxyResources` (boolean | string): Whether to load resources like image/style/scripts via the proxy server.
- `proxy` (string): Use a proxy server provided by us. Optionally specify two-letter country code.
- `userAgent` (string): Override User-Agent. Several special values: - browser: use the internal browser UA - auto: pass-through your UA if it starts with `Mozilla/5.0`, otherwise use the internal browser UA - inherit / pass-through: use the User-Agent from the request context if applicable - bot: Use a pre-defined bot User-Agent from this service - diversify: Use a diversified browser User-Agent Or specify your own user agent string. Note: anonymous users specifying a browser UA will have no effect and will fall back to the internal browser UA. Default: browser
- `engine` ("google" | "bing" | "reader"): Specify the engine to use for crawling. Supported: browser, direct, cf-browser-rendering
- `injectPageScript` (array<string>): JavaScript to run in each result page before extraction, inline or as a URL.
- `injectFrameScript` (array<string>): Like `injectPageScript`, for frames.
- `timeout` (number): - Some validators will be applied on value(s): (v) =&gt; v &gt; 0 &amp;&amp; v &lt;= 180
- `locale` (string): Specify browser locale for the page.
- `referer` (string): Specify referer for the page.
- `tokenBudget` (number): Specify a budget in tokens. If the resulting token cost exceeds the budget, the request is rejected. Note this parameter is ignored for the search endpoint.
- `assertStatusCode` (number): Assert the HTTP status code of the crawled page. If the actual status code does not match the asserted one, the request is rejected with 422 Unprocessable Entity.
- `viewport` (Viewport)
  - `width` (number, default 1280)
  - `height` (number, default 1280)
  - `deviceScaleFactor` (number)
  - `isMobile` (boolean)
  - `isLandscape` (boolean)
  - `hasTouch` (boolean)
- `instruction` (string)
- `jsonSchema` (any): Can be any value - string, number, boolean, array or object.
- `robotsTxt` (boolean | string | string): Load and conform to the respective robot.txt on the target origin. Optionally specify a bot UA to check against.
- `zeroDataRetention` (boolean | string)
- `markdown` (TurnDownTweakableOptions)
  - `headingStyle` ("setext" | "atx"): Turndown options > headingStyle
  - `hr` (string): Turndown options > hr - Some validators will be applied on value(s): (v) =&gt; v.length &gt; 0 &amp;&amp; v.length &lt;= 128
  - `bulletListMarker` ("-" | "+" | "*"): Turndown options > bulletListMarker
  - `emDelimiter` ("_" | "*"): Turndown options > emDelimiter
  - `strongDelimiter` ("__" | "**"): Turndown options > strongDelimiter
  - `linkStyle` ("inlined" | "referenced" | "discarded"): Turndown options > linkStyle
  - `linkReferenceStyle` ("full" | "collapsed" | "shortcut" | "discarded"): Turndown options > linkReferenceStyle
- `ocr` (OCRPreferences)
  - `preferEndToEnd` (boolean): Prefer end-to-end OCR mode (over PDF text)
  - `preferImgOrder` (boolean): Prefer better image order over particular markdown format (only applies in end-to-end mode)
  - `inlineFormula` (boolean): Blocks with inline formulas should go through OCR (only applies in non-end-to-end mode)
  - `blockFormula` (boolean, default true): Formula blocks should go through OCR (only applies in non-end-to-end mode)
  - `table` (boolean, default true): Table blocks should go through OCR (only applies in non-end-to-end mode)
- `respondTiming` ("html" | "visible-content" | "mutation-idle" | "resource-idle" | "media-idle" | "network-idle"): Explicitly specify the respond timing. One of the following: - html: directly return unrendered HTML - visible-content: return immediately when any content becomes available - mutation-idle: wait for DOM mutations to settle and remain unchanged for at least 0.2s - resource-idle: wait for no additional resources that would affect page logic and content has SUCCEEDED loading in 0.5s - media-idle: wait for no additional resources, including media resources, has SUCCEEDED loading in 0.5s - network-idle: wait for full load of webpage, also known as networkidle0.
- `markdownChunking` ("true" | "h1" | "h2" | "h3" | "h4" | "h5" | "structured" | "s1" | "s2" | "s3" | "s4" | "s5" | string): Opt-in markdown chunking. Supported values: - true - h1 - h2 - h3 - h4 - h5 - structured - s1 - s2 - s3 - s4 - s5 Note if you are expecting text return, the chunking is done by injecting character \u001D
- `maxTokens` (number): - Some validators will be applied on value(s): (v) =&gt; v &gt;= 500
- `customHeader` (object)
- `ext` (array<string>): Search operator `ext:` (file extension).
- `filetype` (array<string>): Search operator `filetype:`, e.g. `pdf`.
- `intitle` (array<string>): Search operator `intitle:`: words that must appear in the page title.
- `loc` (array<string>): Search operator `loc:` (location).
- `site` (array<string>): Keep results to this domain, e.g. `https://jina.ai`. Same as the `X-Site` header.
- `type` ("web" | "images" | "news", default "web"): Result type: `web` (default), `images` or `news`.
- `num` (number): Maximum number of results, 0 to 20, default 10. Larger values can add latency and drop special result types.
- `count` (number): Same as `num`.
- `provider` ("google" | "bing" | "reader"): Search engine to use: `google`, `bing` or `reader`.
- `gl` (string): Country to search from, as a two-letter country code.
- `hl` (string): Language of the search, as a two-letter language code.
- `location` (string): Where the search should originate from. City level works best.
- `fallback` (boolean): If `true` and the search returns nothing, fall back to local search results. Default `false`.
- `q` (string): The search query. Not needed when the query is already in the path (`https://s.jina.ai/<query>`).
- `nfpr` (boolean): Passed to the search engine; on Google, `true` turns off query auto-correction.

Responses:
- `200`: OK
- `400`: Bad Request
- `401`: Unauthorized
- `402`: Payment Required
- `403`: Forbidden
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

