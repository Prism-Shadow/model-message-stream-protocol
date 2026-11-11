# Gemini Omni Flash Documentation

This directory snapshots Google's official documentation for **Gemini Omni Flash**, the video
generation and editing model of the Gemini API (`gemini-omni-1.2-flash`; `gemini-omni-1.1-flash`
routes to it on 2026-12-03). It is served through the Interactions API
(`POST /v1beta/interactions`); see [../gemini_interactions/](../gemini_interactions/README.md) for
the API itself. Pages were fetched as raw markdown from https://aistudio.google.com/ (the
https://ai.google.dev/ URLs redirect there) on 2026-11-06; Java and Go samples were removed,
everything else is verbatim. Live captures that back the notes below are under
`api_captures/gemini_omni/` (git-ignored).

## Documentation

- [omni.md](./docs/omni.md) - The Omni guide: text to video, `response_format` video entries
  (`aspect_ratio`, `resolution`, `duration`, `delivery`), image to video, first and last frame
  interpolation, subject reference, `generation_config.video_config.task`, stateful editing with
  `previous_interaction_id`, editing uploaded videos, URI delivery, video extension, best
  practices, limitations, prompt guide
- [gemini-omni-flash.md](./docs/gemini-omni-flash.md) - Model page: ids, input and output types,
  token limits (131,072 in / 65,536 out), output video limits, versions
- [video.md](./docs/video.md) - Video generation overview; Veo 3.1 Preview shut down 2026-10-22
- [pricing.md](./docs/pricing.md) - Omni 1.2 and 1.1 prices (excerpt of the pricing page)
- [api-reference.md](./docs/api-reference.md) - The v1beta Interactions API reference: request
  fields, `VideoResponseFormat`, `VideoConfig`, `VideoContent`, `Usage`, `Step`, and the
  `InteractionSseEvent` / `StepDelta` types including `VideoDelta`. Its model enum lists
  `gemini-omni-1.1-flash` and `gemini-omni-flash-preview` but not yet `gemini-omni-1.2-flash`
- [files.md](./docs/files.md) - Files API: upload, `files.get` states, download of generated
  files, 48-hour retention
- [api-errors.md](./docs/api-errors.md) - Interactions API error codes and how unary and SSE
  requests deliver them

## Pricing (2026-11-06, paid tier only)

`gemini-omni-1.2-flash`: input $1.50 per 1M tokens (text / image / video); output $9.00 per 1M
(text, thinking included) and $12.00 per 1M (video). Video is billed as output tokens per second:
360p 1,931/s (~$0.023/s), 720p 5,792/s (~$0.07/s, ~$0.70 for the default 10 s), 1080p 8,688/s
(~$0.104/s), 4K 17,376/s (~$0.209/s). `gemini-omni-1.1-flash` bills video at $17.50 per 1M
(~$0.10/s at 720p) until it routes to 1.2.

## Protocol notes verified against the live API (2026-11-06, `gemini-omni-1.2-flash`)

- A request with only `model` and `input` returns video at the defaults: 16:9, 720p
  (1280x720), 10 s, inline. `response_format` is not required. Output is MP4 (`ftypmp42`),
  H.264 at 24 fps with AAC 48 kHz stereo audio.
- Inline delivery worked at the defaults in both modes: 8.6 to 9.7 MB MP4 (11.5 to 12.9 MB of
  base64). At 360p and 3 s a video is 1.1 to 1.8 MB.
- `delivery: "uri"` requires `store: true` (400 "store=true is required when response format has
  video delivery set to URI."). The video block then carries
  `uri: https://generativelanguage.googleapis.com/v1beta/files/<id>:download?alt=media` and no
  `data`; `files.get` showed the file `ACTIVE` seconds later (`source: "GENERATED"`,
  `expirationTime` 48 h on, `videoMetadata.videoDuration`). The URI without an API key answers
  403 `PERMISSION_DENIED` ("Method doesn't allow unregistered callers").
- Non-streaming response: `steps` holds a `thought` step (`signature`; `summary` text only with
  `thinking_summaries: "auto"`) and a `model_output` step whose `content` is one
  `{"type": "video", "mime_type": "video/mp4", "data": ...}` block. No `user_input` step is
  echoed, and with `store: false` the response has no `id`. Latency was 16 to 22 s at 360p/3s
  and 40 s at the defaults.
- Streaming works. The order is `interaction.created`, `interaction.status_update`,
  `step.start` (thought), one `thought_signature` delta, `step.stop`, `step.start`
  (model_output), one `step.delta` `{"type": "video", "mime_type": "video/mp4", "data": ...}`
  carrying the whole file, `step.stop`, `interaction.completed` (status and `usage`), then
  `event: done` / `data: [DONE]`. The video is never split across deltas. While the model works
  the server sends `: keep-alive` comments every 15 s, and with `store: false`
  `interaction.created` arrives only once the video is ready; with `store: true` it arrives first,
  carrying the id. With URI delivery the delta carries `uri` instead of `data`.
- The Python (`google-genai` 2.34.0 and 3.0.0) and TypeScript (`@google/genai` 2.24.0) SDKs type
  the delta as `VideoDelta` and deliver a 720p/10s video intact.
- Usage: `total_output_tokens` is the video tokens alone (`output_tokens_by_modality`
  `[{"modality": "video", ...}]`, exactly the per-second rate times the duration);
  `total_thought_tokens` is separate (334 to 797); `total_tokens` is input + output + thought. A
  640x360 PNG input counted 1,100 image tokens.
- Thinking: `thinking_level` takes `low` and `high` only; `minimal` and `medium` return 400
  "'<level>' is not a supported thinking level for this model. Allowed values are: high, low."
  `thinking_summaries` is accepted.
- Accepted despite the guide's limitations list: `system_instruction` (it adds input tokens) and
  `generation_config.temperature`. Rejected: function `tools` (400 "Function calling is not
  enabled for this model"). `max_output_tokens` counts the video tokens: 8192 passes at 360p/3s,
  1000 returns 400 "Request contains an invalid argument." after about 15 s of generation.
- Validation errors (400 `invalid_request`, returned before any generation): duration under 3 s
  ("Requested video duration 2s 0ns is less than the minimum allowed 3s 0ns") or over 15 s
  ("... exceeds the maximum allowed 15s 0ns"); a duration without the `s` unit ("Invalid input at
  'response_format'."); an unknown resolution, aspect ratio, delivery or task (each message
  lists the supported values); an unknown `response_format` field ("Unknown parameter 'fps' at
  'response_format'."). `gemini-omni-1.1-flash` validates duration the same way.
- An image in a `user_input` step before the text works as the first frame (image to video).
- `models.get` reports `supportedGenerationMethods: ["generateContent", "countTokens"]` and
  `thinking: true` for `gemini-omni-1.2-flash`, `gemini-omni-1.1-flash` and
  `gemini-omni-flash-preview`.
