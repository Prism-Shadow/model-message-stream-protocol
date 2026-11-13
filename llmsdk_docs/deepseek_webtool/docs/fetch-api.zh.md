> Source: https://api-docs.deepseek.com/zh-cn/api/fetch.md (snapshot 2026-11-02)

# 网页抓取

抓取网页，返回页面标题与 Markdown 格式的内容。错误处理和计费说明请参考[网页搜索与抓取指南](https://api-docs.deepseek.com/zh-cn/guides/search.md)。

响应示例仅展示页面内容的摘录。

## 接口

```http
POST /v1/tools/fetch
```

operationId: `fetch`

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

- 引用: [FetchRequest](#schema-fetch-request) (`#/components/schemas/FetchRequest`)

## 响应

### 200

OK, 返回抓取到的网页内容。

#### application/json

- 引用: [FetchResponse](#schema-fetch-response) (`#/components/schemas/FetchResponse`)

**示例**

```json
{
  "title": "首次调用 API | DeepSeek API Docs",
  "content": "# 首次调用 API\n\nDeepSeek API 使用与 OpenAI/Anthropic 兼容的 API 格式，通过修改配置，您可以使用 OpenAI/Anthropic SDK 来访问 DeepSeek API，或使用与 OpenAI/Anthropic API 兼容的软件。"
}
```

## 代码示例

### curl

```bash
# Set DEEPSEEK_API_KEY to your API key before running this example.
curl --silent --show-error --max-time 60 "https://api.deepseek.com/v1/tools/fetch" \
  --header "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
  "url": "https://api-docs.deepseek.com/zh-cn/"
}'
```

### Python — requests

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
import os
import requests

response = requests.post(
    "https://api.deepseek.com/v1/tools/fetch",
    headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    json={"url": "https://api-docs.deepseek.com/zh-cn/"},
    timeout=60,
)
response.raise_for_status()
page = response.json()
print(page["title"])
print(page["content"])
```

## 引用的数据结构

### schema-fetch-request

**FetchRequest** — `#/components/schemas/FetchRequest`

- `type`: `object`

- `required`: `["url"]`

- **字段**

  - **`url`** (必填)

    要抓取的网页地址，长度不超过 8192；必须为含 host 的 HTTP/HTTPS URL，且不能携带用户名或密码。

    - `type`: `string`

    - `minLength`: `1`

    - `maxLength`: `8192`

### schema-fetch-response

**FetchResponse** — `#/components/schemas/FetchResponse`

- `type`: `object`

- `required`: `["title","content"]`

- **字段**

  - **`title`** (必填)

    页面标题；缺失时为空字符串。

    - `type`: `string`

  - **`content`** (必填)

    抓取后的 Markdown 正文。

    - `type`: `string`
