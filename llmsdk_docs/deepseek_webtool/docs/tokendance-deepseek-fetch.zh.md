> Source: TokenDance console, "使用 deepseek-fetch" (pasted by the owner 2026-11-02). TokenDance bills ¥0.005 per request for `deepseek-search` and `deepseek-fetch` (owner, 2026-11-02).

# 使用 deepseek-fetch

将 `YOUR_API_KEY` 替换为你的密钥即可调用。

## DeepSeek 网页抓取 协议

```bash title="cURL"
curl https://tokendance.space/gateway/deepseek/v1/tools/fetch \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api-docs.deepseek.com/zh-cn/guides/search/"}'
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 | 目标网页地址，最长 8192 个字符；必须是包含主机名的 HTTP/HTTPS URL，且不能携带用户名或密码 |

### 返回示例

```json
{
  "title": "网页搜索与抓取",
  "content": "# 网页搜索与抓取\n\nSearch 搜索网页，Fetch 提取网页正文。"
}
```

`title` 是页面标题，缺失时为 `""`；`content` 是抓取后的 Markdown 正文。
