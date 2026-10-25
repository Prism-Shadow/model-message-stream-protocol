# 精简的 /models.json，集成代码改在浏览器中组装

- **Date:** 2026-10-25
- **Type:** feature
- **Scope:** `site`
- **PR:** [#305](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/305)
- **Breaking:** yes — `/models.json` 的每一行去掉了 `kit`、`vendor`、`status_key`、`pricing.currency` 和 `pricing.thoughts_tokens`，也不再出现 `null`；`/models/kits.json` 与 `/zh/models/kits.json` 已删除。

[English](2026-10-25-models-json-slim.md)

## 变更内容

- `/models.json` 的每一行保留 `model`、`base_url`、`client`、`provider`（名称）、`input_modalities`、`output_modalities`、`context_window`、`pricing` 和 `api_key_env`；只有服务商的密钥不是普通 token 时（Vertex AI、Amazon Bedrock、vLLM）才另有 `api_key_format`，内容仍是英文提示。`pricing` 只含 `prompt_tokens`、`response_tokens` 和 `cached_tokens` 三项。注册表没有记录的值直接省略，不再写成 `null`。文件仍是一个 JSON 文档，每行一个条目。
- `/models.json` 新增顶层字段 `call`，给出一个适用于每一行的构造调用：`"python": "AutoLLMClient(model=model, client_type=client, base_url=base_url, api_key=os.environ[api_key_env])"`、`"typescript": "new AutoLLMClient({ model, clientType: client, baseUrl: base_url, apiKey: process.env[api_key_env] })"`，以及指向快速开始文档的 `"docs"`。币种只在顶层的 `pricing` 说明里写一次，说明中也写明思考 token 按 `response_tokens` 计费。该端点直接读取 `listSupportedModels("USD")` 和服务商表；如果注册表中有条目的思考 token 与回复 token 单价不同，构建会报错停止。
- 模型索引改为在浏览器中组装每个条目的程序、运行命令和给 Agent 的提示词，依据是该行本身和页面上的一张服务商表。模板从 `site/src/shared/catalog.ts` 移到新文件 `site/src/shared/kit.ts`（`kitFor`、`agentPromptFor`、`catalogKit`、`literal`、`formatContext`、`formatPrice`），由页面脚本导入。每行带上 `data-client`、`data-p`（其服务商在 `<script type="application/json" data-kit-providers>` 中的序号）、`data-kind`（文本模型不带），以及用字母表示的模态 `data-in` 与 `data-out`；外层 section 带 `data-site`。条目的类型仍在构建时决定（`catalog.ts` 中的 `kitEntry()`），服务商表也由构建写入（`kitProvider()`）。
- 对话框里的程序和服务端配置行对每个条目都使用完整的构造调用（模型、客户端类型、base URL 和密钥变量），与 `call` 一致；位于厂商自有端点的 55 个条目此前只显示模型 id。这些条目的 Python 程序增加了 `import os`，服务端配置行增加了 `base_url` 和 `client_type`，嵌入这两个程序的 Agent 提示词也随之更新。原本就使用完整写法的行没有变化，运行命令也没有变化。`catalog.ts` 不再从 `src_ts/src/credentials.ts` 读取 `MODEL_FAMILIES`，`site/src/shared/providers.ts` 中的服务商去掉了 `official` 字段。
- 点击后对话框立即填好内容。`kits.json` 的获取、页面加载后的预取、加载中与加载失败的提示行、两种语言中对应的 `kit.loading` 和 `kit.loadFailed` 字符串，以及 `catalogKits()` 均已删除。
- `llms.txt` 按新的字段和 `call` 描述 `/models.json`。
- 体积（原始字节，括号内为 gzip 后）：`/models.json` 从 837,545（23,592）降到 115,078（6,798）。`/models/` 从 1,154,025（53,974）变为 1,179,159（55,255），`/zh/models/` 从 1,166,447（54,788）变为 1,191,590（56,124）；目录脚本从 7,251（2,927）变为 15,767（6,593），状态页脚本从 18,359（6,869）变为 17,830（6,776）。页面不再获取 `/models/kits.json`（1,838,349，gzip 后 35,934）和 `/zh/models/kits.json`（1,865,338，gzip 后 36,630）。

## 兼容性

- `kit`：把该行的 `model`、`client`、`base_url` 和 `api_key_env` 代入顶层的 `call`。完整的程序、服务端配置行和运行命令仍在模型索引页上，每行的对话框里都有。
- `status_key`：按 `status.key` 给出的顺序拼接该行字段，即 `` `${client}+${base_url}+${model}` ``。
- `vendor`：没有替代字段。网关上的模型 id 本身带有厂商名（`anthropic/claude-opus-5.5`），模型索引页上也仍然显示厂商标志。
- `pricing.currency`：所有价格都是美元，见顶层的 `pricing` 说明。
- `pricing.thoughts_tokens`：读取 `pricing.response_tokens`。
- `null`：缺少 `context_window` 或 `pricing` 表示注册表没有记录；可按 `row.context_window ?? null` 读取。
- `/models/kits.json` 与 `/zh/models/kits.json`：改为读取 `/models.json` 并使用 `call`，或在 `/models/` 上打开该条目的对话框。
