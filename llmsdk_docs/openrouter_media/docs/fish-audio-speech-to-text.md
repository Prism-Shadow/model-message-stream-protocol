> Source: https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text.md (fetched 2026-11-04; Fish Audio's own STT page, for the formats and limits of transcribe-1; the OpenAPI section is left out)

> ## Documentation Index
> Fetch the complete documentation index at: https://docs.fish.audio/llms.txt
> Use this file to discover all available pages before exploring further.

# Speech to Text

> Transcribe audio with transcribe-1-pro, the recommended speech-to-text model: request and response fields, speaker turns, limits, formats, and errors

> [!WARNING]
>
> This BETA endpoint transcribes one audio file per request. Send the audio as
> `multipart/form-data` (a file upload) or `application/msgpack`. Base64-encoded
> audio in a JSON body is not supported.

## Select a model

Send `POST https://api.fish.audio/v1/asr` with `Authorization: Bearer <API_KEY>` and a **`model` HTTP header** that selects the model. The request is synchronous: the response arrives when the whole file has been transcribed.

| Header value | Use it for |
| - | - |
| `transcribe-1-pro` | Recommended. Recordings up to 60 minutes, including multi-speaker conversations: speaker markers and speaker turns, with emotion and vocal-event cues preserved. |
| `transcribe-1` | General transcription of short recordings. Used when the `model` header is missing or not an exact match. |

Send `model: transcribe-1-pro` with every request, written exactly, in lowercase. If the header is missing, or its value is not an exact match (for example `Transcribe-1-Pro` or `transcribe-1pro`), the request is served and billed as `transcribe-1`, and no error is returned. If you expected `transcribe-1-pro` but the transcript has no speaker markers and you did not send `diarize=false`, check the header. This applies to the API playground on this page too: set its `model` header to `transcribe-1-pro`.

The model belongs in the header for both multipart and MessagePack requests; a `model` field in the request body is ignored. See [Limits](#limits) for recording length and request size.

To link the request to your own distributed trace, also send a W3C `traceparent` header. See [Tracing & Performance Analysis](https://docs.fish.audio/api-reference/observability.md).

## Request fields

Multipart and MessagePack bodies use the same field names. Multipart values are text; MessagePack values are typed.

| Field | Required | Default | Description |
| - | - | - | - |
| `audio` | Yes | — | Exactly one audio file per request: a file upload for multipart, or binary bytes for MessagePack. The format is detected from the file contents, not the file name. See [Supported audio formats](#supported-audio-formats). |
| `language` | No | Unset | Optional language hint, as a lowercase ISO 639-1 code such as `en`, `zh`, or `ja`. The language is detected automatically either way. An empty multipart value counts as unset. See [Language](#language). |
| `ignore_timestamps` | No | `true` | Default `true` (no timestamps). Set to `false` to get word-level `segments` and `speaker_turns`. Timestamps add processing time. |
| `tag_audio_events` | No | `true` | `true`: bracketed emotion and vocal-event cues such as `[laughter]` or `[高兴]` stay in `text` and in `speaker_turns`. `false`: the cues are removed. Timestamps, `duration`, and billing do not change. |
| `diarize` | No | `auto` | `auto` or `true`: return `speaker_turns` when timestamps are requested. `false`: omit `speaker_turns` and the speaker markers in `text`; the rest of the transcript does not change. |
| `num_speakers` | No | Unset | The expected number of speakers, an integer of 1 or more. Cannot be combined with `min_speakers` or `max_speakers`. |
| `min_speakers`, `max_speakers` | No | Unset | Lower and upper bounds on the number of speakers, integers of 1 or more. `min_speakers` must not exceed `max_speakers`. |

In multipart forms, send `true` or `false` for `ignore_timestamps`. Any value other than `true` (case-insensitive), including `1` or an empty value, is read as `false` and turns timestamps on. In MessagePack, send a boolean; a string or `nil` returns 400.

Speaker-count hints are applied on a best-effort basis: they guide speaker identification on longer recordings and may have no effect on short ones. They cannot be sent with `diarize=false`.

`tag_audio_events`, `diarize`, and the speaker-count hints are validated strictly:

* In multipart forms, `tag_audio_events` takes `true` or `false`, and `diarize` takes `auto`, `true`, or `false`, in any letter case. Speaker counts take digits only. Send each field at most once.
* In MessagePack, send `tag_audio_events` as a boolean, `diarize` as a boolean or one of the lowercase strings `auto`, `true`, or `false`, and speaker counts as integers, not floats or strings. `nil` means the default.
* Any other value, a repeated multipart field, or a conflicting combination returns 400 with code `invalid_parameter`.

**If you use `transcribe-1`:** send `audio`, `language`, and `ignore_timestamps`. The other fields apply to `transcribe-1-pro`; send them only with `model: transcribe-1-pro`.

### Examples

```bash theme={null}
curl --request POST https://api.fish.audio/v1/asr \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "model: transcribe-1-pro" \
  --form audio=@conversation.wav \
  --form ignore_timestamps=false
```

This request returns word-level `segments` and `speaker_turns`. For a two-person interview, you can add a speaker-count hint, and remove emotion and vocal-event cues from the transcript:

```bash theme={null}
curl --request POST https://api.fish.audio/v1/asr \
  --header "Authorization: Bearer $FISH_API_KEY" \
  --header "model: transcribe-1-pro" \
  --form audio=@interview.mp3 \
  --form ignore_timestamps=false \
  --form num_speakers=2 \
  --form tag_audio_events=false
```

Let your HTTP client set the multipart `Content-Type` and boundary. For MessagePack, set `Content-Type: application/msgpack` and encode `audio` as binary bytes. See the [Speech to Text guide](https://docs.fish.audio/features/speech-to-text.md#direct-api-messagepack) for an example.

## Read the response

A successful response (HTTP 200) is a JSON object:

| Field | Description |
| - | - |
| `text` | The full transcript, with inline speaker markers such as `<\|speaker:0\|>` (none with `diarize=false`) and, unless `tag_audio_events=false`, bracketed emotion and vocal-event cues such as `[高兴]` (happy) or `[laughter]`. See [Multi-speaker response format](#multi-speaker-response-format). |
| `duration` | Length of the audio in seconds, including silence. |
| `segments` | Word-level timestamps: an array of `{ "text", "start", "end" }`, with times in seconds. Empty (`[]`) when `ignore_timestamps=true` (the default), when no speech was found, or when timing is temporarily unavailable. See [Segments](#segments). |
| `speaker_turns` | The transcript as timed speaker turns. Returned when `ignore_timestamps=false` and `diarize` is not `false`; otherwise absent. See [Speaker turns](#speaker-turns). |
| `language` | The detected language's English name, such as `English` or `Chinese`. Omitted when it cannot be determined. Intended for display. |
| `language_code` | Two-letter ISO 639-1 code for the language, such as `en`. Omitted when unknown. If the language cannot be determined and you sent a `language` hint, this reports your hint. See [Language](#language). |
| `request_id` | A unique ID for this request, also present in `transcribe-1-pro` error bodies and in the `x-request-id` response header. Platform and network-edge errors do not carry it. Include it when you contact support. |

A field that is not returned is absent from the JSON, never `null`. Do not depend on the order of keys in the JSON.

**If you use `transcribe-1`:** rely on `text`, `duration`, `segments`, `language`, and `language_code`. Speaker markers, `speaker_turns`, and `request_id` are `transcribe-1-pro` features.

> [!NOTE]
>
> Both SDKs select `transcribe-1-pro` through the `model` header. In Python,
> pass
> `request_options=RequestOptions(additional_headers={"model": "transcribe-1-pro"})`
> to `asr.transcribe()`. In JavaScript, pass
> `{ headers: { model: "transcribe-1-pro" } }` as the second argument to
> `speechToText.convert()`. The Python SDK currently returns only `text`,
> `duration`, and `segments`, and neither SDK can send `tag_audio_events`,
> `diarize`, or the speaker-count hints. To use them, call the API directly, as
> in the examples above. The JavaScript SDK returns the whole response body,
> but its `STTResponse` type declares only `text`, `duration`, and `segments`.

### Multi-speaker response format

`transcribe-1-pro` marks speaker changes **inside the `text` string** with `<|speaker:N|>` markers. The label `N` identifies the speaker for the text that follows, up to the next marker. A repeated label means that speaker is speaking again.

* Markers usually have a space on each side (`<|speaker:0|> 你好。 <|speaker:1|> ...`). Do not depend on exact spacing.
* Any text before the first marker belongs to the first turn.
* Unless you send `diarize=false`, which removes the markers, a transcript with no marker comes from a single speaker; treat it as speaker 0.
* Labels identify speakers within one response only. They are not names, and the same label in two requests is not the same person. Send a whole conversation as one file.

This illustrative response has two speakers and three turns. With `ignore_timestamps=true` (the default), timestamps are skipped and `speaker_turns` is absent:

```json theme={null}
{
  "text": "<|speaker:0|> 你好。 <|speaker:1|> [高兴]很开心认识你。 <|speaker:0|> 我也是。",
  "duration": 6.4,
  "segments": [],
  "language_code": "zh",
  "language": "Chinese",
  "request_id": "5f0c7e2a-9b1d-4c3e-8f6a-2d4b7c9e1a03"
}
```

Read this as speaker 0 saying `你好。`, speaker 1 saying `[高兴]很开心认识你。`, and speaker 0 saying `我也是。`. The `[高兴]` cue describes the delivery of speaker 1's speech. There is no separate emotion field; the cues are part of the text.

### Speaker turns

With `ignore_timestamps=false`, `transcribe-1-pro` also returns the turns as a structured `speaker_turns` array, unless you send `diarize=false`. When you request timestamps, prefer `speaker_turns` over parsing `text`.

* `speaker_turns` lists the turns in the order they occur, and is `[]` when no speech was found. Each turn is `{ "speaker": "speaker:N", "text": "...", "start": <seconds>, "end": <seconds> }`.
* `speaker` is the string `speaker:N`, where `N` matches the `<|speaker:N|>` marker in `text`. Like the markers, labels identify speakers within one response only.
* `text` is that turn's speech without speaker markers. It keeps emotion and vocal-event cues unless `tag_audio_events=false`.
* `start` and `end` come from the word timestamps. If word timing is unavailable (`segments` is empty), turn times are approximate and can cover the whole recording.
* Consecutive turns can have the same speaker. Do not assume turns are contiguous or non-overlapping.

This illustrative response is the same conversation with `ignore_timestamps=false`:

```json theme={null}
{
  "text": "<|speaker:0|> 你好。 <|speaker:1|> [高兴]很开心认识你。 <|speaker:0|> 我也是。",
  "duration": 6.4,
  "segments": [
    { "text": "你", "start": 0.24, "end": 0.52 },
    { "text": "好", "start": 0.52, "end": 0.8 },
    { "text": "很", "start": 1.6, "end": 1.84 },
    { "text": "开", "start": 1.84, "end": 2.1 },
    { "text": "心", "start": 2.1, "end": 2.36 },
    { "text": "认", "start": 2.36, "end": 2.7 },
    { "text": "识", "start": 2.7, "end": 2.98 },
    { "text": "你", "start": 2.98, "end": 3.3 },
    { "text": "我", "start": 4.5, "end": 4.78 },
    { "text": "也", "start": 4.78, "end": 5.02 },
    { "text": "是", "start": 5.02, "end": 5.4 }
  ],
  "speaker_turns": [
    { "speaker": "speaker:0", "text": "你好。", "start": 0.24, "end": 0.8 },
    {
      "speaker": "speaker:1",
      "text": "[高兴]很开心认识你。",
      "start": 1.6,
      "end": 3.3
    },
    { "speaker": "speaker:0", "text": "我也是。", "start": 4.5, "end": 5.4 }
  ],
  "language_code": "zh",
  "language": "Chinese",
  "request_id": "5f0c7e2a-9b1d-4c3e-8f6a-2d4b7c9e1a03"
}
```

See the [Speech to Text guide](https://docs.fish.audio/features/speech-to-text.md#multi-speaker-conversations) for parsing examples.

### Segments

A segment is usually one word; in Chinese and Japanese it is usually one character, or a few. Segment text has no punctuation and no speaker markers or cues, and can be normalized (for example `35` for `3.5`), so it does not always match `text` character for character. A segment can have `start` equal to `end`. Segments are not speaker turns and carry no speaker ID.

### Language

* `language` is optional. The language is detected automatically whether or not you send a hint, and a hint does not force the transcript into that language.
* Use a lowercase ISO 639-1 code such as `en`, `zh`, or `ja`. Other forms, such as `en-US` or `English`, may be rejected with 400.
* If the language cannot be determined (for example, very short audio), `language_code` reports your hint, which is not checked against the audio, and `language` may be absent.
* Responses report one language. For recordings that switch languages, `language` and `language_code` do not list every language spoken.

## Limits

* **Audio length:** up to 60 minutes per request. Longer audio returns 400 with code `audio_too_long`.
* **Request size:** for long recordings, send compressed audio such as MP3, Opus, or AAC. An hour of 128 kbps MP3 is about 55 MiB. A request that is too large returns 413.
* **One conversation per request:** send the whole recording in one request. Timestamps and speaker labels then cover the whole recording. Do not split a conversation, because labels are consistent only within one response.

**If you use `transcribe-1`:** it is designed for short recordings; for recordings longer than a few minutes, use `transcribe-1-pro`. It accepts up to 50 MiB per request; keep MP3 and Opus files under 25 MiB. A request that exceeds the size limit returns 413 or 400. A long request can fail with 503 if it exceeds the processing-time limit. Retry, and if it keeps failing, use `transcribe-1-pro` or split the audio.

### Processing time and timeouts

* Processing time grows with the length of the recording. Long `transcribe-1-pro` recordings can take several minutes.
* Set your HTTP client's timeout accordingly. The official SDKs' default timeout can be too short for long recordings, and many HTTP libraries default to even less (httpx defaults to 5 seconds). For long recordings, use a generous timeout, for example 15 minutes: `httpx.Timeout(900.0, connect=10.0)` with httpx, `RequestOptions(timeout=900)` with the Python SDK, or `{ timeoutInSeconds: 900 }` with the JavaScript SDK.
* In Node.js, the built-in `fetch`, which the JavaScript SDK uses, also stops waiting for a response after 5 minutes, even if you set a longer timeout. To wait longer, call `setGlobalDispatcher(new Agent({ headersTimeout: 900_000, bodyTimeout: 900_000 }))` from the `undici` package once at startup. See [Processing time and timeouts](https://docs.fish.audio/features/speech-to-text.md#processing-time-and-timeouts).
* If a long request fails with a 5xx error or the connection drops, retry it.
* Each request holds one of your account's [concurrent request slots](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits.md#concurrent-request-limits) until its response is returned.

## Supported audio formats

* `transcribe-1-pro` accepts WAV, MP3, AAC (including M4A/MP4), FLAC, Ogg (Opus or Vorbis), WebM/Matroska, and MOV, including browser recordings. For a video file, it uses the first audio track. Send the original file bytes; no conversion is needed.
* Not supported: AIFF, CAF, WMA, AMR, AC-3, and raw (headerless) PCM. These return 400.

**If you use `transcribe-1`:** it accepts WAV, MP3, AAC (including M4A/MP4), FLAC, and Ogg (Opus or Vorbis). Browser WebM recordings (for example, from `MediaRecorder`) may not be accepted; convert them to Ogg/Opus, MP3, or WAV first.

## Errors

Error responses have one of these shapes:

* **`transcribe-1-pro` errors** are JSON with `status`, `message`, `code`, and `request_id`. Branch on `code`, not on `message`.
* **Platform errors**, such as authentication, credit, and concurrency errors, are returned before the request reaches a model. They are JSON with exactly `status` and `message`.
* **Errors from the network edge** in front of the API, such as some 413 and 5xx responses, may not have a JSON body. Handle them by HTTP status.

This illustrative `transcribe-1-pro` error body shows the shape:

```json theme={null}
{
  "status": 400,
  "message": "A human-readable description of the problem.",
  "code": "invalid_parameter",
  "request_id": "5f0c7e2a-9b1d-4c3e-8f6a-2d4b7c9e1a03"
}
```

| Status | `code` | Meaning | Retry? |
| - | - | - | - |
| 400 | `invalid_request` | Malformed request: the body could not be parsed, `audio` is missing, or more than one `audio` was sent. | No |
| 400 | `invalid_parameter` | A parameter has a value it does not accept, or parameters conflict. | No |
| 400 | `invalid_audio` | The audio could not be decoded, or the format is not supported. | No |
| 400 | `audio_too_long` | The audio is longer than 60 minutes. | No |
| 400 | `audio_too_short` | The audio is too short to transcribe (under about 0.08 seconds). | No |
| 400 | — | The request body could not be read. | No |
| 401 | — | Missing or invalid API key. | No |
| 402 | — | Insufficient API credit. | No |
| 413 | `request_too_large` | The request is too large. It may come from the network edge without a JSON body. | No |
| 415 | `unsupported_media_type` | Unsupported `Content-Type`. | No |
| 429 | — (rarely `upstream_rejected`) | Usually your account is at its concurrency limit. No `Retry-After` header is sent. | Yes, with backoff |
| Other 4xx (not 429) | `upstream_rejected` | Rare: the request was rejected during transcription. | No |
| 500 | `internal_error` | Internal error. | Yes, with backoff |
| 502 | — | The service could not be reached. | Yes, with backoff |
| 503 | `upstream_unavailable` | The transcription service is temporarily unavailable. | Yes, with backoff |
| 503 | `upstream_timeout` | Processing took too long. | Yes, with backoff |
| 503 | `excessive_repetition` | The transcription produced unusable repeated output. | Yes, with backoff |
| 503 | `diarization_failed` | Speaker identification failed for this recording. | Yes, with backoff |
| 504 | — | Timed out connecting to the service. | Yes, with backoff |

* A dash means the error has no `code`; a 503 without a `code` also means the service is temporarily unavailable.
* New `code` values may be added; handle unknown codes by HTTP status.
* Retry 429 and 5xx responses with exponential backoff. Do not retry other 4xx responses; change the request first.
* Requests that return an error response are not billed.
* With the Python SDK, the raw error body is in the exception's `body` attribute; parse it with `json.loads` to read `code` and `request_id`.

**If you use `transcribe-1`:** its errors are JSON with `status` and `message`. Rely only on these two fields and on the HTTP status.

See [Errors](https://docs.fish.audio/api-reference/errors.md) for retry and SDK exception examples.
