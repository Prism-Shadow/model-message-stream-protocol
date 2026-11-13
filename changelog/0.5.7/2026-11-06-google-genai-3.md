# The Google clients on `google-genai` 3.0

- **Date:** 2026-11-06
- **Type:** fix
- **Scope:** `google_official`, `google_genai`, `ci`
- **PR:** [#319](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/319)

[中文版](2026-11-06-google-genai-3.zh.md)

## What changed

- `GoogleOfficialClient` built its SDK client with `http_options.api_version` set to `v1beta`, so its Interactions requests, embedContent calls and model listing went to `/v1beta/` on every SDK version. `google-genai` 3.0.0 had moved the Gemini API's default to `v1`, where `gemini-3.8-flash-tts` answered `404 Model 'gemini-3.8-flash-tts' not found` and `list_models` read `/v1/models`.
- `GoogleGenaiClient` set `v1beta` on the Gemini API and on gateways, and `v1beta1` on Vertex AI, the versions `google-genai` 2.x had defaulted to. `GOOGLE_GENAI_API_VERSION`, which 3.0.0 reads when the code sets no version, moved neither client.
- Both clients worked on `google-genai` 2.23.0 through 3.0.0, and the dependency stayed `google-genai>=2.23.0`.
- The Python CI workflow reran the offline tests with `google-genai<3` and `google-genai==2.23.0` after the main run.

## Wire shape

| Client | Paths | SDK 2.23 / 2.34 / 3.0 |
| --- | --- | --- |
| `google-official` | `{base}/v1beta/interactions`, `{base}/v1beta/models` | same on all |
| `google-genai`, API key | `{base}/v1beta/models/{model}:streamGenerateContent`, `{base}/v1beta/models` | same on all |
| `google-genai`, service-account key | `https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/...` | same on all |
