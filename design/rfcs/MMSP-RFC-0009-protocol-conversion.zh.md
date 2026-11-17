# MMSP-RFC-0009 协议转换

- Feature Name: `protocol_conversion`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326), [#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)
- Kind: spec

[English](MMSP-RFC-0009-protocol-conversion.md)

## Abstract

所有客户端均以 **MMSP** 为**中间表示（IR）**：请求从 MMSP 转为线上格式，线上事件转回 MMSP，跨服务商对话仅经由 MMSP 流转。本文规定**三个转换方法**、内容项**顺序**、**单一输入形状**（含旧格式兼容）、**基类**公开流组装及**客户端插件**，全部以直观代码编写，不设额外抽象层。

## 1. Introduction

- **MMSP 作为 IR**（「写一下把 MMSP 作为 IR 的转换逻辑，实现代码减少抽象，尽量直观」）：客户端只需实现往返两次转换，跨客户端续接对话无需知晓彼此的线上形状。
- **减少抽象、对照 diff 审阅**（「转换代码尽量减少抽象，保持易懂」「base client也减少一些抽象,尽量让代码容易看懂」，[#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297)）：新客户端对照参考客户端读 diff；多余辅助层或双形状垫片会掩盖服务商怪癖并导致双语言实现走样。
- **历史修复与草案演进**：
  - **顺序故障**（[#185](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/185)）：Responses 转换曾把文本追加在工具调用之后，触发 DeepSeek `"No tool output found for tool call"`。
  - **0.5.5 网关推理块**（[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287)）：将 0.5.5 整块推理块改为共用 fidelity 键，并保留旧形状读取。
  - **早期编号**：曾于 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 写作 MMSP-RFC-0012、[#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 写作 MMSP-RFC-0013（顺序规则原属 MMSP-RFC-0002）。
- **2026-11-11 — 插件解耦**（[#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322)、[#323](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/323)、[#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)）：审阅 `openai-chat` 对 Mistral 思考块与 `reasoning_effort` 的改动后，项目负责人要求将端点/模型特例抽离为按模型 id 或 base URL 匹配的内置插件（「每个client都可以有n个plugin,每个plugin可以用模型id或者baseurl来匹配和启用」），并将 `openai-chat` / `ant-messages` 的 OpenRouter 用量修正及 `openai-chat` / `openai-responses` 的 GPT-5.6、GPT-6 处理迁入插件（§2、§9）。
- **2026-11-17 — 旧版对象 `arguments` 兼容**（[#339](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/339)）：将工具调用 `arguments` 改为保留模型写出的 JSON 文本后（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#34-内容项) §3.4，「这个丢精度确实会有问题,在中间多做一次精度转换就会丢东西,UniMessage的工具参数还是保留字符串类型吧」），将 0.5.8 及更早版本记录的对象 `arguments` 加入 §7 的旧形状转换。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **中间表示**：`UniConfig`、`UniMessage` 与 `UniEvent` 及其内容项（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#3-三种结构) §3）。
- **线上格式**：服务商 SDK 类型定义的请求与事件形状。
- **服务商客户端**：除连接 MMSP 服务端的 `mmsp` 之外的所有客户端。
- **转换方法**：§4 的三个转换方法之一。
- **参考客户端**：同协议新客户端对照读 diff 的基准（Responses 为 `openai-official`，Chat Completions 为 `openai-chat`）。
- **适配器**：继承协议客户端、仅覆盖服务端差异的子类（如 `openai-chat-vllm-adapter` 继承 `openai-chat`）。
- **Fidelity**：定义见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5。
- **插件**：特定端点或厂商模型在协议之外的处理，位于 `<client>/plugins/` 下，主机与模型模式匹配时启用（§9）。

## 3. MMSP 作为中间表示

- **MMSP 边界**：每个请求都必须将 `UniConfig` 与 `UniMessage` 转为服务商配置与输入，每个线上事件（或非流式响应）都必须转为 `UniEvent`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1）；服务商形状不进入任何消息或事件（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#34-内容项) §3.4）。
- **禁止跨服务商直转**：客户端不得与另一服务商线上格式互转；调用方可以经由 MMSP 内容项及其 `fidelity` 在另一客户端上继续对话（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#4-每种线上格式需要发回什么) §4、§5）。
- **无状态转换**：转换必须无状态，每次携带完整对话，不保留跨请求/事件状态，也不引用服务商状态：
  - Responses 客户端（`openai-official`、`openai-responses`、`deepseek-official`、`minimax-official`）与 Interactions 客户端（`google-official`）发送 `store: false` 且不传旧响应 id。
  - 客户端唯一的记忆是基类保存并每次完整发送的有状态 MMSP 历史。
- **`mmsp` 服务端透传**：`POST /v1/stream` 接收 `{"model", "messages", "config"}`，以 SSE 返回公开流，所有 `bytes` 编码为 base64（`wire.py` / `wire.ts`）。除该编码外，`mmsp` 客户端原样传递，由服务端上游客户端转换。

## 4. 三个转换方法

- **三个转换方法**：客户端必须在 `transform_uni_config_to_model_config`（`transformUniConfigToModelConfig`）、`transform_uni_message_to_model_input`（`transformUniMessageToModelInput`）与 `transform_model_output_to_uni_event`（`transformModelOutputToUniEvent`，每次独立转换单个线上事件）中转换。
- **`_streaming_response_internal` / `_streamingResponseInternal`**：
  - 必须调用配置与消息转换方法、发出请求，并为每个线上事件产出转换结果。
  - 可以补全需同时结合配置与消息的部分（Chat Completions 开头的系统提示、`anthropic-official` 的 Bedrock 缓存断点、Gemini TTS 单轮输入），或据同流早先事件修正事件（generateContent 对工具调用轮报告 `STOP` 时，`google-genai` 报为 `tool_call`）。
  - **例外**：两个 Google 客户端的 embedding 路径（`_embed_messages_internal` / `_embedMessagesInternal`）自行构建 `embedContent` 请求。
- **不共享转换代码**：除经由 `utils`、基类或适配器外，客户端之间不得共享转换代码；私有辅助方法应当与参考客户端一致（外加图片获取），需复用时应当复制以保持 diff 清晰。

## 5. 直接的代码

- **直接访问**：直接读取 SDK 属性（`model_output.delta`、`model_output.item.call_id`），字段访问、用量计算与错误文本均留在原处。
- **无垫片与碎片函数**：应当仅在内联会淹没主流程时提取代码（绝不为几行提取），且不得写同时接受 `dict` 与 SDK 对象的垫片。

## 6. 顺序

只要线上格式能表达，消息转换方法就必须保持助手单轮内容项顺序（`思考 -> 文本 -> 工具调用`）：

| 线上协议 | 保序方式 |
| --- | --- |
| **Messages / generateContent / Interactions** | 单轮内容项按序放入同一个有序列表（内容块、part 或 step）。 |
| **Responses 风格** | 推理项、函数调用或工具结果各自为独立输入项，单轮文本收集进 message 项；追加上述独立项前，必须先将已收集文本作为 message 项追加。 |
| **Chat Completions** | 文本、推理字段与工具调用位于同一消息的不同字段中，无相对顺序。 |

## 7. 每种输入一种形状

- **单一当前形状**：除下方旧形状外，转换方法对每种输入必须只接受一种形状：SDK 类型的线上事件与只含 `.done` 内容项的消息（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#32-unimessage) §3.2），不保留任何冗余（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5）。
- **0.5.0 前无后缀类型（读取至 0.6.0）**：`normalize_legacy_messages` / `normalizeLegacyMessages` 必须在服务商转换方法前将无后缀类型（`text`、`tool_call`，…）转为 `.done` 并丢弃零散 `partial_tool_call`：
  - 转换时返回副本、当前格式返回原对象（不修改调用方消息），单进程首次转换警告一次。
  - 在 `streaming_response`、有状态调用、`set_history` 及 tracer 加载轨迹时运行（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#7-读取轨迹) §7）。
- **内容项内四种旧形状（读取至 0.6.0）**：（1）`bytes` 思考签名、（2）无通道推理项、（3）0.5.5 整块网关推理块、（4）0.5.8 及更早版本以对象记录的工具调用 `arguments`（由 `normalize_legacy_messages` / `normalizeLegacyMessages` 转为该对象的 JSON 文本）。等于函数名的工具调用 id **不属于**旧形状（`google-genai` 收到无 id 调用时仍这样记录，两个 Google 客户端回传时均不带 id）。

## 8. 基类

- **单方法自上而下构建**：`streaming_response` / `streamingResponse` 必须在同一方法内依次完成：打 `created_at` 并转换旧类型、校验消息、读取事件并将 delta 交给 `StreamItems`、合并用量与结束原因、关闭末尾内容项、按需抛出 `IncompleteStreamError` 或 `EmptyResponseError`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5）、构建 `stop`、保存轨迹（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#3-何时保存轨迹) §3）并产出 `stop`（中止处理及竞争条件说明同在该方法内）。
- **无额外中间层**：客户端事件与公开流之间除 `StreamItems` 外不得有其他类或辅助层。
- **`mmsp` 覆盖**：打上 `created_at` 并转发服务端已构建好的公开流，旧类型转换与校验交由服务端上游客户端完成（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#7-mmsp-客户端) §7）。

## 9. 插件

- **职责边界**：兼容客户端（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#2-conventions-and-terminology) §2）必须在转换方法中与参考客户端一致，不得按 base URL 或模型 id 分支；端点或厂商模型在协议外的特例（异名字段、异形流、专属参数、错误计数）必须写成插件。官方客户端、适配器与 `google-genai` 在自身代码中区分模型（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#61-明确匹配) §6.1）。
- **声明与匹配**：继承 `ClientPlugin`（`src_py/mmsp/plugin.py` / `src_ts/src/plugin.ts`），位于 `<client>/plugins/<name>.py` / `.ts`，按 `PLUGINS` 顺序运行。必须至少声明 `hosts`（匹配主机本身及子域名）或 `models`（模型 id 不区分大小写正则）之一；声明项全部匹配时启用。
- **构造与封闭性**：客户端必须在构造函数中按模型 id 与 SDK base URL 一次构建 `enabled_plugins` / `enabledPlugins`（基类存于 `_plugins`），持有模型 id、base URL 与 SDK 对象。调用方不得增删或关闭插件，`AutoLLMClient` 与客户端构造函数不接受插件参数。
- **钩子**：有插件的客户端必须在 `_streaming_response_internal` / `_streamingResponseInternal` 中（且仅在该处）按 `PLUGINS` 顺序调用启用插件的钩子，就地修改参数、不返回值：

| 钩子 | 调用时机与作用对象 |
| --- | --- |
| `on_request(config, request)` / `onRequest(config, request, signal)` | 配置与消息转换后、请求发出前运行（可以 `await`），修改 SDK 调用关键字参数（含线上消息）。 |
| `on_wire_event(wire_event)` / `onWireEvent(wireEvent)` | 事件转换读取每个线上事件前运行。 |
| `on_event(event)` / `onEvent(event)` | 事件转换生成 `UniEvent` 后运行。 |

- **形状对齐与无状态**：插件必须将端点线上格式与转换方法读写形状双向对齐，使内容项、`fidelity` 与流规则仍归属转换方法和基类（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1、[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#4-每种线上格式需要发回什么) §4；如 Mistral 思考块与 `reasoning_content` 互转）。转换保持无状态（§3）：插件可以在客户端生命周期内缓存端点信息（如模型是否推理），不保留对话内容；插件请求经客户端 SDK 发往其 base URL，带其凭据（[MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md#4-解析规则) §4）并传递中断信号（[MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#3-中断一条流) §3）。

## 10. Conformance

- **对照审阅**：按 `.agents/skills/mmsp-dev/SKILL.md` 对照参考客户端审阅。
- **实现文件**：`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`、`src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`、`src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`、`src_py/mmsp/wire.py` / `src_ts/src/wire.ts`、`src_py/mmsp/plugin.py` / `src_ts/src/plugin.ts`，以及 `<client>/client.py` / `.ts` 与 `<client>/plugins/`。
- **测试套件**：`src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`（旧类型转换）、`test_message_order.py` / `message-order.test.ts`（线上顺序）、`test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`（回传内容项与 Mistral 思考块）、`test_mmsp_server.py` / `mmsp-server.test.ts`（服务端流一致）、`test_plugins.py` / `plugins.test.ts`（插件匹配与钩子位置）。
