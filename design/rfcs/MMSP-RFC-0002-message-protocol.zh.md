# MMSP-RFC-0002 消息协议

- Feature Name: `message_protocol`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308), [#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318), [#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339), [#364](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/364)
- Kind: spec

[English](MMSP-RFC-0002-message-protocol.md)

## Abstract

MMSP 是所有模型共用的统一消息协议，仅用三种结构调用模型：输入 **`UniConfig`**、输入/输出 **`UniMessage`** 与输出 **`UniEvent`**，内容项类型在 `types.py` / `types.ts` 中封闭定义。每个内容项只带通用字段与精简 **`fidelity`**，且 Python（**`mmsp`**）与 TypeScript（**`@prismshadow/mmsp`**）两包是同一套协议。

## 1. Introduction

- **单一格式与双包一致**：调用方只对接一种消息格式与流语法，换模型只需改字符串。客户端私有键或双包差异都会破坏协议。审查修复了两处线上差异——OpenAI Python SDK 拒绝的关键字（[#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)）与 `openai-node` 未展开的 `extra_body`（[#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)）——现由共享 e2e 测试与唯一模型清单（[#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)）强制校验。
- **精简 `fidelity`（「转换只保留必要的部分，冗余字段不需要保留」）**：回传只需保证 API 接受且模型行为不变，无需复刻线上冗余字段。[#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) 引入 `fidelity` 保存严格上游要求的推理字段，[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) 将网关推理块精简为重建所需的三个键。
- **RFC 演进**：原载于 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)（MMSP-RFC-0002、MMSP-RFC-0009、MMSP-RFC-0008 部分与 MMSP-RFC-0012 后半）及 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)（MMSP-RFC-0002、MMSP-RFC-0004）。顺序规则现见 [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#6-顺序) §6。

| 日期 / PR | 变更与原因 |
| :--- | :--- |
| **2026-11-02** ([#308](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/308)) | **网页搜索与抓取（`webtool`）**：新增 `webtool`（`webdata`）与 `UniConfig.webtool_config`（`count`）（「在mmsp里面增加search和fetch的能力,实现方式和embedding类似」）。搜索只存摘要（「search的content显示摘要,不要用need content参数 jina要加no content」，§3.4）。 |
| **2026-11-06** ([#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)) | **`inline_data` 视频**：支持 Gemini Omni 视频生成（「支持一下google omni的视频生成能力」），复用 `inline_data`。URI 视频作为带 URI 的 `text` 返回（§3.4）。 |
| **2026-11-16** ([#330](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/330)) | **原始 PCM 完整帧**：支持语音边到边播（「音频输出是真正的音频流式吗?就是说我能不能每次只听到一部分」）。因 DeepSeek 分块会劈开 16 位采样（418 个片段中 74 个字节数为奇数），规定 `audio/l16` 片段必须由完整帧组成（§3.4）。 |
| **2026-11-17** ([#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)) | **工具调用 `arguments` 保留 JSON 字符串**：保留模型写出的 JSON 文本（「这个丢精度确实会有问题,在中间多做一次精度转换就会丢东西,UniMessage的工具参数还是保留字符串类型吧」），避免解析为 JS `number`（2^53）或 Python `float`（17 位有效数字）导致 `9007199254740993` 变成 `9007199254740992` 而破坏无损回放（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md)，§3.4）。 |
| **2026-11-21** ([#364](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/364)) | **CI 只测最新一代的最小模型**：每个官方端点只测一个文本模型，即厂商最新一代中最小的模型（`gpt-6-luna`、`claude-haiku-5-5`、`gemini-4-hydrogen`、`glm-5.3-flash`、`MiniMax-M3.1-Flash`、`deepseek-flash`、`kimi-k3.1-pro`），去掉更大档位的 `gpt-6.2-sol`、`gpt-6.1-terra` 与 `claude-sonnet-5-5`（「之前说官方端点模型测最新一代,但是gpt-sol gpt-terra gpt-luna不需要重复测试,只需要测试最新一代的小参数模型就行,但是不同模态的比如image,tts还是要测.比如测 gpt-6-luna claude-haiku-5-5 gemini-4-hydrogen glm5.3flash MiniMax-M3.1-Flash deepseek flash但是aws bedrock还是只能用sonnet 4.6」）。更大档位重复的是最小模型已经跑过的用例。其他模态保留各自的用例；Amazon Bedrock 保留 `global.anthropic.claude-sonnet-4-6`，这是它的 key 唯一能访问的模型（§7）。 |

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **内容项（item）**：消息或事件的 `content_items` 中的一项。
- **完整内容项**：类型以 `.done` 结尾的内容项。
- **片段**：类型以 `.delta` 结尾的内容项。
- **通用字段**：`types.py` / `types.ts` 定义的 `fidelity` 以外的字段（如 `text`、`thinking`、`arguments`、`tool_call_id`）。
- **Fidelity**：内容项的 `fidelity` 对象，承载通用字段之外的线上数据（§5）。
- **公开流**：定义见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#2-conventions-and-terminology) §2。
- **回传**：定义见 [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#2-conventions-and-terminology) §2。

## 3. 三种结构

### 3.1 `UniConfig`

- **可选键集合**：请求配置 `UniConfig` 由 `types.py` / `types.ts` 定义的可选键组成。
- **跨客户端同义**：同一个键在每个客户端上的含义必须相同。客户端发送、忽略或拒绝键的规则见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#6-请求参数) §6。

### 3.2 `UniMessage`

- **字段**：`role`（`user` 或 `assistant`）、`content_items`，及可选的 `usage_metadata`、`finish_reason`、`created_at`（纪元毫秒数）。
- **仅限完整内容项**：消息必须只包含 `.done` 完整内容项。基类用流中的完整内容项构建助手消息。调用方发来的其他内容项一律拒绝（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1），仅 0.5.0 前的旧历史类型会被转换（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。
- **顺序与元数据**：内容项顺序是消息的一部分（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#6-顺序) §6）。由流构建的助手消息带 `usage_metadata` 与 `finish_reason`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#44-助手消息) §4.4），手工构建的消息可以都不带。

### 3.3 `UniEvent`

- **字段**：`role`、`event_type`（`delta` 或 `stop`）、`content_items`、`usage_metadata`、`finish_reason` 与 `created_at`。
- **`delta` 事件**：公开流中必须恰好携带一个内容项（片段或完整内容项），且不带用量与结束原因。
- **`stop` 事件**：唯一的 `stop` 事件必须不带内容项，并同时带用量与结束原因（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#4-流的语法) §4）。客户端向基类产出的事件见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1。

### 3.4 内容项

- **封闭类型集合**：消息或事件不得携带下表之外的任何内容项类型（含服务商自有类型）。

| 类别 | 允许的类型与规则 |
| :--- | :--- |
| **完整内容项（`.done`）** | `text.done`、`image_url.done`、`inline_data.done`、`thinking.done`、`inline_thinking.done`、`tool_call.done`、`tool_result.done`、`embedding.done`、`webtool.done`。 |
| **片段（`.delta`）** | 除 `image_url` 与 `tool_result`（调用方写入、不入流）外，所有完整类型的 `.delta` 形式。 |
| **`inline_data` 媒体** | `mime_type` 指明图片、音频或视频。图片与视频整段到达（一片段一内容项），音频按多片段流式传出。URI 视频作为装着该 URI 的 `text` 返回。 |
| **原始 PCM（`audio/l16`）** | 带 `rate` 与 `channels`。每个片段必须由完整帧组成（每声道一个 16 位采样），以便到达即播。被分块劈开的帧头字节留到下一片段，结束时剩余字节作为最后片段发出。 |
| **`tool_call`（`arguments`）** | `arguments` 是字符串，保存模型写出的调用参数对象 JSON 文本（片段为文本各部分，完整项为拼接结果；[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#43-内容项) §4.3）。从服务商到调用方之间不解析再重写：以字符串接收参数的线路（Responses、Chat Completions）原样回放，仅在要求对象的线路（Messages 的 `input`、generateContent 的 `args`、Interactions 的 `arguments`）才解析；服务商以对象交付时（如 Gemini）保存该对象的 JSON。调用方运行工具时自行解析。 |
| **`webtool`（`webdata`）** | `WebData` 列表（含字符串 `title`、`content`、`url`）。**搜索**：必须按排名顺序存放，`content` 为网页摘要（绝非正文），未搜到时为空列表。**抓取**：必须只存所读单页，`content` 为 Markdown，`url` 为网页地址（端点未返回时取请求 URL）。 |

## 4. 服务商功能

- **准入方式**：服务商功能必须作为 `UniConfig` 键、内容项字段或内容项上的不透明 `fidelity`（§5）进入 MMSP，绝不作为单客户端私有键或字段。
- **RFC 变更约束**：修改任何结构（内容项类型/字段、`UniConfig` 键、`UniMessage` 或 `UniEvent` 字段）必须经由 RFC。

## 5. 消息携带什么

- **只存回传所需 `fidelity`**：消息只保存内容项通用字段及回传必需的 `fidelity`（如思考签名、加密推理、phase 或严格上游要求的推理字段名；[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#4-每种线上格式需要发回什么) §4）。
- **禁放内容**：`fidelity` 不得存放通用字段副本、服务商重生成或忽略的 id、回传不用的字段，或以线上原名整块保存单个/一组线上内容项。
- **统一键名**：各客户端 `fidelity` 必须使用同名键：`signature`、`encrypted_content`、`format`、`channel`、`phase`、`reasoning_field`、`reasoning_id`（仅在网关需要拿回加密推理块 id 时保存）。
- **剥离 `fidelity.item_id`**：仅用于流式内部标识内容项；`StreamItems` 必须在内容项发出前去掉它，使其不进入使用方、trace 或历史。
- **不透明透传与旧格式**：使用方应当将 `fidelity` 原样传回。早先版本记录的内容项内部形状兼容读取至 0.6.0（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。

## 6. 两个包中的同一套协议

- **接口与行为一致**：`mmsp` 与 `@prismshadow/mmsp` 必须拥有同名的客户端、映射、错误类和流（仅随语言大小写与惯用写法不同）。缺失或不一致的行为均为缺陷。
- **请求体一致**：两包发出的请求体必须相同。SDK 类型参数外的键在 OpenAI/Anthropic Python SDK 中走 `extra_body`，在 TypeScript SDK 中放请求体顶层。
- **单 PR 同步**：改动必须在同一 PR 中同时落到两包，并附成对测试。

## 7. Conformance

- **类型与基类转换**：`src_py/mmsp/types.py`、`src_ts/src/types.ts`，`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts` 抽象转换，以及只保留 `.done` 完整项的 `concat_uni_events_to_uni_message` / `concatUniEventsToUniMessage`。
- **Fidelity 归并与 `item_id` 剥离**：`src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`（每项一份 fidelity 并去掉 `item_id`）及拒绝残留 `item_id` 的 `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`。
- **成对单元测试（`src_py/tests/` 与 `src_ts/tests/`）**：`test_request_body.py` / `request-body.test.ts`（核对 Anthropic 各 SDK 版本线请求体）与 `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`（断言回传推理项无 id、无残缺密文）。
- **共享 e2e 契约（`src_py/tests/test_client.py` 与 `src_ts/tests/client.test.ts`）**：
  - 模型以 `.github/ci/models.json` 条目（含能力标记与密钥变量）接入。
  - 共享测试不按模型名分支，模型不设专属测试文件。
  - 共享测试失败默认视为客户端有错；更大范围的测试改动需项目负责人逐项批准。
- **唯一模型清单与路由**：`.github/ci/models.json`（配 `.github/ci/plan.py`、`.github/ci/README.md`、`.github/workflows/ci.yml`）列出实测的模型用例：
  - **每个厂商一个文本模型**：清单中每个官方客户端在厂商自有端点上必须只有一个文本模型，即厂商最新一代中最小的模型，不得收录同代更大的档位。
  - **其他模态各自保留**：厂商提供的其他每种模态（图像生成、语音合成、语音转写、视频生成、embedding、网页工具）必须保留各自的用例。
  - **Amazon Bedrock**：用例保留在 CI key 唯一能访问的那个 Claude 模型上。
  - **不受此规则约束**：兼容客户端、网关与 `slow` 用例。
  - **路由**：旧代与未实测的档位仍受支持并正常路由（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#3-客户端类型) §3），由 `test_client.py` / `client.test.ts` 路由用例校验。
