> Source: https://api-docs.deepseek.com/guides/asr.md (snapshot 2026-11-16)

# Speech to Text

Transcribe an audio file into text, for example for voice input in a chatbot.

`POST https://api.deepseek.com/v1/tools/asr`

The whole audio file is sent in one request and the complete transcript is returned. Streaming recognition is not supported.

***

## Languages

Chinese (`zh`), Cantonese (`yue`), English (`en`), Japanese (`ja`), Korean (`ko`), German (`de`), French (`fr`), Spanish (`es`), Portuguese (`pt`), Italian (`it`), Russian (`ru`), Arabic (`ar`), Hindi (`hi`), Indonesian (`id`), Vietnamese (`vi`), Thai (`th`), Turkish (`tr`), Malay (`ms`), Filipino (`fil`), Polish (`pl`) and Hungarian (`hu`).

There is no language parameter: the language is detected from the audio.

***

## Request

Send the audio in the `file` field of a `multipart/form-data` request:

- Format: 16-bit PCM WAV or Ogg Opus, detected from the file content. WAV supports sample rates of 8000, 16000, 22050, 24000, 32000, 44100 and 48000 Hz.
- Channels: mono or stereo. For stereo audio, only the left channel is recognized.
- Size: at most 8 MiB. The upload must finish within 10 minutes.
- Duration: at most 120 seconds.

```bash
curl https://api.deepseek.com/v1/tools/asr \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -F file="@speech.wav"
```

***

## Response

```json
{
  "request_id": "...",
  "text": "What is the weather like in Shanghai today?",
  "duration_ms": 3200
}
```

| Field         | Description                                |
| ------------- | ------------------------------------------ |
| `request_id`  | The request ID                             |
| `text`        | The transcript                             |
| `duration_ms` | The duration of the audio, in milliseconds |

***

## Errors

| Status | Cause                                                                       |
| ------ | --------------------------------------------------------------------------- |
| `400`  | The audio is not 16-bit PCM WAV or Ogg Opus, or the `file` field is missing |
| `408`  | The upload did not finish within 10 minutes                                 |
| `413`  | The file is larger than 8 MiB                                               |
| `429`  | Your account has too many requests in progress                              |
| `503`  | The service is busy. Retry later                                            |
| `504`  | Recognition timed out                                                       |

***

<a id="billing"></a>

## Billing

| Billing unit      | List price | Limited-time price (50% off) |
| ----------------- | ---------- | ---------------------------- |
| Per hour of audio | $0.116     | $0.058                       |

Billed by audio duration to the second; a fraction of a second counts as 1 second.

***

<a id="rate-limits"></a>

## Rate Limits

An account can have at most 50 requests in progress; beyond that a request returns `429`.
