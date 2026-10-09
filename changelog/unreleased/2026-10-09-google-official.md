# The official Gemini client is `google-official`, named after its vendor

- **Date:** 2026-10-09
- **Type:** refactor
- **Scope:** `auto_client`, `google_official`

[中文版](2026-10-09-google-official.zh.md)

## What changed

- `google-official` (was `gemini-official`): the official client for Gemini models took its vendor's name, like `openai-official` and `anthropic-official`. Its folder and class became `google_official/GoogleOfficialClient` (was `gemini_official/GeminiOfficialClient`), and a `gemini-` model id without a client type routes to it.
- `gemini-official` still names `google-official`, as an alias; `OFFICIAL_CLIENT_TYPES` lists `google-official` only.
- The registry's Gemini entries, the playground, the READMEs, the site and the skills name `google-official`; error messages name `GoogleOfficialClient`. `GEMINI_API_KEY` and `GEMINI_BASE_URL` did not change.
