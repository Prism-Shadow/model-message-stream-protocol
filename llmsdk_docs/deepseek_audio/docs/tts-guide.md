> Source: https://api-docs.deepseek.com/guides/tts.md (snapshot 2026-11-16)

# Text to Speech

Convert text into natural speech, for example to read chatbot answers aloud.

| Mode      | Request                                         | Input                                                                | Output                              |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Full text | `POST https://api.deepseek.com/v1/tools/tts`    | The complete text in a JSON body                                     | Audio streamed in the response body |
| Streaming | WebSocket `wss://api.deepseek.com/v1/tools/tts` | Text sent in chunks, for example while the model is still generating | Audio frames                        |

***

## Voices

| `voice_id` | Voice                   |
| ---------- | ----------------------- |
| `stella`   | Stella. Female. Default |
| `tide`     | Tide. Male              |

***

## Languages

Mandarin Chinese (`zh`), Cantonese (`yue`), English (`en`), Japanese (`ja`), Korean (`ko`), Malay (`ms`), Arabic (`ar`), Indonesian (`id`), Thai (`th`) and Vietnamese (`vi`).

There is no language parameter: the language is detected from the text.

***

## Full Text Request

Send the text as JSON:

| Field             | Required | Description                                                                                                                   |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `text`            | Yes      | The text to read. Must not be empty, and at most 10,000 [billed characters](#billing). The request body may be at most 64 KiB |
| `voice_id`        | No       | `stella` (default) or `tide`                                                                                                  |
| `format`          | No       | `wav` (default) or `pcm`                                                                                                      |
| `filter_markdown` | No       | Whether to remove Markdown formatting before reading. Defaults to `true`                                                      |

```bash
curl https://api.deepseek.com/v1/tools/tts \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from DeepSeek.", "voice_id": "stella"}' \
  --output speech.wav
```

The audio is streamed as it is synthesized, and one request returns at most 30 minutes of audio. `wav` returns `audio/wav`; `pcm` returns raw 16-bit mono PCM at 24 kHz.

| Status | Cause                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| `400`  | There is no readable text, or the text did not pass content review (`Content Exists Risk`) |
| `429`  | Your account has too many requests in progress                                             |
| `503`  | The service is busy. Retry later                                                           |
| `504`  | Synthesis timed out                                                                        |

If synthesis fails after the audio has started, the response is cut off, so treat a response that ends early as a failure.

Speed control and resuming an interrupted request are not supported.

***

## Streaming over WebSocket

1. Connect to `wss://api.deepseek.com/v1/tools/tts`. Optional query parameters: `voice_id`, `format` (`pcm` by default, or `opus`) and `filter_markdown`. `opus` returns Opus packets without a container, which cannot be saved directly as an Ogg file.
2. There are two ways to authenticate: send the header `Authorization: Bearer <API key>`, or pass the key as a WebSocket subprotocol, `Sec-WebSocket-Protocol: tts, bearer.<API key>`.
3. Send the text as JSON text messages, `{"event": "text", "text": "..."}`, and send `{"event": "finish_text"}` after the last chunk.
4. Audio arrives in binary messages. The session ends with a text message `{"event": "finish", "code": "...", "message": "..."}`, where `code` is `success` or an error code such as `invalid_input`, `content_filter`, `input_timeout` or `service_error`.

Limits: the session ends if no text arrives for 60 seconds; a session lasts at most 30 minutes; the text of one session may be at most 10,000 billed characters and 64 KiB. The server sends a WebSocket ping every 25 seconds.

In Python, with the `websockets` package:

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
# Requires the websockets package, version 14 or later.
import asyncio
import json
import os

import websockets


async def main():
    url = "wss://api.deepseek.com/v1/tools/tts?voice_id=stella&format=pcm"
    headers = {"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"}
    async with websockets.connect(url, additional_headers=headers) as ws:
        for chunk in ["Hello ", "from ", "DeepSeek."]:
            await ws.send(json.dumps({"event": "text", "text": chunk}))
        await ws.send(json.dumps({"event": "finish_text"}))

        with open("speech.pcm", "wb") as f:
            async for message in ws:
                if isinstance(message, bytes):
                    f.write(message)  # raw 16-bit signed mono PCM at 24 kHz
                    continue
                finish = json.loads(message)
                if finish["code"] != "success":
                    raise RuntimeError(f"{finish['code']}: {finish['message']}")
                break


asyncio.run(main())
```

***

<a id="billing"></a>

## Billing

| Billing unit          | List price | Limited-time price (50% off) |
| --------------------- | ---------- | ---------------------------- |
| Per 10,000 characters | $0.45      | $0.225                       |

A Chinese character counts as 2 characters; any other character, such as a letter, digit or space, counts as 1.

***

<a id="rate-limits"></a>

## Rate Limits

An account can have at most 50 requests in progress; beyond that a request returns `429`.
