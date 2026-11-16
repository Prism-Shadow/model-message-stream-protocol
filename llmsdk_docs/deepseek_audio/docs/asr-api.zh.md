> Source: https://api-docs.deepseek.com/zh-cn/api/asr.md (snapshot 2026-11-16)

# 语音识别

把音频文件识别为文本。整段音频在一次请求中上传，返回完整的识别结果。语种、限制、错误与计费见 [语音识别指南](https://api-docs.deepseek.com/zh-cn/guides/asr.md)。

## 接口

```http
POST /v1/tools/asr
```

operationId: `asr`

### 服务地址

- `https://api.deepseek.com`

## 身份验证

### 验证方式 1

**bearerAuth**

`Authorization: Bearer <API_KEY>`

```yaml
type: http
scheme: bearer
```

## 请求体

**必填**

### multipart/form-data

- 引用: [AsrRequest](#schema-asr-request) (`#/components/schemas/AsrRequest`)

## 响应

### 200

OK, 返回识别结果。

#### application/json

- 引用: [AsrResponse](#schema-asr-response) (`#/components/schemas/AsrResponse`)

**示例**

```json
{
  "request_id": "0b8c1c7e-3c0e-4d0f-9d3a-5f2a6f7e8b90",
  "text": "今天上海的天气怎么样？",
  "duration_ms": 3200
}
```

## 代码示例

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

## 引用的数据结构

### schema-asr-request

**AsrRequest** — `#/components/schemas/AsrRequest`

- `type`: `object`

- `required`: `["file"]`

- **字段**

  - **`file`** (必填)

    音频文件：16 位 PCM WAV 或 Ogg Opus。限制见 [语音识别指南](https://api-docs.deepseek.com/zh-cn/guides/asr.md)。

    - `type`: `string`

    - `format`: `binary`

### schema-asr-response

**AsrResponse** — `#/components/schemas/AsrResponse`

- `type`: `object`

- `required`: `["request_id","text","duration_ms"]`

- **字段**

  - **`request_id`** (必填)

    请求 ID。

    - `type`: `string`

  - **`text`** (必填)

    识别出的文本。

    - `type`: `string`

  - **`duration_ms`** (必填)

    音频时长，单位为毫秒。

    - `type`: `integer`
