> Source: https://docs.jina.ai/ (snapshot 2026-11-02; the meta-prompt served to coding agents, Reader and Search sections)

4. Reader API
Endpoint: https://r.jina.ai/
Purpose: retrieve/parse content from URL in a format optimized for downstream tasks like LLMs and other applications. Use https://eu.r.jina.ai/ to reside all infrastructure and data processing operations entirely within EU jurisdiction.
Best for: extracting structured content from web pages, suitable for generative models and search applications
Method: POST
Authorization: HTTPBearer
Headers
- **Authorization**: Bearer $JINA_API_KEY
- **Content-Type**: application/json
- **Accept**: Use `application/json` to get JSON response, `text/event-stream` to enable stream mode
- **X-Engine** (optional): Specifies the engine to retrieve/parse content. Use `browser` for fetching best quality content, `direct` for speed, `cf-browser-rendering` for experimental engine aimed at JS-heavy websites
- **X-Timeout** (optional): Specifies the maximum time (in seconds) to wait for the webpage to load
- **X-Target-Selector** (optional): CSS selectors to focus on specific elements within the page
- **X-Wait-For-Selector** (optional): CSS selectors to wait for specific elements before returning
- **X-Remove-Selector** (optional): CSS selectors to exclude certain parts of the page (e.g., headers, footers)
- **X-With-Links-Summary** (optional): `all` to gather all links or `true` to gather unique links at the end of the response
- **X-With-Images-Summary** (optional): `all` to gather all images or `true` to gather unique images at the end of the response
- **X-With-Generated-Alt** (optional): `true` to add alt text to images lacking captions
- **X-No-Cache** (optional): `true` to bypass cache for fresh retrieval
- **X-With-Iframe** (optional): `true` to include iframe content in the response
- **X-Return-Format** (optional): `markdown`, `html`, `text`, `screenshot`, or `pageshot` (for URL of full-page screenshot)
- **X-Token-Budget** (optional): Specifies maximum number of tokens to use for the request
- **X-Retain-Images** (optional): Use `none` to remove all images from the response
- **X-Respond-With** (optional): Use `readerlm-v2`, the language model specialized in HTML-to-Markdown, to deliver high-quality results for websites with complex structures and contents. Use `jina-ocr-v1`, the document parsing model, to read the rendered page as an image instead of its HTML, which is what you want for scanned documents, PDFs, formulas and tables; it returns Markdown, parses one page per request (see X-Page), and costs about 40x the tokens per page
- **X-Page** (optional): Which page `X-Respond-With: jina-ocr-v1` should parse, 1-based, default 1. A multi-page document needs one request per page
- **X-Set-Cookie** (optional): Forwards your custom cookie settings when accessing the URL, which is useful for pages requiring extra authentication. Note that requests with cookies will not be cached
- **X-Proxy-Url** (optional): Utilizes your proxy to access URLs, which is helpful for pages accessible only through specific proxies
- **X-Proxy** (optional): Sets country code for location-based proxy server. Use 'auto' for optimal selection or 'none' to disable
- **DNT** (optional): Use `1` to not cache and track the requested URL on our server
- **X-No-Gfm** (optional): Opt in/out features from GFM (Github Flavored Markdown). By default, GFM features are enabled. Use `true` to disable GFM features. Use `table` to opt out GFM Table but keep the table HTML elements in response
- **X-Locale** (optional): Controls the browser locale to render the page
- **X-Robots-Txt** (optional): Defines bot User-Agent to check against robots.txt before fetching content
- **X-With-Shadow-Dom** (optional): Use `true` to extract content from all Shadow DOM roots in the document
- **X-Base** (optional): Use `final` to follow the full redirect chain
- **X-Md-Heading-Style** (optional): When to use '#' or '===' to create Markdown headings. Set `atx` to use "==" or "--" characters
- **X-Md-Hr** (optional): Defines Markdown horizontal rule format. Default is "***"
- **X-Md-Bullet-List-Marker** (optional): Sets Markdown bullet list marker character. Options: *, -, +
- **X-Md-Em-Delimiter** (optional): Defines Markdown emphasis delimiter. Options: -, *
- **X-Md-Strong-Delimiter** (optional): Sets Markdown strong emphasis delimiter. Options: **, __
- **X-Md-Link-Style** (optional): When not set, links are embedded directly within the text. `referenced` to list links at the end. `discarded` to replace links with their anchor text.
- **X-Md-Link-Reference-Style** (optional): Sets Markdown reference link format. Set to `collapse`, `shortcut` or do not set this header.

Request body schema: {"application/json":{"url":{"type":"string","required":true},"viewport":{"type":"object","required":false,"description":"Sets browser viewport dimensions for responsive rendering.","width":{"type":"number","required":true},"height":{"type":"number","required":true}},"injectPageScript":{"type":"string","required":false,"description":"Executes preprocessing JS code (inline string or remote URL), for instance manipulating DOMs."}}}

Note: The actual content of the page will be available in `response["data"]["content"]`, and links/images (if using "X-With-Links-Summary: true" or "X-With-Images-Summary: true") will be available in `response["data"]["links"]` and `response["data"]["images"]`.

5. Search API
Endpoint: https://s.jina.ai/
Purpose: search the web for information and return results in a format optimized for downstream tasks like LLMs and other applications. Use https://eu.s.jina.ai/ to reside all infrastructure and data processing operations entirely within EU jurisdiction.
Best for: customizable web search with results optimized for enterprise search systems and LLMs, with options for Markdown, HTML, JSON, text, and image outputs
Method: POST
Authorization: HTTPBearer
Headers
- **Authorization**: Bearer $JINA_API_KEY
- **Content-Type**: application/json
- **Accept**: application/json
- **X-Site** (optional): Use "X-Site: <https://specified-domain.com>" for in-site searches limited to the given domain
- **X-With-Links-Summary** (optional): `all` to gather all links or `true` to gather unique links at the end of the response
- **X-With-Images-Summary** (optional): `all` to gather all images or `true` to gather unique images at the end of the response
- **X-Retain-Images** (optional): Use `none` to remove all images from the response
- **X-No-Cache** (optional): "true" to bypass cache and retrieve real-time data
- **X-With-Generated-Alt** (optional): "true" to generate captions for images without alt tags
- **X-Respond-With** (optional): Use `no-content` to exclude page content from the response
- **X-With-Favicon** (optional): `true` to include favicon of the website in the response
- **X-Return-Format** (optional): `markdown`, `html`, `text`, `screenshot`, or `pageshot`
- **X-Engine** (optional): Use `browser` for best quality or `direct` for speed
- **X-With-Favicons** (optional): `true` to fetch the favicon of each URL in the SERP
- **X-Timeout** (optional): Specifies the maximum time (in seconds) to wait for the webpage to load
- **X-Set-Cookie** (optional): Forwards your custom cookie settings when accessing the URL
- **X-Proxy-Url** (optional): Utilizes your proxy to access URLs
- **X-Locale** (optional): Controls the browser locale to render the page

Request body schema: {"application/json":{"q":{"type":"string","required":true},"gl":{"type":"string","required":false,"description":"The country to use for the search. It's a two-letter country code."},"location":{"type":"string","required":false,"description":"From where you want the search query to originate. It is recommended to specify location at the city level to simulate a real user's search."},"hl":{"type":"string","required":false,"description":"The language to use for the search. It's a two-letter language code."},"num":{"type":"number","required":false,"description":"Sets maximum results returned. Using num may cause latency and exclude specialized result types. Omit unless you specifically need more results per page."},"page":{"type":"number","required":false,"description":"The result offset. It skips the given number of results. It's used for pagination."}}}

Note: Similarly to the reader API, you must pay attention to the response format and extract the required content correctly.

**Note: all API's require authorization using the bearer token (get it from https://jina.ai/?sui=apikey)!**
Make sure that any code you generate uses the JINA_API_KEY environment variable, and remind the user to correctly set this variable before running the code!
