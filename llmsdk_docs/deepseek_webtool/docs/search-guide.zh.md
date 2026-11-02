> Source: https://api-docs.deepseek.com/zh-cn/guides/search.md (snapshot 2026-11-02)

# 网页搜索与抓取

Search 接口和 Fetch 接口为 Agent 与 RAG 应用提供实时网页内容：

- **Search 接口**按 query 搜索网页，返回结构化结果。该接口由 DeepSeek 自研搜索引擎提供支持。
- **Fetch 接口**抓取单个网页，以 Markdown 文本返回页面内容。

两者都是原始 JSON API，使用与 DeepSeek API 相同的 Bearer 鉴权。

Base URL 为 `https://api.deepseek.com`：

| API    | Endpoint                                        |
| ------ | ----------------------------------------------- |
| Search | `POST https://api.deepseek.com/v1/tools/search` |
| Fetch  | `POST https://api.deepseek.com/v1/tools/fetch`  |

完整的请求与响应 Schema 请参考 [Search API Reference](https://api-docs.deepseek.com/zh-cn/api/search.md) 和 [Fetch API Reference](https://api-docs.deepseek.com/zh-cn/api/fetch.md)。

***

## 鉴权

在请求头中携带 API Key 和 JSON 内容类型：

| 请求头             | 必填 | 值                           |
| --------------- | -- | --------------------------- |
| `Authorization` | 是  | `Bearer <DeepSeek API Key>` |
| `Content-Type`  | 是  | `application/json`          |

***

## Search 接口

### 请求

```bash
curl https://api.deepseek.com/v1/tools/search \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "DeepSeek V4 模型 发布",
    "count": 5,
    "need_content": true
  }'
```

```python
import requests

response = requests.post(
    "https://api.deepseek.com/v1/tools/search",
    headers={
        "Authorization": "Bearer <DeepSeek API Key>",
    },
    json={
        "query": "DeepSeek V4 模型 发布",
        "count": 5,
        "need_content": True,
    },
)
response.raise_for_status()

for result in response.json()["results"]:
    print(result["title"], result["url"])
    print(result["summary"])
```

请求字段：

| 字段             | 类型      | 必填 | 默认值     | 说明                                                  |
| -------------- | ------- | -- | ------- | --------------------------------------------------- |
| `query`        | string  | 是  | -       | 搜索词，1～128 个 Unicode 字符，不能全为空白，支持下方列出的搜索语法。          |
| `count`        | integer | 否  | `10`    | 返回条数，1～50。                                          |
| `ori_question` | string  | 否  | -       | 触发搜索的用户原始问题，1～128 个字符，有助于更好地理解搜索意图，传 `null` 视为未提供。  |
| `localization` | string  | 否  | `""`    | 用于优先返回本地化搜索结果的 IP 地址。                               |
| `need_content` | boolean | 否  | `false` | 是否在 `content` 中返回网页正文，为 `false` 时 `content` 恒为空字符串。 |

请求体中的未知字段会被忽略。

### 搜索语法

`query` 中的搜索语法会原样传递给搜索服务。下表中的示例将操作符与搜索词组合使用；你可以在一个 query 中组合多个操作符。

| 操作符       | 示例                                                    | 说明                                                                                     |
| --------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `site:`   | `DeepSeek site:github.com`                            | 将结果限制在指定站点，指定多个时用空格分隔并通过 `OR` 连接，例如 `DeepSeek site:github.com OR site:huggingface.co`。 |
| `-site:`  | `DeepSeek -site:example.com`                          | 排除指定站点，指定多个时用空格分隔。                                                                     |
| `-`       | `DeepSeek -广告`                                        | 排除包含指定关键词的网页，指定多个时用空格分隔。                                                               |
| `-"..."`  | `DeepSeek -"release notes"`                           | 排除包含指定短语的网页，短语内可以包含空格，指定多个时用空格分隔。                                                      |
| `"..."`   | `DeepSeek "精确短语"`                                     | 精确匹配指定短语，指定多个时用空格分隔。                                                                   |
| `lang:`   | `DeepSeek lang:zh,en`                                 | 将结果限制在指定语言，多种语言用逗号分隔，例如 `lang:zh,en`。                                                  |
| `after:`  | `DeepSeek after:2025` 或 `DeepSeek after:2025-01-01`   | 将结果限制在指定日期之后发布的网页。                                                                     |
| `before:` | `DeepSeek before:2026` 或 `DeepSeek before:2026-06-01` | 将结果限制在指定日期之前发布的网页。                                                                     |

例如：

```json
{
  "query": "DeepSeek 模型 site:github.com OR site:huggingface.co lang:zh after:2025",
  "count": 10
}
```

### 响应

请求成功时返回 HTTP 200 与 `results` 数组。搜索正常结束但没有匹配结果时，返回空数组。

```json
{
  "results": [
    {
      "rerank_score": 2.4,
      "title": "DeepSeek V4 模型发布",
      "url": "https://example.com/deepseek-v4",
      "snippet": "DeepSeek V4 已上线，支持工具调用与长上下文。",
      "summary": "DeepSeek 发布了 V4 模型。此次发布改进了工具调用与长上下文能力，适合 Agent 工作流。",
      "content": "DeepSeek V4 现已正式上线……",
      "site_name": "Example News",
      "site_icon": "https://example.com/favicon.ico",
      "date": "2026-06-01T00:00:00+00:00",
      "authority": 3
    }
  ]
}
```

`results` 中每一项包含以下字段：

| 字段             | 类型            | 说明                                             |
| -------------- | ------------- | ---------------------------------------------- |
| `rerank_score` | number        | 排序分数，0～3 分，综合考虑相关性、权威性、时效性等维度，大于等于 1.5 分为优质结果。 |
| `title`        | string        | 标题。                                            |
| `url`          | string        | 结果链接。                                          |
| `snippet`      | string        | 短摘要，与 query 相关，通常为 100～200 字符，适用于前端展现。         |
| `summary`      | string        | 长摘要，与 query 相关，通常为 600～800 字符，适用于给模型阅读。        |
| `content`      | string        | 网页正文，`need_content` 为 `false` 或正文缺失时为空字符串。     |
| `site_name`    | string 或 null | 站点名称，缺失时为 `null`。                              |
| `site_icon`    | string 或 null | 站点图标 URL，缺失时为 `null`。                          |
| `date`         | string 或 null | 发布时间，统一为 UTC 的 RFC 3339 格式，未知时为 `null`。        |
| `authority`    | integer       | 网页权威性，0～4（`-1` 表示未知），大于等于 3 为极权威结果。            |

***

## Fetch 接口

### 请求

```bash
curl https://api.deepseek.com/v1/tools/fetch \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article"
  }'
```

```python
import requests

response = requests.post(
    "https://api.deepseek.com/v1/tools/fetch",
    headers={
        "Authorization": "Bearer <DeepSeek API Key>",
    },
    json={"url": "https://example.com/article"},
)
response.raise_for_status()

page = response.json()
print(page["title"])
print(page["content"])
```

请求字段：

| 字段    | 类型     | 必填 | 说明                                                          |
| ----- | ------ | -- | ----------------------------------------------------------- |
| `url` | string | 是  | 要抓取的网页地址，长度不超过 8192，必须为含 host 的 HTTP/HTTPS URL，且不能携带用户名或密码。 |

### 响应

```json
{
  "title": "Example article",
  "content": "# Example article\n\nArticle content."
}
```

| 字段        | 类型     | 说明                |
| --------- | ------ | ----------------- |
| `title`   | string | 页面标题，缺失时为空字符串。    |
| `content` | string | 抓取后的 Markdown 正文。 |

Fetch 的结果受目标站点的可用性和访问策略影响。

***

## 错误

错误响应使用 OpenAI 兼容的错误格式，`param` 字段恒为 `null`。

```json
{
  "error": {
    "message": "'count' must be between 1 and 50",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_request_error"
  }
}
```

| HTTP 状态码 | 说明                                                                           |
| -------- | ---------------------------------------------------------------------------- |
| 400      | 请求头或请求体不合法，包括 JSON 格式错误或字段值无效。                                               |
| 401      | API Key 缺失或无效。                                                               |
| 402      | 账号余额不足。                                                                      |
| 403      | Fetch 请求被安全策略拒绝。                                                             |
| 404      | Fetch 未能获取可用的网页内容，例如 URL 不可用、被站点策略拦截、目标站点返回错误、内容类型不受支持或页面没有可提取的 Markdown 正文。 |
| 408      | 读取请求体超时。                                                                     |
| 413      | 请求体超过大小限制。                                                                   |
| 429      | 超过 Search 或 Fetch 的 QPS 限制。                                                  |
| 500      | 服务器内部错误。                                                                     |
| 504      | 下游请求超时。                                                                      |

Search 和 Fetch 都是只读请求。遇到 HTTP 408、429 或 5xx 错误时，请等待后重试。遇到 HTTP 402 时，请先充值再重试。对于其它 4xx 错误，如不修改请求，请勿重试。

***

## 计费

Search 和 Fetch 按请求次数计费，不按 token 或返回结果条数计费：

| API    | 计费单位          | 价格 |
| ------ | ------------- | -- |
| Search | 每 1,000 次成功请求 | 5元 |
| Fetch  | 每 1,000 次成功请求 | 5元 |

只有返回 HTTP 200 且产生结果的请求才会计费（Search 的 `results` 必须非空，Fetch 必须返回网页正文）。请求失败、搜索无结果或超时不计费。`count` 只控制返回的结果条数，不影响单次请求的价格。

请注意，当前用户在 DeepSeek Harness/Claude Code/Codex 中使用 DeepSeek API 时，已经会通过 Server 端工具调用访问到 Search/Fetch 接口，这部分 Search/Fetch 接口调用目前未计费，并将于北京时间 2026 年 11 月 1 日 00:00 起按次收取调用费用。

***

## 限速

对每个账号，Search 和 Fetch 分别独立限速，互不占用额度：

| API    | QPS 限制 |
| ------ | ------ |
| Search | 100    |
| Fetch  | 25     |

QPS（每秒请求数）限制按账号粒度计算，与使用哪个 API Key 无关，并与模型并发限制相互独立。超过账号级 QPS 限制的请求会收到 HTTP 429 错误码。除了账号级限制，Fetch 还针对目标域名有 QPS 限制，超过该限制也会收到 HTTP 429 错误码。
