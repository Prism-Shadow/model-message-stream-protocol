> Source: https://api-docs.deepseek.com/api/asr.md (snapshot 2026-11-16)

# Speech to Text

Transcribe an audio file into text. The whole file is sent in one request and the complete transcript is returned. See the [Speech to Text guide](https://api-docs.deepseek.com/guides/asr.md) for the languages, limits, errors and billing.

## Endpoint

```http
POST /v1/tools/asr
```

operationId: `asr`

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

### multipart/form-data

- Reference: [AsrRequest](#schema-asr-request) (`#/components/schemas/AsrRequest`)

## Responses

### 200

OK, returns the transcript.

#### application/json

- Reference: [AsrResponse](#schema-asr-response) (`#/components/schemas/AsrResponse`)

**Example**

```json
{
  "request_id": "0b8c1c7e-3c0e-4d0f-9d3a-5f2a6f7e8b90",
  "text": "What is the weather like in Shanghai today?",
  "duration_ms": 3200
}
```

## Code samples

### curl

```bash
# Set DEEPSEEK_API_KEY to your API key before running this example.
curl --silent --show-error "https://api.deepseek.com/v1/tools/asr" \
  --header "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  --form "file=@speech.wav"
```

### Python — requests

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
import os
import requests

with open("speech.wav", "rb") as f:
    response = requests.post(
        "https://api.deepseek.com/v1/tools/asr",
        headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
        files={"file": f},
        timeout=60,
    )
response.raise_for_status()
print(response.json()["text"])
```

## Referenced schemas

### schema-asr-request

**AsrRequest** — `#/components/schemas/AsrRequest`

- `type`: `object`

- `required`: `["file"]`

- **Properties**

  - **`file`** (required)

    The audio file: 16-bit PCM WAV or Ogg Opus. See the [Speech to Text guide](https://api-docs.deepseek.com/guides/asr.md) for the limits.

    - `type`: `string`

    - `format`: `binary`

### schema-asr-response

**AsrResponse** — `#/components/schemas/AsrResponse`

- `type`: `object`

- `required`: `["request_id","text","duration_ms"]`

- **Properties**

  - **`request_id`** (required)

    The request ID.

    - `type`: `string`

  - **`text`** (required)

    The transcript.

    - `type`: `string`

  - **`duration_ms`** (required)

    The duration of the audio, in milliseconds.

    - `type`: `integer`
