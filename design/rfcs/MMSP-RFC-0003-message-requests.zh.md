# MMSP-RFC-0003 消息请求

- Feature Name: `message_requests`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313), [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316), [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318), [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330), [#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)
- Kind: spec

[English](MMSP-RFC-0003-message-requests.md)

## Abstract

消息请求是调用模型的唯一方式：由 **`streaming_response`** 或 **`streaming_response_stateful`** 产出一条 `UniEvent` 异步流，遵循由基类统一收尾的单一语法——先是若干携带单个内容项的 **`delta`** 事件，最后是恰好一个携带用量与结束原因的 **`stop`** 事件。每个 **`ThinkingLevel`** 在所有客户端上均可使用，其余每个 **`UniConfig`** 值要么按明确映射发送，要么在请求发出前被拒绝。

## 1. Introduction

- **异步流与基类统一收尾**：宿主绝不能因服务商阻塞事件循环，调用方也绝不能把截断的回答当成完整回答。在第二版流式协议（[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)）前，各客户端自行收尾内容项（[#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218)、[#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)）；2026-10-22 CI 中一条 GLM-5.3-Flash 流在末块（同时携带结束原因和用量）到达前中断（[run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)），[#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272) 据此规定缺失 `stop` 时抛出异常以便调用方重试。
- **全思考等级支持与精确参数匹配**：调用方只需设置一次 `ThinkingLevel`，切换模型只换名字（[#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) 限制 Gemini 级别，[#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) 按厂商映射 `max`，[#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) 修复 Claude Opus 5 在 `none` 下仍思考的问题，[#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) 在 Kimi K3 系列上用 `none` 关闭思考）。模糊匹配会把一代模型的参数发给另一代（[#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) 依据双语转换逻辑重写了配置页）。
- **设计初衷与早期编号**：落实项目负责人「支持全部思考等级」「模型请求参数不模糊匹配」「要求异步和流式，任何思考等级不能报错，请求参数尽量精确」的要求（在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中编号为 MMSP-RFC-0003/0004/0006/0010，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中编号为 MMSP-RFC-0003/0005/0010/0011）。

| 日期 / PR | 变更内容与原因 |
| --- | --- |
| 2026-11-02 ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)) | **网页搜索与抓取（`webtool`）**：DeepSeek Search/Fetch 与 Jina Search/Reader 均以单个 JSON 作答（Jina 事件流每次重发整页，故读取 JSON）；搜索只取摘要（不用 `need content`，Jina 加 `no content`）。更新 §2（`webdata`）、§3.2、§6.1（`-search`、`-fetch`）与 §6.3。 |
| 2026-11-02 ([#313](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/313)) | **GPT-6.1 Terra 与 GPT-6 修复**：Terra 原生支持 `none` effort（不同于 GPT-6 Astra / GPT-6.1 Sol）；修复 `tool_choice` 列表缺失 `type`（OpenAI/OpenRouter 400 错误）；将超 30,000 patch 图片的 `detail: "high"` 从 GPT-5.6 扩展至 GPT-6；将 `enhance` 映射为 GPT-5.6+ 的 12 小时缓存（GPT-5.5 拒绝）。更新 §6.1、§6.3 与 §6.4。 |
| 2026-11-04 ([#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)) | **OpenAI 媒体客户端（`openai-image`、`openai-speech`、`openai-transcription`）**：支持 OpenAI、OpenRouter 与 TokenDance。图像与转写读取单个 JSON，语音流式产出音频字节（首包约 0.7 秒）。映射 `image_config` 至 1K/2K `size`、`tts_config` 至 `voice`，并按模态计入用量（图像记 token、Fish Audio 语音记 UTF-8 字节、转写记秒数）。更新 §3.2、§5、§6.3 与 §6.4。 |
| 2026-11-06 ([#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)) | **Gemini Omni 视频生成**：Gemini Omni 1.2 Flash 经 Interactions API 在单个流式增量中返回带音轨的 MP4（或按 URI 返回 URI，不含多轮视频编辑），保留 Google 默认设置（16:9、720p、10 秒）。Omni 仅接受 `low`/`high` 思考等级，且视频 token 计入 `max_output_tokens`。更新 §6.1（`gemini-omni`）、§6.2（不发 `max_tokens`）与 §6.3。 |
| 2026-11-11 ([#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)) | **兼容客户端插件化与 Mistral 推理**：将特定端点/厂商的兼容客户端处理移入插件（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#9-插件) §9），含 [#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322)、[#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323) 的 Mistral `reasoning_effort`（按需开启推理、无 `medium`、由模型列表判定是否支持推理）。更新 §6.1 与 §6.3。 |
| 2026-11-16 ([#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)) | **`video_config`、DeepSeek 语音合成/识别与 Gemini 4 Hydrogen**：新增 `video_config`（`aspect_ratio`、`resolution`、`duration`，`4K` 写作 `4k`），并将 `image_config.image_size` 统一改名为 `resolution`；新增流式原始 PCM 的 `deepseek-speech`（首包约 1 秒）与单 JSON 的 `deepseek-transcription`（仅收 16 位 PCM WAV 或 Ogg Opus）；新增 Gemini 4 Hydrogen 等级（接受 `xhigh`，拒绝 `minimal`/`max`）。更新 §3.2、§6.2、§6.3 与 §6.4。 |
| 2026-11-17 ([#336](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/336)) | **按次计费记为 1,000 token**：按次收费的请求每次记 `1,000` 个 token（「按次收费的都算1次为1000token吧,这样价格就正常一些」），使每千次 ¥5 的 DeepSeek Search/Fetch 定价为每百万 token ¥5（而非 ¥5,000），单次请求花费不变（§3.2）。 |
| 2026-11-17 ([#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)) | **工具调用 `arguments` 保留 JSON 文本**：测试发现 `9007199254740993` 在解析后变为 `9007199254740992`，故规定工具调用参数保留模型写出的文本（「UniMessage的工具参数还是保留字符串类型吧」）；`StreamItems` 与请求前校验均验证其能解析为 JSON 对象并保留原文本（§3.3、§4.3）。 |

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **客户端流**：客户端的 `_streaming_response_internal` / `_streamingResponseInternal` 产出的事件。
- **公开流**：基类产出给调用方的事件。
- **片段**与**完整内容项**：定义见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#2-conventions-and-terminology) §2。
- **增长字段**：某类内容项的片段不断延长的那一个字段（`text`、`thinking`、`arguments`、`data`、`embedding`、`webdata`）。
- **官方客户端**与**兼容客户端**：定义见 [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#2-conventions-and-terminology) §2。
- **代**：一个厂商接受同一种请求的那些模型（`"4-6"`、`"gpt-6"`）。

## 3. 调用

### 3.1 两个入口

调用模型必须只经由 `streaming_response` 与 `streaming_response_stateful`（TypeScript 中为 `streamingResponse` 与 `streamingResponseStateful`），二者均为产出 `UniEvent` 的异步生成器。没有同步调用或一次返回完整响应的调用；客户端向端点发出的另一种请求只有 `list_models`（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#5-列出模型) §5）。

### 3.2 全部走流式

服务商提供流式端点时，客户端必须读取流式端点。非对话端点的请求、输出与最终 `stop` 事件（`finish_reason: "stop"`，用量为各次请求之和）规则如下：

| 端点类型 | 请求与流式方式 | 输出内容项与格式 | 用量计费（`stop` usage） |
| --- | --- | --- | --- |
| **Embedding**（`openai-embedding` 等） | 非流式 JSON；`openai-embedding` 按向量的 `index` 与输入配对。 | 每个向量作为一个 `embedding` 内容项流出。 | `prompt_tokens` = 端点报告的输入计数。 |
| **网页工具**（`-search`、`-fetch`） | 每条消息发一次 JSON 请求（各文本内容项拼接为查询或 URL）；Jina 重发整页的事件流不算流式端点，必须改为读取 JSON。搜索必须只请求摘要，不得请求网页正文。 | 每个答案一到达即作为一个 `webtool` 内容项流出（含无结果的搜索）。 | `prompt_tokens` = 端点报告的 token 之和；按次计费时每次请求记 `1,000`（使每百万 token 价格等于 1,000 次请求的价格）。 |
| **图像生成**（`openai-image`） | 每条消息发一次 JSON 请求（各文本内容项拼接为提示词）；不得请求流式，也不得发送 `response_format`。 | 从 `b64_json` 读取，否则不带凭据从 `url` 下载（[MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md#7-答案中的链接) §7）。MIME 依次取 `media_type`、`image/<output_format>` 或字节特征。 | `prompt_tokens` = `input_tokens` 或 `prompt_tokens`；`response_tokens` = `output_tokens` 或 `completion_tokens`（未报告保持 `None`）。 |
| **语音合成（TTS）**（`openai-speech`、`deepseek-speech`） | 每条消息发一次流式请求（各文本内容项拼接为输入）。`openai-speech` 不发 `response_format`；`deepseek-speech` 请求 `format: "pcm"` 且不发 `filter_markdown`。 | 每块到达时必须作为该消息唯一语音项的 `inline_data` 片段产出。无头 `audio/pcm` 按完整帧（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#34-内容项) §3.4）以 `audio/l16; rate=<rate>; channels=<channels>` 流出；其余格式保留 `content-type`。 | `prompt_tokens` = 输入 UTF-8 字节数（`openai-speech`）或计费字符数（`deepseek-speech`：汉字记 2，其他记 1）；`response_tokens` = `0`。 |
| **语音转写（ASR）**（`openai-transcription`、`deepseek-transcription`） | 每条消息发一次 JSON 请求（取唯一音频 `inline_data` 项）。`openai-transcription` 发送 multipart 表单（带扩展名的 `file` + `model`，不发 `prompt`）；`deepseek-transcription` 只传 `file`（WAV/Ogg Opus 原样发送，无头 `audio/l16` 或 `audio/pcm` 按 MIME 采样率与声道封装为 WAV）。 | 转写文字作为一个 `text` 内容项流出。 | `prompt_tokens` = `usage.seconds` 或 `duration_ms` 换算的秒数（向上取整到整秒）；`response_tokens` = `0`。 |

- **媒体端点的输入校验**：图像或语音消息含有非文本项时抛出 `UnsupportedContentError`；转写消息含有非音频项时抛出 `UnsupportedContentError`，含有第二个音频项或无头 PCM 的 MIME 未写明采样率时抛出 `InvalidMessageError`。

### 3.3 请求之前

在发送任何内容之前，`streaming_response` 依次执行：
- **补齐时间戳**：为每条缺少 `created_at` 的消息打上时间戳（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#63-created_at) §6.3）。
- **转换旧类型**：转换旧的内容项类型（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。
- **校验可发送内容与工具参数**：空消息、客户端消息转换无法发送的消息（如只有思考），或含有 `arguments` 不是对象 JSON 文本的工具调用的消息，必须在请求发出前抛出带 `message_index` 的 `InvalidMessageError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1）。

## 4. 流的语法

### 4.1 客户端产出什么

- **只产出 delta**：服务商流中每来一个事件，客户端流必须产出一个 `UniEvent`——只产出 delta，从不产出完整内容项。`stop` 事件携带线上报告的用量与结束原因（可分多次携带）；`delta` 事件两者都不携带。
- **空事件、收尾事件与未知事件**：不含通用内容的线上事件产出空 delta；表示内容项结束的事件不为内容项收尾，只产出新增字段（如推理项的 `fidelity`）。不认识的事件必须跳过（设置 `MMSP_DEBUG` 时改为抛出 `UnknownEventError`）。
- **线上已完成的项**：从线上直接读取完整内容项的客户端（如 MiniMax 工具调用）将其作为单个片段流出，不得再同时流出其 delta。

### 4.2 基类做什么

- **经 `StreamItems` 收尾内容项**：基类把每个 delta 交给 `StreamItems`（`stream_items.py` / `streamItems.ts`），在下一个内容项开始或客户端流结束时以完整内容项收尾。
- **合并 `stop` 元数据**：将客户端各 `stop` 事件的用量和结束原因逐字段合并进唯一的公开 `stop`（后到的计数替换先到的，`0` 保持 `0`，未报告的计数为 `None`，不要求计数是数字）。

### 4.3 内容项

- **连续且不交错**：每个内容项以连续片段流出，紧跟其唯一的完整内容项；内容项之间不得交错。
- **由片段构建完整项**：`StreamItems` 拼接增长字段，工具调用的 `arguments` 在检查能解析为 JSON 对象后保留拼接后的 JSON 文本本身（拼接为空时为 `{}`；[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#34-内容项) §3.4），其余字段取自首个片段，并复制 `fidelity`（同一内容项最多一个片段携带 `fidelity`，完整内容项重复携带它）。

### 4.4 助手消息

按顺序排列的完整内容项加上 `stop` 事件的 `usage_metadata` 与 `finish_reason` 构成助手消息，由 `concat_uni_events_to_uni_message`、有状态历史与 tracer 复制到助手消息上。

## 5. 流怎样结束

- **正常或异常二选一**：一条流必须要么以 `stop` 事件结束，要么以异常结束，绝不兼有。
- **`IncompleteStreamError`**：`stop` 事件必须携带 `usage_metadata` 对象和有值的 `finish_reason`。若服务商流在缺失其一时结束，基类在原本 `stop` 的位置抛出 `IncompleteStreamError`（指明客户端与缺失字段，并附带已到达的用量或结束原因以便统计 token），使不完整的回合不会进入历史或 trace。
- **`EmptyResponseError`**：没有任何内容项或只有思考项的响应，在原本 `stop` 的位置抛出 `EmptyResponseError`（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#5-别处产生的思考) §5）。
- **`StreamProtocolError`**：客户端产出违反语法的内容（完整内容项、带用量的 delta、同一内容项上两份不同的 fidelity、首个片段缺失名字或调用 id 的工具调用）时，在任何模式下都抛出 `StreamProtocolError`。这是客户端缺陷，不得修补（`IncompleteStreamError` 与 `EmptyResponseError` 不属于协议缺陷）。
- **`ProviderStreamError`、SDK 异常与中止**：已打开的流中 SDK 抛出的异常原样传出（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）；Interactions API 的 `error` 事件，以及下载生成图像 `url` 遇到 HTTP 错误时，抛出 `ProviderStreamError`（以 HTTP 状态码作为 `code`）。中止按 [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md) 结束流。

## 6. 请求参数

### 6.1 明确匹配

- **官方客户端**：必须通过具名元组或直白条件中的明确版本/模态标记决定发送内容（先匹配者生效）：如版本标记 `"4-6"`、`"gpt-6"`（排除 `"gpt-6-luna"` 与 `"gpt-6.1-terra"`）、`"gpt-5.6"`、`"k2."`、`"m3.1"`、`"glm-5.3"`，以及档位/模态标记 `-pro`、`-image`、`tts`、`gemini-omni`、`embedding`、`-search`、`-fetch`。`"claude"`、`"gpt"` 等仅含系列名的子串不得决定任何事；新一代模型只可新增一行或条件，绝不放宽匹配。
- **兼容客户端**：仅在发送内容因模型而异时按明确标记读取模型 id，且转换方法只读自身协议标记（`deepseek-webtool` 读 `-search`/`-fetch`；仅服务 Google 模型的 `google-genai` 同 `google-official`）。多厂商协议上的特定厂商规则写成按明确模式匹配的插件（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#9-插件) §9）：`openai-responses` 的 `gpt` 插件在 Luna 与 GPT-6.1 Terra 以外的 GPT-6 上把 `none` 转为 `low`；`openai-chat` 与 `openai-responses` 的 `gpt` 插件对 GPT-5.6 和 GPT-6 请求 `detail: "high"`。vLLM 适配器从表中选取聊天模板思考开关，未命中时退回 Qwen3 开关。
- **客户端路由**：模型 id 由哪个客户端处理见 [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md)。

### 6.2 没有对应设置的值

- **不支持的值与忽略的键**：客户端无法为目标模型发送的 `UniConfig` 值，必须在请求发出前抛出指明客户端与参数的 `UnsupportedParameterError`；客户端用不上的键直接忽略。`thinking_level` 是唯一例外（§6.3）。
- **`video_config`**：仅发给 Gemini Omni；对其他模型 `google-official` 抛出异常，无视频模型的客户端忽略它。
- **Gemini Omni 上的 `max_tokens`**：不发送给 Gemini Omni，因为视频本身的 token 计入 Google 的 `max_output_tokens`（默认视频为 57,920），按文本设定的上限会在视频生成后才失败。

### 6.3 思考等级

客户端不得拒绝任何 `ThinkingLevel`：无论什么模型，都没有客户端为 `thinking_level` 抛出 `UnsupportedParameterError`。

| 客户端类别 | 目标模型 | `thinking_level` 映射规则 |
| --- | --- | --- |
| **官方客户端** | 支持思考的模型 | 按固定代际表静默映射：模型支持该级别时原样使用；不支持时映射到模型接受的级别（**Claude 4.6**：`xhigh` -> `high`；**Gemini**：`xhigh`/`max` -> `high`，但 **Gemini 4 Hydrogen** 原样保留 `xhigh` 并将 `max` -> `xhigh`，仅接受 `low`/`high` 的 **Gemini Omni** 将 `medium` -> `high`）。对于 `none`：有原生关闭开关时使用开关（**Claude Sonnet 5** 为 `disabled`；**GPT-6 Luna**、**GPT-6.1 Terra** 与 **Kimi K3** 系列为 `none`），无关闭开关时用最少思考（**Claude Opus 5.5** 最低 effort、**Claude Sonnet 5.5** 的 `between_tools`、**Gemini** 的 `minimal` 或 `low`）。 |
| **所有客户端** | 不思考的模型 | 在 embedding 模型、网页工具及 `openai-image`、`openai-speech`、`openai-transcription`、`deepseek-speech`、`deepseek-transcription` 上直接忽略。 |
| **兼容客户端** | 视端点而定（端点可以拒绝） | **`ant-messages`**：`none` -> `disabled`。**`openai-responses`**：作为 effort 发送（Luna 与 GPT-6.1 Terra 以外的 GPT-6 上 `none` -> `low`）。**`openai-chat`**：默认不发送；在 Mistral 端点上由 `mistral` 插件对模型列表标明会推理的模型发送 `reasoning_effort`（`low` -> `low`，`medium`/`high` -> `high`，`xhigh`/`max` 原样，`none` 不发，非推理模型不发）；vLLM 适配器只发聊天模板思考开关。**`mmsp`**：原样转发给服务端。 |

### 6.4 有另一种形式的值

| 参数 | 客户端 / 适用范围 | 线上形式与规则 |
| --- | --- | --- |
| **`tool_choice`（工具名列表）** | `openai-chat`、`openai-official`、`openai-responses`、`ant-messages` | 映射为 `allowed_tools`，在 `openai-chat` 上带 `mode: "auto"`，在 `openai-official` 与 `openai-responses` 上带 `mode: "required"`；单元素列表在 `ant-messages` 上为 `{type: "tool", name}`。 |
| **未设置的 `max_tokens`** | Anthropic 客户端 | 默认设为 `64000`。 |
| **`prompt_caching: "enhance"`** | `openai-official`（GPT-5.6 及之后） | 映射为 `prompt_cache_options: {ttl: "12h"}`。 |
| **`tts_config`** | `openai-speech`、`deepseek-speech` | 取唯一一项的 `voice`，在 `openai-speech` 上发为 `voice`，在 `deepseek-speech` 上发为 `voice_id`；未设置时不发送（用默认音色）；多于一项抛出 `UnsupportedParameterError`。 |
| **`image_config`** | Google 客户端、`openai-image` | `resolution` 在两个 Google 客户端上映射为 Gemini 的 `image_size`。在 `openai-image` 上按下表映射为 `size`（仅 `aspect_ratio` 时取 `1K`；仅 `resolution` 时取 `1:1`；未设置时不发 `size`）。表中尺寸双边均为 16 的倍数、像素数 655,360–8,294,400、最长边 <= 3840、长宽比 <= 3:1。 |
| **`video_config`** | Gemini Omni（`google-official`、`google-genai`） | 映射为 `response_format` 中的 `video` 条目：`aspect_ratio` 与 `resolution` 原样发送（唯 `4K` 写作 `4k`），`duration`（秒）写作 `"<n>s"`。只发送给出的字段；未设置时不发 `response_format`（沿用 Google 默认值 16:9、720p、10 秒）。Google 不接受的值（如 `1:1` 或 2 秒）由 Google 自身错误拒绝。 |

| `aspect_ratio` | `1K` | `2K` |
| --- | --- | --- |
| `1:1` | `1024x1024` | `2048x2048` |
| `2:3` | `848x1264` | `1696x2528` |
| `3:2` | `1264x848` | `2528x1696` |
| `3:4` | `896x1200` | `1792x2400` |
| `4:3` | `1200x896` | `2400x1792` |
| `9:16` | `768x1376` | `1536x2752` |
| `16:9` | `1376x768` | `2752x1536` |
| `21:9` | `1584x672` | `3168x1344` |

### 6.5 配置页

[`site/src/docs/configuration.zh.md`](../../site/src/docs/configuration.zh.md) 写明每个客户端对每个键发送、忽略还是拒绝什么，思考等级的每一行在两个包的映射测试中均有对应用例。表中任何一行必须与修改它的代码在同一个 PR 中更新。

## 7. `mmsp` 客户端

`mmsp` 客户端实现了自己的 `streaming_response`：
- **请求直传**：打上 `created_at` 后把消息与配置原样发给服务端，不转换旧内容项类型，也不检查消息是否为空（§3.3 和 §6 的其余工作由服务端客户端完成）。
- **流与错误转发**：原样转发服务端的公开流（含 `stop`）。若服务端流在 `stop` 前断开，则本地抛出 `IncompleteStreamError`；服务端抛出的 `IncompleteStreamError` 则以带该 `error_type` 及各字段的 `UpstreamError` 形式到达（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）。

## 8. Conformance

- **基础流与错误实现**：`src_py/mmsp/base_client.py`、`src_py/mmsp/stream_items.py`、`src_ts/src/baseClient.ts`、`src_ts/src/streamItems.ts`；`errors.py` / `errors.ts` 中的 `IncompleteStreamError` 及其在 `wire.py` / `wire.ts` 中的分支。
- **共享 e2e 语法检查**：`src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，在每条 e2e 流上验证每个完整内容项等于其各片段的拼接。
- **流与服务端单元测试**：`test_stream_protocol.py`、`test_stream_items.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_message_order.py`（空消息与仅含思考的消息）及其 Jest 镜像测试；`test_mmsp_server.py` / `mmsp-server.test.ts`。
- **配置转换与测试**：`src_py/mmsp/<client>/client.py` 与 `src_ts/src/<client>/client.ts` 中的 `transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`；固定各代模型映射的 `test_thinking_level_mapping.py` / `thinking-level-mapping.test.ts`；`test_request_body.py` / `request-body.test.ts`。
- **文档与评审门禁**：`site/src/docs/configuration.en.md` / `configuration.zh.md`、`UnsupportedParameterError` 的文档字符串，以及要求在编写非显然映射前先询问的 `.agents/skills/mmsp-dev/SKILL.md`。
