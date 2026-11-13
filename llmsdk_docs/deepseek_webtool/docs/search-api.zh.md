> Source: https://api-docs.deepseek.com/zh-cn/api/search.md (snapshot 2026-11-02)

# 网页搜索

按 query 搜索网页，返回结构化的结果列表。支持的搜索语法、错误处理和计费说明请参考[网页搜索与抓取指南](https://api-docs.deepseek.com/zh-cn/guides/search.md)。

## 接口

```http
POST /v1/tools/search
```

operationId: `search`

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

- 引用: [SearchRequest](#schema-search-request) (`#/components/schemas/SearchRequest`)

## 响应

### 200

OK, 返回搜索结果。

#### application/json

- 引用: [SearchResponse](#schema-search-response) (`#/components/schemas/SearchResponse`)

**示例**

```json
{
  "results": [
    {
      "rerank_score": 2.4,
      "title": "DeepSeek V4 model released",
      "url": "https://example.com/deepseek-v4",
      "snippet": "DeepSeek V4 is now available, with tool calling and long-context support.",
      "summary": "DeepSeek has released the V4 model. The release adds improved tool calling and long-context support for agent workflows.",
      "content": "",
      "site_name": "Example News",
      "site_icon": "https://example.com/favicon.ico",
      "date": "2026-06-01T00:00:00+00:00",
      "authority": 3
    }
  ]
}
```

## 代码示例

### curl

```bash
# Set DEEPSEEK_API_KEY to your API key before running this example.
curl --silent --show-error --max-time 60 "https://api.deepseek.com/v1/tools/search" \
  --header "Authorization: Bearer ${DEEPSEEK_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
  "query": "DeepSeek API documentation",
  "count": 1,
  "need_content": false
}'
```

### Python — requests

```python
# Set DEEPSEEK_API_KEY to your API key before running this example.
import os
import requests

response = requests.post(
    "https://api.deepseek.com/v1/tools/search",
    headers={"Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}"},
    json={
        "query": "DeepSeek API documentation",
        "count": 1,
        "need_content": False,
    },
    timeout=60,
)
response.raise_for_status()
for result in response.json()["results"]:
    print(result["title"], result["url"])
    print(result["summary"])
```

## 引用的数据结构

### schema-search-request

**SearchRequest** — `#/components/schemas/SearchRequest`

- `type`: `object`

- `required`: `["query"]`

- **字段**

  - **`query`** (必填)

    搜索词。支持 `site:`、`-site:`、引号等搜索语法。必须为 1～128 个 Unicode 字符，且不能全为空白。

    - `type`: `string`

    - `minLength`: `1`

    - `maxLength`: `128`

  - **`count`** (可选)

    返回条数，取值在 1 到 50 之间，默认为 10。

    - `type`: `integer`

    - `minimum`: `1`

    - `maximum`: `50`

    - `default`: `10`

  - **`ori_question`** (可选)

    触发搜索的用户原始问题，1～128 个字符。提供该字段有助于更好地理解搜索意图；传 `null` 视为未提供。

    - `type`: `string`

    - `nullable`: `true`

    - `minLength`: `1`

    - `maxLength`: `128`

  - **`localization`** (可选)

    用于优先返回本地化搜索结果的 IP 地址，默认为空字符串。

    - `type`: `string`

    - `default`: `""`

  - **`need_content`** (可选)

    是否在 `content` 中返回网页正文。默认为 `false`；为 `false` 时，`content` 恒为空字符串。

    - `type`: `boolean`

    - `default`: `false`

### schema-search-response

**SearchResponse** — `#/components/schemas/SearchResponse`

- `type`: `object`

- `required`: `["results"]`

- **字段**

  - **`results`** (必填)

    搜索结果；没有匹配结果时为空数组。

    - `type`: `array`

    - **数组元素**

      - 引用: [SearchResult](#schema-search-result) (`#/components/schemas/SearchResult`)

### schema-search-result

**SearchResult** — `#/components/schemas/SearchResult`

- `type`: `object`

- `required`: `["rerank_score","title","url","snippet","summary","content","site_name","site_icon","date","authority"]`

- **字段**

  - **`rerank_score`** (必填)

    排序分数，0～3 分，综合考虑相关性、权威性、时效性等维度。大于等于 1.5 分为优质结果。

    - `type`: `number`

    - `format`: `float`

    - `minimum`: `0`

    - `maximum`: `3`

  - **`title`** (必填)

    搜索结果标题。

    - `type`: `string`

  - **`url`** (必填)

    搜索结果链接。

    - `type`: `string`

  - **`snippet`** (必填)

    短摘要，与 query 相关，通常为 100～200 字符，适用于前端展现。

    - `type`: `string`

  - **`summary`** (必填)

    长摘要，与 query 相关，通常为 600～800 字符，适用于给模型阅读。

    - `type`: `string`

  - **`content`** (必填)

    网页正文。`need_content` 为 `false` 或正文缺失时为空字符串。

    - `type`: `string`

  - **`site_name`** (必填)

    站点名称；缺失时为 `null`。

    - `type`: `string`

    - `nullable`: `true`

  - **`site_icon`** (必填)

    站点图标 URL；缺失时为 `null`。

    - `type`: `string`

    - `nullable`: `true`

  - **`date`** (必填)

    发布时间，统一为 UTC 的 RFC 3339 格式；未知时为 `null`。

    - `type`: `string`

    - `format`: `date-time`

    - `nullable`: `true`

    **示例**

    ```json
    "2026-06-01T00:00:00+00:00"
    ```

  - **`authority`** (必填)

    网页权威性，0～4（`-1` 表示未知）；大于等于 3 为极权威结果。

    - `type`: `integer`

    - `minimum`: `-1`

    - `maximum`: `4`
