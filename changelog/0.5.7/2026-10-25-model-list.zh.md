# 注册表、模型索引与 Playground 的模型列表大幅扩充

- **Date:** 2026-10-25
- **Type:** feature
- **Scope:** `registry`, `site`, `playground`, `docs`, `skills`
- **PR:** [#302](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/302)

[English](2026-10-25-model-list.md)

## 变更内容

- `list_supported_models()` / `listSupportedModels()` 从 125 条增至 345 条，Python 与 TypeScript 完全一致。penguin-harness 目录中的每个条目都有了对应的行，只有三类除外：已退役的条目、`custom` 占位条目，以及 OpenCode 已不再列出的五个 OpenCode Go 条目：`cat-jam-free`、`gemini-4-argon-contributor`、`longcat-2.5-preview-free`、`space-bunny` 和 `step-5-preview-free`。按分组：
  - **厂商官方端点**新增 12 条（共 55 条）：`gpt-5.6`（`gpt-5.6-sol` 的简写别名）、`gpt-5.5-pro`、`gpt-5.4`、`gpt-5.4-pro`、`gpt-5.4-mini`、`gpt-5.4-nano`、`claude-opus-4-7`、`gemini-3.1-pro-preview`、`gemini-3.1-flash-lite`、`gemini-3-flash-preview`、`glm-5` 和 `kimi-k2.5`，价格取自各厂商的价格页，读取于 2026-10-24。Moonshot 的价格页已不再列出 `kimi-k2.5`，所以它的价格和上下文窗口取自 harness 目录。
  - **OpenRouter** 新增 87 条（共 123 条），数据取自实时 models API 和每个模型的 `/endpoints` 列表，读取于 2026-10-24：Qwen 10 条、OpenAI 7 条、Google 7 条（Gemini 与 Gemma）、Mistral 6 条、Z.ai 5 条、NVIDIA 5 条、Xiaomi 4 条、xAI 4 条、Meta 4 条外加 Llama 2 条、DeepSeek 4 条、ByteDance Seed 4 条、Perplexity 3 条、MiniMax 3 条、StepFun 2 条、Moonshot AI 2 条、inclusionAI 2 条、Inception 2 条、Cohere 2 条、Anthropic 2 条、Amazon 2 条，Thinking Machines、Tencent、Recursive、Meituan 和 `openrouter/free` 路由各 1 条。`minimax/minimax-m3.1-flash:free` 这个 slug 已没有可用端点，改为付费的 `minimax/minimax-m3.1-flash`。
  - **SiliconFlow** 新增 1 条（共 14 条）：`Qwen/Qwen3.6-35B-A3B`，取自 https://siliconflow.cn/pricing。
  - **TokenDance（词元跳动）**新增 44 条（共 61 条），取自公开目录 https://tokendance.space/portal/api/models/all：43 个对话模型，以及向量模型 `qwen-text-embedding-v4`（`openai-embedding`）。`kimi-*` 用 `moonshot-official`，纯文本的 `glm-*` 用 `zai-official`，`deepseek-*` 用 `openai-chat`，`minimax-m2.7` 和 `minimax-m2.5` 在 `https://tokendance.space/gateway` 上用 `ant-messages`；其余模型在目录列出 Responses 协议时用 `openai-responses`，否则用 `openai-chat`。
  - **OpenCode Go** 是新分组，共 28 条：模型 id 和协议取自 https://opencode.ai/v2/docs/console/go/ 与 harness 目录，价格是文档列出的每 token 费率，上下文窗口和输入模态取自 models.dev。
  - **Fireworks AI**（13 条）、**DashScope**（7 条）、**Qwen Token Plan**（6 条）、**Atlas Cloud**（3 条）、**Penguin Go**（9 条）、**ModelScope**（3 条）和 **vLLM**（8 条）都是新分组：模型 id、客户端和 base URL 取自 harness 目录；价格、上下文窗口和模态在提供方公开了的情况下取自其公开页面，否则沿用 harness 目录的值。
- OpenRouter 原有的 36 条于 2026-10-24 重新读取，其中 5 条价格有变（见下文）。
- 注册表各分组的标题注释统一为 `--- <平台> (<行数>; <key>; <来源>, read <日期>)` 的格式，两种语言一致。`list_supported_models` / `listSupportedModels` 的文档注释列出了覆盖的平台，`SupportedModel` 的文档注释写明了每类平台存的是哪种价格，`/models.json` 对价格的说明也随之修改。
- 模型索引改为按需获取集成代码。`/models/kits.json` 与 `/zh/models/kits.json`（`catalogKits`）存放每行的程序、运行命令和给 Agent 的提示词，这些内容原先内嵌在页面里。页面在用户第一次悬停或聚焦某个代码按钮、或打开对话框时获取它们，页面加载完成后会预取一次，到达之前代码区显示一行加载提示。每行都有的箭头和代码图标改为引用 sprite 中的同一个 symbol。`/models/` 的 345 行共 1,151,073 字节（gzip 后 55,140 字节）；此前 125 行、代码内嵌时为 1,135,393 字节（gzip 后 47,147 字节）。
- 两个 Playground 都提供 `GET /api/registry`，为注册表的每个条目返回 `{"models": [{"model", "client", "base_url"}, ...]}`。模型菜单第一次打开时获取它，把菜单里还没有的条目插到 Custom model 之前，每条的说明为 `client · host`，选中即设置好客户端类型和 base URL；获取失败时，下次打开菜单会重试。原有的 13 个静态选项保留，菜单的筛选也会匹配说明文字。
- 网站的 `PROVIDERS` 新增 OpenCode Go（同时包含文档中的 `/inference/go` 地址和 `/zen/go` 地址）、Fireworks AI、DashScope、Qwen Token Plan、Atlas Cloud、Penguin Go、ModelScope 和 vLLM，各自的 key 变量见“注册表元数据”。`VENDORS` 新增 Mistral、Meta、Cohere、Amazon、Perplexity、ByteDance Seed、Inception、inclusionAI、iFlytek Spark 和 Dots。`opencode`、`fireworks`、`atlascloud`、`modelscope`、`vllm`、`mistral`、`meta`、`cohere`、`aws`、`perplexity`、`bytedance`、`inception`、`ling` 和 `spark` 这些标志取自 lobe-icons；Penguin Go 和 Dots 没有标志。
- 模型文档页的网关表、README 的 Supported Models 表和两个 `skills/*/reference/models.md` 都列出了新网关的 base URL、key 变量以及每个模型该用的客户端。skills 中过时的 `minimax/minimax-m3.1-flash:free` 改为 `minimax/minimax-m3.1-flash`。
- 模型索引中没有图标的厂商或服务商以中性方块中的首字母显示，不再留空白；并为 `inkling`（Thinking Machines）、`recursive/`（Recursive）与 `openrouter/`（OpenRouter）标明厂商。

## 注册表元数据

新增的 base URL，以及网站、文档和分组标题注释为每个 key 使用的变量名。SDK 不会读取这些变量：程序把 key 作为 `api_key` 传入，模型索引给出的代码也是这样做的。

| Python / TypeScript 常量 | Base URL | Key 变量 |
| --- | --- | --- |
| `_OPENCODE_GO` / `OPENCODE_GO` | `https://opencode.ai/inference/go/openai/v1` | `OPENCODE_API_KEY` |
| `_OPENCODE_GO_ANTHROPIC` / `OPENCODE_GO_ANTHROPIC` | `https://opencode.ai/inference/go/anthropic` | `OPENCODE_API_KEY` |
| `_OPENCODE_GO_GOOGLE` / `OPENCODE_GO_GOOGLE` | `https://opencode.ai/inference/go/google` | `OPENCODE_API_KEY` |
| `_FIREWORKS` / `FIREWORKS` | `https://api.fireworks.ai/inference/v1` | `FIREWORKS_API_KEY` |
| `_DASHSCOPE` / `DASHSCOPE` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| `_QWEN_TOKEN_PLAN` / `QWEN_TOKEN_PLAN` | `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` | `QWEN_TOKEN_PLAN_API_KEY` |
| `_ATLASCLOUD` / `ATLASCLOUD` | `https://api.atlascloud.ai/v1` | `ATLASCLOUD_API_KEY` |
| `_PENGUIN_GO` / `PENGUIN_GO` | `https://go.penguin.ooo/api/v1` | `PENGUIN_GO_API_KEY` |
| `_MODELSCOPE` / `MODELSCOPE` | `https://api-inference.modelscope.cn/v1` | `MODELSCOPE_API_KEY`，即账号的访问令牌 |
| `_VLLM_LOCAL` / `VLLM_LOCAL` | `http://127.0.0.1:8000/v1` | `VLLM_API_KEY`，仅在服务端启动时设置了 key 才需要 |

新增条目的价格约定：

- **网关费率。**网关的条目存的是网关实际收取的费率。TokenDance 存的是目录中的 `items` 费率，部分模型旁边还列有 `reference` 价格，`items` 费率低于它。
- **订阅费率。**OpenCode Go 的条目存的是每次请求从 Go（每月 $10）或 Go Plus（每月 $40）额度中扣除的每 token 费率。Qwen Token Plan 按 Credits 计费，不公布每 token 费率，所以它的条目存的是各模型在 DashScope 按量付费的标价。
- **阶梯价格**存的是第一档，其余各档写在每行的注释里：OpenCode Go 上 GPT 6 Luna 和 GPT 5.6 Luna 为输入 272K tokens 以内，Claude Haiku 5.5 为 100K 以内，Grok 4.7 为 200K 以内，Qwen 3.7 Plus 为 256K 以内；OpenAI 的 `gpt-5.4`、`gpt-5.4-pro` 和 `gpt-5.5-pro` 为 272K 以内；Google 的 `gemini-3.1-pro-preview` 为 200K 以内；TokenDance 为目录中按提示长度划分的最低一档。
- **DeepSeek 闲时价格。**OpenCode Go、Penguin Go 和 TokenDance 上分时计价的 DeepSeek 条目存的是闲时费率，与官方条目一致。工作日北京时间 09:00-12:00 和 14:00-18:00（UTC 01:00-04:00 和 06:00-10:00）为高峰时段，OpenCode Go 和 Penguin Go 在高峰时段价格翻倍；TokenDance 的高峰费率写在每行的注释里。
- **未经验证的分组。**OpenCode Go、Fireworks AI、DashScope、Qwen Token Plan、Atlas Cloud、Penguin Go、ModelScope 和 vLLM 的条目取自公开文档、价格页和 harness 目录，没有向它们发送过请求，每个分组的标题注释都写明了这一点。Fireworks AI 有六个模型只提供按需部署，这六条沿用 harness 目录的价格。ModelScope 不公布每 token 价格，所以它的条目不带价格；vLLM 条目对应本地服务端，价格为零。
- **促销**不记录。OpenCode Go 上的 Gemini 4 Argon 存的是标价，不是文档中截至 2026-11-30 的五折优惠价。

重新读取后价格有变的 OpenRouter 条目，单位为每百万 tokens 美元（输入 / 输出 / 缓存）：

| 模型 | 之前 | 之后 |
| --- | --- | --- |
| `deepseek/deepseek-v4.1-flash` | 0.028 / 0.08 / 0.0016 | 0.02 / 1.0 / 0.015 |
| `openai/gpt-5.6-sol` | 4.0 / 20.0 / 0.4 | 5.0 / 30.0 / 0.5，OpenAI 的标价；API 给出的是促销价 |
| `qwen/qwen3.8-27b` | 0.24 / 2.2 / 0.05 | 0.2 / 2.5 / 0.09 |
| `xiaomi/mimo-v2.5` | 0.14 / 0.28 / 0.0028 | 0.14 / 0.28 / 0.003 |
| `z-ai/glm-5.2` | 0.62 / 2.42 / 0.14 | 0.0341 / 7.0 / 0.033，即 API 给出的 Wafer 端点 |
