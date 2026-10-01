# `google-genai` is the compatible client for Google's generateContent, Vertex AI included

- **Date:** 2026-10-01
- **Type:** feature
- **Scope:** `auto_client`, `google_genai`, `gemini_official`, `integration`, `skills`, `docs`
- **Breaking:** yes — a Vertex AI service-account key needs `client_type="google-genai"`, and `google-genai` no longer sends `GEMINI_API_KEY` to a `base_url` passed in

[中文版](2026-10-01-google-genai-client.zh.md)

## What changed

- The compatible client for generateContent, as the Google GenAI SDK speaks it, is named `google-genai`, after its wire protocol like the other compatible clients. It serves Vertex AI (a service-account JSON key as the API key), the Gemini API, and gateways that proxy generateContent. Its folder and class are `google_genai/GoogleGenaiClient` (was `gemini_generate_content/GeminiGenerateContentClient`).
- `gemini-official` speaks the Gemini API's Interactions endpoint only. It no longer hands a service-account key to generateContent, and refuses one with a `ValueError` (an `Error` in TypeScript) that names `google-genai`, so a private key never travels as an API key.
- `google-genai` follows the credential rule of the other compatible clients: `GEMINI_API_KEY` is read from the environment only together with `GEMINI_BASE_URL` or Google's own endpoint, and a `base_url` passed in needs an `api_key` passed in with it.
- The e2e tests name `google-genai` for every Vertex AI model.

## Compatibility

- Pass `client_type="google-genai"` (`clientType: "google-genai"`) with a Vertex AI service-account key; `gemini-official`, and a `gemini-` model id on its own, now raise on one.
- `gemini-generate-content` still names `google-genai`, as an alias.
- Code that imported the client by module path (`mmsp.gemini_generate_content`, `@prismshadow/mmsp/dist/gemini_generate_content`) imports `google_genai` and `GoogleGenaiClient`.
