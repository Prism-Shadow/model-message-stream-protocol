# MMSP-RFC-0003 消息请求

- Feature Name: `message_requests`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[English](MMSP-RFC-0003-message-requests.md)

## Abstract

消息请求是调用模型的唯一方式：由 `streaming_response` 或 `streaming_response_stateful` 产出的一条 `UniEvent` 异步流，只有一套语法，由基类收尾，先是若干 `delta` 事件，每个携带一个内容项，然后恰好一个 `stop` 事件，携带用量和结束原因。本文规定这种调用、流的语法、流怎样结束，以及请求参数怎样映射：每个思考等级在每个客户端上都能用，其他每个 `UniConfig` 值要么按明确的映射发送，要么在请求发出之前被拒绝。

## 1. Introduction

同时服务许多对话的宿主程序，绝不能因为某个服务商而阻塞自己的事件循环；调用方也绝不能把被截断的回答当成完整的回答。在第二版流式协议（[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)）之前，每个客户端自己为内容项收尾，所以针对某个服务商的流的修复（[#218](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/218)、[#221](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/221)）一次只能落到一个客户端。2026-10-22，CI 中一条 GLM-5.3-Flash 的流在携带用量的数据块到达之前就结束了（[run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)）；探测表明服务商的最后一个数据块每次都同时携带结束原因和用量，所以那条流是中途断开的，而这正是调用方想要重试的情况（[#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)）。

调用方只设一次 `ThinkingLevel`，换模型只换名字；如果客户端因为某个级别抛出异常，调用方就又得按模型分支。[#166](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/166) 按每个 Gemini 模型限制了级别，[#176](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/176) 按厂商映射了 `max`，[#293](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/293) 补上了 `none` 什么也不发送、Claude Opus 5 仍在思考的缺口，[#294](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/294) 让 `none` 在 Kimi K3 系列上关闭思考。靠模糊匹配构建的请求，会把一代模型的参数发给另一代；[#289](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/289) 背后的审查发现配置页在大多数键上写得不对，于是依据两种语言的转换重写了它。

项目负责人的原话：支持全部思考等级；模型请求参数不模糊匹配；对本文则是：要求异步和流式，任何思考等级不能报错，请求参数尽量精确。这些内容最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0003、MMSP-RFC-0006、MMSP-RFC-0010 以及 MMSP-RFC-0004 中的版本规则，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0003、MMSP-RFC-0005（`stop` 事件部分）、MMSP-RFC-0010 与 MMSP-RFC-0011。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *客户端流*：客户端的 `_streaming_response_internal` / `_streamingResponseInternal` 产出的事件。*公开流*：基类产出给调用方的事件。
- *片段*、*完整内容项*：定义见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#2-conventions-and-terminology) §2。*增长字段*：某类内容项的片段不断延长的那一个字段（`text`、`thinking`、`arguments`、`data`、`embedding`）。
- *官方客户端*、*兼容客户端*：定义见 [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#2-conventions-and-terminology) §2。
- *代*：一个厂商接受同一种请求的那些模型（`"4-6"`、`"gpt-6"`）。

## 3. 调用

### 3.1 两个入口

调用模型必须只经由 `streaming_response` 与 `streaming_response_stateful`（TypeScript 中为 `streamingResponse` 与 `streamingResponseStateful`），它们都是产出 `UniEvent` 的异步生成器。没有同步调用，也没有一次返回整个响应的调用。客户端向端点发出的另一种请求只有 `list_models`（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#5-列出模型) §5）。

### 3.2 全部走流式

服务商提供流式端点时，客户端必须读取流式端点。embedding 端点不是流式的：它的向量作为内容项流出，然后是一个 `stop`，以 `prompt_tokens` 携带端点报告的输入计数，`finish_reason` 为 `stop`。`openai-embedding` 按向量的 `index` 把每个向量与它的输入对应起来。

### 3.3 请求之前

在发送任何内容之前，`streaming_response` 给每条缺少 `created_at` 的消息打上时间戳（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#63-created_at) §6.3），转换旧的内容项类型（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7），并检查每条消息都有可发送的内容。没有内容项的消息，或者客户端的消息转换无法发送的消息（只有思考），必须在发往服务商的请求发出之前抛出带有 `message_index` 的 `InvalidMessageError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1）。

## 4. 流的语法

### 4.1 客户端产出什么

- 服务商的流中每来一个事件，客户端流必须产出一个 `UniEvent`：只产出 delta，从不产出完整内容项。它的 `stop` 事件在线上报告用量和结束原因的地方携带它们，有时分几次携带；`delta` 事件两者都不携带。
- 不含任何通用内容的线上事件就是空的 delta 事件。表示内容项结束的事件不为内容项收尾：它只产出自己新增的东西，比如一个已完成的推理内容项的 fidelity。客户端不认识的事件必须跳过，因此网关自己插入的帧无法终止一次生成；设置 `MMSP_DEBUG` 后改为抛出 `UnknownEventError`。
- 从线上读取完整内容项的客户端（MiniMax 的工具调用）把它作为单个片段流出，不得再同时流出它的 delta。

### 4.2 基类做什么

- 基类把每个 delta 交给 `StreamItems`（`stream_items.py` / `streamItems.ts`），由它判断每个内容项在哪里结束，并在下一个内容项开始或客户端流结束时，以完整内容项为它收尾。
- 基类把客户端各个 `stop` 事件上的用量和结束原因逐字段合并进唯一的公开 `stop`：后到的计数替换先到的，0 仍然是 0，服务商不报告的计数为 `None`，不要求任何计数是数字。

### 4.3 内容项

- 每个内容项都以连续的片段流出，随后是它唯一的完整内容项。内容项之间不得交错。
- 完整内容项只由 `StreamItems` 用已经流出的片段构建：增长字段是各片段该字段的拼接；工具调用的参数由拼接后的 JSON 解析而来；其余字段取自第一个片段；`fidelity` 是片段携带的那一份。一个内容项最多只有一个片段携带它的 fidelity，完整内容项会再带一次。

### 4.4 助手消息

按顺序排列的完整内容项，加上 `stop` 事件的 `usage_metadata` 与 `finish_reason`，就是助手消息。`concat_uni_events_to_uni_message`、有状态的历史与 tracer 都把这两个字段复制到助手消息上。

## 5. 流怎样结束

- 一条流必须要么以它的 `stop` 事件结束，要么以异常结束，不会两者兼有。
- `stop` 事件必须携带一个 `usage_metadata` 对象和一个有值的 `finish_reason`。服务商的流缺少其中之一就结束时，在它之前的事件之后、原本 `stop` 的位置抛出 `IncompleteStreamError`，因此调用方不会看到缺少这两项的 `stop`，历史和 trace 也不会记录这一回合。这个错误指明客户端与缺少的一个或多个字段，并携带已经到达的用量或结束原因，好让这些 token 仍能计入。
- 除了思考没有别的内容项、或者根本没有内容项的响应，在原本 `stop` 的位置抛出 `EmptyResponseError`，因为没有服务商接受它回传（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#5-别处产生的思考) §5）。
- 客户端产出违反这套语法的内容时，在任何模式下都抛出 `StreamProtocolError`：完整内容项、带用量的 delta 事件、同一内容项上两份不同的 fidelity、第一个片段缺少名字或调用 id 的工具调用。这是客户端的缺陷，不得修补。`IncompleteStreamError` 不属于这种情况（是服务商截断了流），`EmptyResponseError` 也不属于（是没有内容的响应）。
- SDK 在一条已打开的流中抛出的异常原样传出（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）；Interactions API 的 `error` 事件两个 Interactions SDK 都不会抛出，由客户端抛出 `ProviderStreamError`。中止按 [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md) 的规定结束这条流。

## 6. 请求参数

### 6.1 明确匹配

- 客户端为某个模型发送什么，必须由明确的匹配决定，绝不靠猜。在官方客户端内部，各代模型靠 id 中的版本区分（`"4-6"`；`"gpt-6"` 但不是 `"gpt-6-luna"`；`"k2."`；`"m3.1"`；`"glm-5.3"`），写在有名字的元组或直白的条件里；先匹配上的那一行生效。表示档位或模态的标记（`-pro`、`-image`、`tts`、`embedding`）也以同样的方式选定模型的类别。`"claude"`、`"gpt"` 这类只有系列名的子串不得决定任何事。新的一代模型加一行或一个条件，绝不放宽匹配。
- 兼容客户端只在发送的内容因模型而异时才读取模型 id，而且同样按明确的名字：vLLM 适配器从自己的表中选出聊天模板的思考开关，找不到时退回 Qwen3 的开关；`openai-responses` 在 Luna 以外的 GPT-6 上把 `none` 变成 `low`；`openai-chat` 和 `openai-responses` 对 GPT-5.6 原本会拒绝的图片请求 `detail: "high"`。
- 模型 id 由哪个客户端处理，见 [MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md)。

### 6.2 没有对应设置的值

客户端无法为该模型发送的 `UniConfig` 值，必须在请求发出之前抛出 `UnsupportedParameterError`，指明客户端与参数。客户端用不上的键会被忽略。`thinking_level` 是例外（§6.3）。

### 6.3 思考等级

- 客户端不得拒绝任何 `ThinkingLevel`：无论什么模型，都没有客户端为 `thinking_level` 抛出 `UnsupportedParameterError`。
- 每个官方客户端按一张固定的表，把每个级别映射到该模型这一代的某个设置上，不发出警告：模型有这个级别时，就用它本身；模型没有时，用模型接受的另一个级别（Claude 4.6 以 `high` 运行 `xhigh`；Gemini 以 `high` 运行 `xhigh` 和 `max`）；对于 `none`，模型有自己的关闭开关时就用它（Claude Sonnet 5 上的 `disabled`，GPT-6 Luna 和 Kimi K3 系列上的 `none`）；对于没有关闭开关的模型上的 `none`，用它允许的最少思考（Claude Opus 5.5 上的最低 effort，Claude Sonnet 5.5 上的 `between_tools`，Gemini 上的 `minimal` 或 `low`）。
- 经由兼容客户端时，由端点决定某个级别实际如何运行，端点可以拒绝这个值：`ant-messages` 对 `none` 发送 `disabled`；`openai-responses` 把级别作为它的 effort 发送，在 Luna 以外的 GPT-6 上把 `none` 发成 `low`；`openai-chat` 不发送级别；它的 vLLM 适配器只发送聊天模板的思考开关；`mmsp` 客户端把级别转发给它的服务端。

### 6.4 有另一种形式的值

协议对某个值有另一种形式时，映射写明用哪一种：工具名列表在 `openai-chat` 上是 `allowed_tools`；只有一个名字的列表在 `ant-messages` 上是 `{type: "tool", name}`；没有设置的 `max_tokens` 在 Anthropic 客户端上是 64000。

### 6.5 配置页

本文陈述规范；[`site/src/docs/configuration.zh.md`](../../site/src/docs/configuration.zh.md) 写明每个客户端对每个键发送、忽略还是拒绝什么，思考等级的每一行在两个包的映射测试中都有对应的用例。其中的一行必须和改动它的代码在同一个 PR 中修改。

## 7. `mmsp` 客户端

`mmsp` 客户端有自己的 `streaming_response`：它打上 `created_at`，把消息和配置原样发给它的服务端，不转换旧的内容项类型，也不检查每条消息是否有可发送的内容；§3.3 和 §6 的其余部分由服务端的客户端完成。它原样转发服务端的公开流，包括其中的 `stop`。服务端的流在 `stop` 之前结束时，它自己抛出 `IncompleteStreamError`；服务端的 `IncompleteStreamError` 以 `UpstreamError` 的形式到达它，带有该 `error_type` 以及这个错误的各个字段（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）。

## 8. Conformance

- `src_py/mmsp/base_client.py`、`src_py/mmsp/stream_items.py`、`src_ts/src/baseClient.ts`、`src_ts/src/streamItems.ts`；`errors.py` / `errors.ts` 中的 `IncompleteStreamError`，以及它在 `wire.py` / `wire.ts` 中的分支。
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流，包括每个完整内容项等于其片段的拼接。
- `test_stream_protocol.py`、`test_stream_items.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_message_order.py`（把一条空消息和一条只有思考的消息交给各客户端的消息转换）及其对应的 Jest 测试；`test_mmsp_server.py` / `mmsp-server.test.ts`，检查经过服务端的流与上游的流相同。
- `src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中的配置转换（`transform_uni_config_to_model_config` / `transformUniConfigToModelConfig`）；`test_thinking_level_mapping.py` / `thinking-level-mapping.test.ts`，为每一代模型的那一行固定用例；`test_request_body.py` / `request-body.test.ts`。
- `site/src/docs/configuration.en.md` / `configuration.zh.md`；`UnsupportedParameterError` 的文档字符串；对照 `.agents/skills/mmsp-dev/SKILL.md` 评审，它要求在编写不显然的映射之前先停下来询问。
