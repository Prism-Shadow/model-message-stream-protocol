> Source: https://api-docs.deepseek.com/api/tts.md (snapshot 2026-11-16)

# Text to Speech

Convert text into speech. The audio is streamed in the response body as it is synthesized. See the [Text to Speech guide](https://api-docs.deepseek.com/guides/tts.md) for the voices, languages, limits, errors and billing.

To send the text in chunks, for example while a model is still generating it, connect to the same path over WebSocket (`wss://api.deepseek.com/v1/tools/tts`). The WebSocket protocol is described in the [Text to Speech guide](https://api-docs.deepseek.com/guides/tts.md).

## Endpoint

```http
POST /v1/tools/tts
```

operationId: `tts`

### Servers

- `https://api.deepseek.com`

## Authentication

### Alternative 1

**bearerAuth**

`Authorization: Bearer <API_KEY>`

```yaml
type: http
scheme: bearer
```

## Request body

**required**

### application/json

- Reference: [TtsRequest](#schema-tts-request) (`#/components/schemas/TtsRequest`)

## Responses

### 200

OK, returns the audio as a stream. By default the body is a WAV file. When `format` is `pcm`, the body is raw 16-bit signed mono PCM at 24 kHz and the `Content-Type` is `audio/pcm`.

#### audio/wav

- `type`: `string`

- `format`: `binary`

**Example**

```
(binary audio)
```

## Code samples

### curl

```bash
# Set DEEPSEEK_API_KEY to your API key before running this example.
curl --silent --show-error "https://api.deepseek.com/v1/tools/tts" \
  --header "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
  "text": "Hello from DeepSeek.",
  "voice_id": "stella"
}' \
  --output speech.wav
```

### Python — requests

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
import os
import requests

response = requests.post(
    "https://api.deepseek.com/v1/tools/tts",
    headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    json={"text": "Hello from DeepSeek.", "voice_id": "stella"},
    stream=True,
    timeout=60,
)
response.raise_for_status()
with open("speech.wav", "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
```

## Referenced schemas

### schema-tts-request

**TtsRequest** — `#/components/schemas/TtsRequest`

- `type`: `object`

- `required`: `["text"]`

- **Properties**

  - **`text`** (required)

    The text to read. Must not be empty.

    - `type`: `string`

  - **`voice_id`** (optional)

    The voice. `stella` is a female voice and `tide` is a male voice.

    - `type`: `string`

    - `enum`: `["stella","tide"]`

    - `default`: `stella`

  - **`format`** (optional)

    The audio format of the response. `wav` returns `audio/wav`; `pcm` returns raw 16-bit signed mono PCM at 24 kHz.

    - `type`: `string`

    - `enum`: `["wav","pcm"]`

    - `default`: `wav`

  - **`filter_markdown`** (optional)

    Whether to remove Markdown formatting from the text before reading it.

    - `type`: `boolean`

    - `default`: `true`
