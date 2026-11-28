# MMSP-RFC-0013 输出按模态计价

- Feature Name: `modality_prices`
- Start Date: 2026-11-28
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: change
- Supersedes: [MMSP-RFC-0012](MMSP-RFC-0012-thinking-priced-as-output.zh.md)

[English](MMSP-RFC-0013-output-priced-by-modality.md)

## Abstract

注册表的每一行都有价格，其 **`ModelPricing`** 含**四个必填的每百万单价**，每个用量分桶一个（`cached_tokens`、`prompt_tokens`、`thoughts_tokens`、`response_tokens`），一轮调用的费用即**各计数乘以其单价之和**。上游按模态拆分输出的响应，**思考与正文文本计入 `thoughts_tokens`**，**图像、视频或音频 token 单独计入 `response_tokens`**；平台计费的每一项数量都计入用量，端点不报告时**按写明的规则推算**。

## 1. Introduction

- **一个回答有两种输出单价**：Google 为 `gemini-nano-banana-2.1` 标价输入 $1.50、文本输出与思考 $7.50、图像输出 $30（读取于 2026-11-19），为 `gemini-omni-1.2-flash` 标价文本输出 $9、视频输出 $12（读取于 2026-11-06）；OpenRouter 为 `google/gemini-nano-banana-2.1` 标价 `completion` $7.50、`image_output` $30（读取于 2026-11-19）。只有一个输出单价时（[MMSP-RFC-0012](MMSP-RFC-0012-thinking-priced-as-output.zh.md)），这些回答的思考与文本都按图像或视频单价计费。
- **负责人决定（2026-11-28），关于模态**：文本与思考同价，因而同桶，媒体输出单列另一桶（「对于输出价格不同模态不一样的模型，把推理和输出的文本都可以归并到推理 token，图片或者视频单列输出 token。MMSP 先读取上游的模态明细，再把同价的正文文本和推理合到 thoughts_tokens，把图片或视频单独放进 response_tokens。这样就可以表示模态的价格了。」）。
- **没有价格的行**：在 dev [fe517a8](https://github.com/Prism-Shadow/model-message-stream-protocol/commit/fe517a8)（2026-11-28）上，有十四行没有 `pricing`：Google 的 `gemini-3.1-flash-lite-image`、`gemini-3.1-flash-image`、`gemini-3.8-flash-tts`、`gemini-3.8-flash-lite-tts` 与 `gemini-embedding-2`；OpenRouter 的 `google/gemini-3.8-flash-tts` 与 `google/gemini-3.8-flash-lite-tts`，按 `/audio/speech` 不报告的音频输出 token 计费；SiliconFlow 的 `Qwen/Qwen3-Embedding-8B`；Vertex AI 的 `gemini-3.1-flash-image` 与 `gemini-3.8-flash-tts`；TokenDance 的 `minimax-m3`；以及 ModelScope 的 `deepseek-ai/DeepSeek-V4.1-Flash`、`Qwen/Qwen3.8-27B` 与 `Qwen/Qwen3.8-Flash-Next`。使用方无法为其中任何一行的调用计价。
- **负责人决定（2026-11-28），关于价格**：价格不得省略，embedding 按输入计价，模型索引列出四档价格（「而且 MMSP 的索引必须表示清楚模型价格，不能省略。比如 TTS、image、embedding 也要有价格，embedding 的放 input 里面。」「模型索引的价格列也应该写缓存、输入、推理、输出四档价格。」「MMSP 的义务目前也包括必须让下游知道模型的token量,以及快速获取费用,所以费用不能空.」）。
- **按张计费的价格曾按 token 存放**：TokenDance 的图像模型按张计费（`qwen-image-2.1-turbo` ¥0.1、`qwen-image-2.1-pro` ¥0.25，读取于 2026-11-28；`seedream-5.0-lite` ¥0.22，读取于 2026-11-04），OpenRouter 的 `bytedance-seed/seedream-5-5`（$0.02，读取于 2026-11-16）与 `bytedance-seed/seedream-5-0-flash`（$0.018，读取于 2026-11-04）也是如此。注册表把每张的价格摊到某一尺寸的 token 数上存放（TokenDance 的 2048x2048 为 16,384，OpenRouter 的 1K 约 4,096），于是更大的图像算出的费用是其固定单张价格的数倍。
- **为何取代 MMSP-RFC-0012**：MMSP-RFC-0012（[#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359)）及其实现（[#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360)）于 2026-11-20 去掉了 `thoughts_tokens` 单价。两者都未发布：0.5.12 仍带有该键。本 RFC 恢复该键，并让它承载媒体响应的文本，推翻了 MMSP-RFC-0012 唯一的规则，因此整篇取代它。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **用量分桶**：`stop` 事件 `usage_metadata` 中的四个计数：`cached_tokens`、`prompt_tokens`、`thoughts_tokens` 与 `response_tokens`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5）。
- **单价**：注册表某一行的 `pricing.<分桶>`，即该分桶每百万计数的价格，币种为调用 `list_supported_models` / `listSupportedModels` 时所要求的币种。
- **模态明细**：上游用量中按模态拆分输出 token 的部分，如 Interactions 的 `output_tokens_by_modality`、generateContent 的 `candidates_tokens_details`，以及 OpenAI 风格的 `output_tokens_details` / `completion_tokens_details` 中的 `image_tokens` / `audio_tokens`。
- **媒体输出 token**：模态明细报告的图像、视频与音频输出 token。
- **计费数量**：平台对一次请求收费的单位：token、图像张数、UTF-8 字节、字符、秒或请求次数。

## 3. 四档价格

- **四个必填键**：`ModelPricing`（`src_py/mmsp/registry.py`、`src_ts/src/registry.ts`）必须包含 `currency` 与四个必填单价：`cached_tokens`、`prompt_tokens`、`thoughts_tokens` 与 `response_tokens`。`list_supported_models` / `listSupportedModels` 在 USD 与 CNY 下都必须在每一行返回这四个键。
- **每一行都有价格**：注册表的每一行都必须带有含全部四个键的 `pricing`；不得新增没有价格的行。
- **各键存放什么**：

| 键 | 存放 | 平台未公布该单价时 |
| --- | --- | --- |
| `cached_tokens` | 缓存命中的输入单价。 | 取输入单价：缓存 token 按输入计费。 |
| `prompt_tokens` | 未命中缓存的输入单价。 | — |
| `thoughts_tokens` | 思考与文本输出的单价。 | 取输出单价。 |
| `response_tokens` | 输出单价；输出为图像、视频或音频的行，存该输出的单价（§5）。 | — |

- **Embedding**：embedding 行必须按 `prompt_tokens`（输入）计价，`thoughts_tokens` 与 `response_tokens` 必须为 `0`。
- **免费端点**：不收费的端点上的行（ModelScope API-Inference、自托管的 vLLM 服务）必须在每个键存 `0`，并必须在该行注释中写明。

## 4. 一轮调用的费用

一轮调用的费用（币种同单价）为：

```text
cost = ( cached_tokens   × pricing.cached_tokens
       + prompt_tokens   × pricing.prompt_tokens
       + thoughts_tokens × pricing.thoughts_tokens
       + response_tokens × pricing.response_tokens ) / 1,000,000
```

- **空计数**：为 `None` / `null` 的计数必须按 `0` 计。
- **处处同一公式**：本仓库内的每个使用方都必须如此表述与计算费用，不得按另一分桶的单价为某一分桶计价：状态探测（`.github/status/probe.py`）、`/models.json` 的 `pricing` 说明（`site/src/pages/models.json.ts`）、用量文档（`site/src/docs/usage.en.md` / `usage.zh.md`）与各 Skill（`skills/mmsp-python/`、`skills/mmsp-typescript/`、`.agents/skills/mmsp-dev/`）。

## 5. 按模态划分的输出

- **逐个响应拆分**：响应的模态明细报告了媒体输出 token 时，客户端必须把 `response_tokens` 计为这些媒体输出 token 本身，把 `thoughts_tokens` 计为思考 token 加文本输出 token。
- **其余不变**：没有模态明细、或模态明细未报告媒体输出 token 的响应，必须照旧计数：`thoughts_tokens` = 思考 token，`response_tokens` = 文本。
- **读取上游**：拆分必须依据上游为该响应报告的模态明细，而不依据模型 id。
- **媒体行的单价**：输出为图像、视频或音频的行，必须在 `thoughts_tokens` 存厂商所列的文本输出单价（厂商未列时取其输出单价），在 `response_tokens` 存媒体输出单价：

| 行 | 客户端 | `thoughts_tokens` | `response_tokens` |
| --- | --- | --- | --- |
| `gemini-nano-banana-2.1` | `google-official` | $7.50（文本输出与思考） | $30（图像输出） |
| `google/gemini-nano-banana-2.1` | `openai-image`（OpenRouter） | $7.50（`completion`） | $30（`image_output`） |
| `gemini-omni-1.2-flash` | `google-official` | $9（文本输出） | $12（视频输出） |

## 6. 计入每一项计费数量

- **计费的数量不为空**：客户端必须计入其所在行的平台计费的每一项数量，承载它的分桶不得为 `None` / `null`。不承载任何计费数量的分桶（如没有提示缓存的端点上的 `cached_tokens`），在端点不报告时保持 `None` / `null`。
- **每个分桶一个单位**：计数的单位必须与其单价的单位一致，使 §4 算出账单。
- **推算的计数**：端点不报告某项计费数量的计数时，客户端必须按下表的规则推算（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#32-全部走流式) §3.2）：

| 计费方式 | 适用范围 | 计数 | 存放的单价 |
| --- | --- | --- | --- |
| **按张** | TokenDance 上的 `openai-image`（其 `openai:image-generations` 协议上的每个模型），以及 OpenRouter 的 `bytedance-seed/seedream-*` | `response_tokens` = 每生成一张图像记 1,000，无论网关报告多少 token；端点不对输入计费时 `prompt_tokens` = `0`。 | `response_tokens` 存单张价格 × 1,000（¥0.1 → 每百万 ¥100，¥0.25 → ¥250，¥0.22 → ¥220，$0.02 → $20）。 |
| **Gemini TTS 的音频 token** | `openai-speech` 经其 `gemini` 插件（`gemini-.*tts`） | `response_tokens` = ⌈音频秒数 × 25⌉，即 Google 公布的每秒 25 个音频 token（`llmsdk_docs/gemini4/docs/pricing.md`），秒数由 PCM 字节长度与其 MIME 类型的 `rate`、`channels` 算出（16 位采样）；`prompt_tokens` 仍为输入的 UTF-8 字节数。 | `response_tokens` 存每 token 的音频输出单价；`prompt_tokens` 存每 token 的文本输入单价。 |
| **UTF-8 字节** | `openai-speech` | `prompt_tokens` = 输入的 UTF-8 字节数。 | 每百万字节的价格。 |
| **计费字符** | `deepseek-speech` | `prompt_tokens` = DeepSeek 计费的字符数（汉字记 2，其他记 1）。 | 每百万字符的价格。 |
| **秒数** | `openai-transcription`、`deepseek-transcription` | `prompt_tokens` = 音频秒数，向上取整到整秒。 | 每百万秒的价格。 |
| **按次** | `deepseek-webtool` | `prompt_tokens` = 端点计费的每次请求记 1,000，不计费的请求记 `0`。 | 1,000 次计费请求的价格。 |

## 7. 模型索引

- **四列价格**：模型索引（`/models/`，`site/src/components/ModelCatalog.astro`）必须按缓存 / 输入 / 推理 / 输出（Cached / Input / Thinking / Output）的顺序列出每一行的四档价格，即 `cached_tokens`、`prompt_tokens`、`thoughts_tokens`、`response_tokens`。
- **`/models.json`**：必须在每一行带有全部四个键，其 `pricing` 说明必须写明 §4 的公式。

## 8. Drawbacks

- **媒体模型的纯文本回答**：拆分逐个响应决定，因此 `gemini-nano-banana-2.1` 只返回文本的回答，其文本仍在 `response_tokens` 中，按每百万 $30 而非 $7.50 计费。此处只记录，不修正。
- **媒体响应的 `thoughts_tokens` 含文本**：把 `thoughts_tokens` 读作纯思考的调用方在这些响应上会读多，把 `response_tokens` 读作完整回答的调用方会读少；一轮调用的全部输出仍是 `thoughts_tokens + response_tokens`。
- **按张计数不是 token**：按张计费的响应无论尺寸都记 1,000，由它算出的 token 吞吐（状态探测的每秒 token 数）衡量的是图像张数，而非网关的 token。
- **语音是估算的**：`openai-speech` 上 Gemini TTS 的计数由音频时长算出，而非读自账单；其输入按 UTF-8 字节计数、按 token 计价，算出的输入费用高于账单。
- **输入仍只有一个单价**：参考图属于输入，按 `prompt_tokens` 计价。厂商为图像输入另列单价时，算出的费用低于账单：OpenAI 为 `gpt-image-2.6-sunburst` 标价图像输入每百万 $8、文本输入 $5（`llmsdk_docs/openai_images/`）。

## 9. Rationale and Alternatives

- **复用 `thoughts_tokens`，而非新增图像单价键**：第五个单价需要第五个用量计数，每个客户端与使用方都得处理它，却只有少数行设置它。为媒体另行定价的厂商，都按同一单价列出思考与文本输出，合并二者不损失任何信息，`ModelPricing` 也仍与用量分桶一一对应。
- **逐个响应拆分，而非按模型拆分**：按模型触发能让媒体模型的纯文本回答按文本单价计费，但它要求每个客户端的用量代码都有一份媒体模型列表，并读取模型 id（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#61-明确匹配) §6.1），列表漏掉的模型就会算错。模态明细随响应到达，只要上游报告它，拆分就对每个模型都有效，新模型也不例外。
- **估算 Gemini TTS，而非省略其价格**：省略价格会留下一行无法计价的计费模型，这是 §3 所禁止的。Google 用同一换算率表述其 TTS 价格（每秒 25 个 token 使每百万 $9 等于每 10 秒音频 $0.00225）。
- **每张记 1,000，而非采用网关的 token**：网关的 token 随图像尺寸增长，按张计费的账单却不变。每张记 1,000 延续了 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#32-全部走流式) §3.2 的按次规则（[#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)），使每百万的价格读作 1,000 张图像的价格。
- **为 `cached_tokens` 与 `thoughts_tokens` 取默认值，而非省略**：每个使用方都用四个单价计算，无需各自兜底；默认值就是平台未列其他单价时实际收取的价格。
- **原地修改 MMSP-RFC-0012**：会让一篇 RFC 同时承载一条规则及其推翻；整篇替换一项决定须新建 RFC 并取代旧篇（[design/README.zh.md](../README.zh.md)）。
