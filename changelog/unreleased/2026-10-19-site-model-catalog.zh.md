# 网站新增模型目录与状态页

- **Date:** 2026-10-19
- **Type:** feature
- **Scope:** `site`, `.github`

[English](2026-10-19-site-model-catalog.md)

## 变更内容

- `/models/` 与 `/zh/models/` 列出 SDK 注册表（构建时读取 `src_ts/src/registry.ts`）中的每一项：厂商与服务商标志、模态、上下文窗口，以及每百万 token 的输入、输出、缓存标价（可切换 USD 或 CNY），支持搜索和按列排序。
- 目录中每一行都可以展开为接入代码：TypeScript 和 Python 的 `AutoLLMClient` 调用、MMSP 服务端模型表中的一行配置，并标出读取的密钥变量。官方模型使用厂商自有端点时给出最短写法 `AutoLLMClient(model=...)`。
- `/status/` 与 `/zh/status/` 展示 `status-data` 分支上的每日状态探测数据：首行给出所有已探测渠道中最差的状态和本月探测费用，下面每个渠道一块，包含 TTFT、TPS、本月费用、近 90 天的状态条和可用天数占比。未配置密钥的渠道显示为灰色的「无密钥」，不算故障。
- 目录的状态列把每个已探测的行链接到 `/status/` 上对应的区块；未探测的行显示「未探测」。
- `/models.json` 为 Agent 提供整个目录：每一项的端点、客户端、密钥变量、标价、接入代码和状态键。
- 顶栏在文档入口之后新增「模型」和「状态」，宽度达到 1024 px 时才在同一行内显示全部入口。首页的「等 1000+ 个模型」链接到模型目录。`sitemap.xml` 和 `llms.txt` 收录了这两个页面。
- `src_ts/src/registry.ts` 或 `src_ts/src/autoClient.ts` 变化时，`pages.yml` 会重新构建网站。

## 服务商

| 服务商 | Base URL | 密钥变量 |
| --- | --- | --- |
| OpenAI、Anthropic、Gemini API、Z.ai、Moonshot、DeepSeek、MiniMax | 厂商自有端点 | `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`ZAI_API_KEY`、`MOONSHOT_API_KEY`、`DEEPSEEK_API_KEY`、`MINIMAX_API_KEY` |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `SILICONFLOW_API_KEY` |
| TokenDance | `https://tokendance.space/gateway/v1`、`https://tokendance.space/gateway` | `TOKENDANCE_API_KEY` |
| Vertex AI | `https://aiplatform.googleapis.com` | `VERTEX_API_KEY`，内容为服务账号 JSON |
| Amazon Bedrock | `bedrock://<region>` | `BEDROCK_API_KEY`，格式为 `ACCESS,SECRET` |
