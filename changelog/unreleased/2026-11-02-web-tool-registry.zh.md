# 网页工具模型进入注册表与模型索引

- **Date:** 2026-11-02
- **Type:** feature
- **Scope:** `registry`, `site`, `skills`
- **PR:** [#312](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/312)

[English](2026-11-02-web-tool-registry.md)

## 变更内容

- `list_supported_models()` / `listSupportedModels()` 从 347 条增至 353 条，Python 与 TypeScript 一致：DeepSeek 自家端点（官方厂商端点分组，共 58 行）和 TokenDance（共 63 行）上的 `deepseek-search` 与 `deepseek-fetch`，以及新增 Jina 分组中的 `jina-search` 与 `jina-fetch`。Playground 的模型菜单通过 `GET /api/registry` 列出了它们。
- `Modality` 新增 `"Web"`，表示网页工具在 `webtool.done` 中返回的网页。这六行的输入为 `["Text"]`，输出为 `["Web"]`，没有上下文窗口。
- 模型索引用 Lucide 的 globe 图标表示 Web 输出，标签为 "Web" / "网页"。网页工具行的集成代码通过无状态的 `streamingResponse` / `streaming_response` 打印每个网页的标题和 URL：搜索以 `webtool_config: {count: 3}` 查询 "Hello, World!"，抓取读取 `https://example.com`，两者按模型 id 中的 `-fetch` 区分，与客户端的做法相同。其余 347 行的集成代码没有变化。
- 站点的 `PROVIDERS` 新增 Jina AI（`https://s.jina.ai` 与 `https://r.jina.ai`，密钥 `JINA_API_KEY`），`VENDORS` 为 `jina-` 开头的 id 新增 Jina AI，标志取自 lobe-icons 的 Jina。TokenDance 在 `/gateway/deepseek` 上的两行归入 TokenDance 已有的前缀。
- `/models/` 从 1,185,639 字节增至 1,204,982 字节（gzip 后从 55,446 增至 56,260），`/zh/models/` 从 1,198,148 增至 1,217,678（56,319 增至 57,143），`/models.json` 从 115,721 增至 117,324（6,818 增至 7,000），模型索引的脚本从 15,767 增至 16,543（6,594 增至 6,814）。
- 两个 `skills/*/reference/api.md` 的模态列表加入了 `Web`。

## 注册表元数据

| 模型 | Base URL | 客户端 | 输入 → 输出 | 每百万 prompt tokens 价格 |
| --- | --- | --- | --- | --- |
| `deepseek-search` | `https://api.deepseek.com` | `deepseek-official`，经 `deepseek-webtool` 服务 | Text → Web | ¥5,000 |
| `deepseek-fetch` | `https://api.deepseek.com` | `deepseek-official`，经 `deepseek-webtool` 服务 | Text → Web | ¥5,000 |
| `jina-search` | `https://s.jina.ai` | `jina-webtool` | Text → Web | $0.05 |
| `jina-fetch` | `https://r.jina.ai` | `jina-webtool` | Text → Web | $0.05 |
| `deepseek-search` | `https://tokendance.space/gateway/deepseek` | `deepseek-webtool` | Text → Web | ¥5,000 |
| `deepseek-fetch` | `https://tokendance.space/gateway/deepseek` | `deepseek-webtool` | Text → Web | ¥5,000 |

每一行的输出价格都是 0。新增的 base URL 常量为 `_TOKENDANCE_DEEPSEEK` / `TOKENDANCE_DEEPSEEK`、`_JINA_SEARCH` / `JINA_SEARCH` 和 `_JINA_READER` / `JINA_READER`。

- **DeepSeek** 每 1,000 次成功请求收费 ¥5（https://api-docs.deepseek.com/zh-cn/guides/search.md，2026-11-02 读取），**TokenDance** 每次请求 ¥0.005（其控制台，2026-11-02 读取）。`deepseek-webtool` 每次请求记 1 个 prompt token，因此这几行存为每百万 ¥5,000。
- **Jina** 的模型 API https://api.jina.ai/v1/models 列出其模型的价格为每百万 tokens $0.05（2026-11-02 读取）。`jina-webtool` 把 Jina 计费的 token 数记为 prompt tokens：搜索固定 10,000，读取按网页的 token 数。
