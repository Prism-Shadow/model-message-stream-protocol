> Source: https://api-docs.deepseek.com/zh-cn/api/tts.md (snapshot 2026-11-16)

# 语音合成

把文本合成为语音，音频边合成边在响应体中流式返回。音色、语种、限制、错误与计费见 [语音合成指南](https://api-docs.deepseek.com/zh-cn/guides/tts.md)。

如果要分段发送文本（例如模型还在生成时），请通过 WebSocket 连接同一路径（`wss://api.deepseek.com/v1/tools/tts`），协议见 [语音合成指南](https://api-docs.deepseek.com/zh-cn/guides/tts.md)。

## 接口

```http
POST /v1/tools/tts
```

operationId: `tts`

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

### application/json

- 引用: [TtsRequest](#schema-tts-request) (`#/components/schemas/TtsRequest`)

## 响应

### 200

OK, 以流的形式返回音频。默认返回 WAV 文件；`format` 为 `pcm` 时，返回 24 kHz、16 位有符号、单声道的原始 PCM，`Content-Type` 为 `audio/pcm`。

#### audio/wav

- `type`: `string`

- `format`: `binary`

**示例**

```
（音频二进制数据）
```

## 代码示例

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

## 引用的数据结构

### schema-tts-request

**TtsRequest** — `#/components/schemas/TtsRequest`

- `type`: `object`

- `required`: `["text"]`

- **字段**

  - **`text`** (必填)

    要朗读的文本，不能为空。

    - `type`: `string`

  - **`voice_id`** (可选)

    音色。`stella` 为女声，`tide` 为男声。

    - `type`: `string`

    - `enum`: `["stella","tide"]`

    - `default`: `stella`

  - **`format`** (可选)

    响应的音频格式。`wav` 返回 `audio/wav`；`pcm` 返回 24 kHz、16 位有符号、单声道的原始 PCM。

    - `type`: `string`

    - `enum`: `["wav","pcm"]`

    - `default`: `wav`

  - **`filter_markdown`** (可选)

    朗读前是否去除文本中的 Markdown 格式。

    - `type`: `boolean`

    - `default`: `true`
