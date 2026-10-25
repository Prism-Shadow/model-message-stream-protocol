# MMSP-RFC-0009 协议转换

- Feature Name: `protocol_conversion`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[English](MMSP-RFC-0009-protocol-conversion.md)

## Abstract

协议转换是服务商的线上协议与 MMSP 之间的翻译，每个客户端都以 MMSP 为中间表示：请求从 MMSP 转换成线上格式，每个线上事件再转换回 MMSP，一段对话从一个服务商换到另一个服务商，只经过 MMSP。本文规定 MMSP 的这一角色、客户端做转换的三个转换方法、它们保持的顺序与唯一的输入形状、仍然读取的旧形状，以及把客户端的事件变成公开流的基类；这些都写成直接的代码，没有自己的中间层。

## 1. Introduction

项目负责人为本规范提出的要求是：「写一下把 MMSP 作为 IR 的转换逻辑，实现代码减少抽象，尽量直观」。中间只有一种表示，客户端就只是两次转换，转成自己的线上格式，再转回来；经一个客户端记录的对话能经另一个客户端继续，两个客户端都不必知道对方的形状。

审阅一个客户端，就是把它当作对其参考客户端的 diff 来看；读者顺着一次请求或一次响应，把整个文件从头读到尾。每多一层辅助函数、每一个接受同一输入两种形状的垫片，都是两种语言彼此走样、服务商的怪癖藏身的地方。项目负责人早先的原话是「转换代码尽量减少抽象，保持易懂」，对基类客户端则是「base client也减少一些抽象,尽量让代码容易看懂」，后者由 [#297](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/297) 完成。顺序规则来自一次故障：一个 Responses 风格的转换把收集到的文本追加在它之前的工具调用后面，DeepSeek 因此回答 "No tool output found for tool call"，直到 [#185](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/185) 修复。[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) 把 0.5.5 整块保存的网关推理块改为共用的 fidelity 键，同时把这种整块的形状加入了从早先版本读取的形状。本规范最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0012，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0013；顺序规则在这两次中都属于 MMSP-RFC-0002。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *中间表示*：`UniConfig`、`UniMessage` 与 `UniEvent` 及其内容项（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#3-三种结构) §3）。
- *线上格式*：服务商的请求与事件形状，以其 SDK 的类型为准。
- *服务商客户端*：除 `mmsp` 之外的每个客户端；`mmsp` 连接的是 MMSP 服务端，而不是服务商。
- *转换方法*：§4 的三个转换方法之一。
- *参考客户端*：同一协议的新客户端对照着读 diff 的那个客户端：Responses 协议是 `openai-official`，Chat Completions 是 `openai-chat`。
- *适配器*：继承其所服务协议的客户端、只覆盖其服务端读法不同之处的客户端，如 `openai-chat-vllm-adapter` 之于 `openai-chat`。
- *Fidelity*：见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5 的定义。

## 3. MMSP 作为中间表示

- 每个请求都必须从 MMSP 转换而来，`UniConfig` 转为服务商的配置，`UniMessage` 转为其输入；每个线上事件，或不流式返回的端点的那一个响应，都必须转换为 `UniEvent`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1）。服务商的形状不会进入任何消息或事件（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#34-内容项) §3.4）。
- 客户端不得与另一个服务商的线上格式互相转换；两个服务商之间唯一的通路是 MMSP。调用方可以把经一个客户端记录的对话放到另一个客户端上继续：记录就是内容项及其 `fidelity`，接收的客户端按 [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#4-每种线上格式需要发回什么) §4 与 §5 的规定，把它们转换为自己的线上格式。
- 转换必须是无状态的。每个请求都携带完整的对话，客户端在请求之间、事件之间不保留任何转换状态，也没有客户端引用服务商保存的状态：Responses 客户端（`openai-official`、`openai-responses`、`deepseek-official`、`minimax-official`）与 Interactions 客户端（`google-official`）都发送 `store: false`，不发送此前任何响应的 id。客户端唯一的记忆是有状态历史，即基类保存、每次调用都完整发送的 MMSP 消息。
- MMSP 服务端的线上格式就是 MMSP 本身：`POST /v1/stream` 接收 `{"model", "messages", "config"}`，以 server-sent events 返回公开的流，每个 bytes 值都以 base64 文本传输（`wire.py` / `wire.ts`）。因此除这层编码外，`mmsp` 客户端的转换方法原样传递，向服务商的转换由服务端的上游客户端完成。

## 4. 三个转换方法

- 客户端必须在 `transform_uni_config_to_model_config`、`transform_uni_message_to_model_input` 与 `transform_model_output_to_uni_event`（`transformUniConfigToModelConfig`、`transformUniMessageToModelInput`、`transformModelOutputToUniEvent`）中做转换。事件转换方法独立地转换一个线上事件。
- `_streaming_response_internal` / `_streamingResponseInternal` 必须调用配置与消息两个转换方法、发出请求，并对每个线上事件产出事件转换方法的结果。它可以补上请求中同时需要配置与消息的部分，例如 Chat Completions 列表开头的系统提示、`anthropic-official` 在 Bedrock 上设置的缓存断点、Gemini TTS 模型接受的唯一一轮；也可以根据同一个流中较早的事件修正某个事件，例如 generateContent 对调用了工具的一轮报告 `STOP`，`google-genai` 把它报告为 `tool_call`。唯一的例外是两个 Google 客户端的 embedding 路径（`_embed_messages_internal` / `_embedMessagesInternal`），它自己构建 `embedContent` 请求。
- 客户端之间不得共享转换代码，经由 `utils`、基类或适配器的除外。客户端的私有辅助方法应当就是其参考客户端拥有的那些，外加图片的获取；客户端需要另一个客户端已有的东西时，应当复制过来，这样每个客户端读起来都像对其参考客户端的 diff。

## 5. 直接的代码

转换方法直接读取 SDK 的属性（`model_output.delta`、`model_output.item.call_id`），字段访问、用量计算与错误文本都留在用到它们的地方。贡献者应当只在内联会淹没主流程时才提取一段代码，绝不为几行代码提取，并且不得写同时接受 dict 与 SDK 对象的垫片。

## 6. 顺序

只要线上格式能表达，消息转换方法就必须保持助手一轮中内容项的顺序：先思考，再文本，再工具调用。Messages、generateContent 与 Interactions 把一轮的内容项放在一个有序列表里（内容块、part 或 step），按顺序放入就保持了顺序。Responses 风格的线上格式把推理项、函数调用或工具结果各自作为一个输入项，而这一轮的文本收集进一个 message 项；收集到的文本必须先作为 message 项追加，再追加这样的输入项。Chat Completions 把文本、推理字段与工具调用放在同一条消息的不同字段里，它们之间没有顺序。

## 7. 每种输入一种形状

- 除下面的旧形状外，转换方法对每种输入必须只接受一种形状：线上事件是 SDK 类型的事件，消息只包含 `.done` 内容项（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#32-unimessage) §3.2）。
- 0.5.0 之前记录的历史使用不带后缀的内容项类型（`text`、`tool_call`，…）。`normalize_legacy_messages` / `normalizeLegacyMessages` 必须在服务商客户端的转换方法看到它们之前完成转换：每个这样的类型变为对应的 `.done` 类型，零散的 `partial_tool_call` 被丢弃；需要转换的消息以副本返回，已是当前格式的消息作为同一个对象返回，因此它从不修改调用方的消息；一个进程中第一次转换时发出一次警告。转换在 `streaming_response` 的请求消息上、有状态调用的那条消息上和 `set_history` 中进行，也在 tracer 加载的轨迹文件上进行（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#7-读取轨迹) §7）。这些类型读取到 0.6.0 为止。
- 早先版本在内容项内部记录下的三种形状同样读取到 0.6.0 为止：以 bytes 保存的思考签名、不带通道的推理项，以及 0.5.5 整块保存的网关推理块。等于函数名的工具调用 id 不在其中：`google-genai` 收到不带 id 的调用时仍然这样记录，两个 Google 客户端回传这样的调用时都不带 id。
- 不保留任何冗余（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5）。

## 8. 基类

- `streaming_response` / `streamingResponse` 必须在这一个方法里从上到下构建公开的流：为消息打上 `created_at` 并转换旧类型，校验消息，读取客户端的事件，把每个 delta 交给 `StreamItems` 并合并每个事件的用量与结束原因，关闭最后一个内容项，在流需要时抛出 `IncompleteStreamError` 或 `EmptyResponseError`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5），构建 `stop`，保存轨迹（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#3-何时保存轨迹) §3），然后产出 `stop`。它的中止处理也在这个方法里，所防范的竞争情况就写在旁边。
- 客户端的事件与公开的流之间，除 `StreamItems` 外不得有其他类或辅助层。
- `mmsp` 客户端覆盖 `streaming_response` / `streamingResponse`：它打上 `created_at`，把旧类型的转换和消息的校验留给服务端的上游客户端，并把服务端的公开流按到达的样子转发，因为那个客户端已经构建好了它（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#7-mmsp-客户端) §7）。

## 9. Conformance

- 按 `.agents/skills/mmsp-dev/SKILL.md` 所述，对照参考客户端审阅。
- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`；`src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`；`src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`；`src_py/mmsp/wire.py` / `src_ts/src/wire.ts`；`src_py/mmsp/<client>/client.py` 与 `src_ts/src/<client>/client.ts` 下每个客户端的转换方法。
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`，检查旧内容项类型在请求之前和 `set_history` 中被转换、调用方的消息保持原样、当前格式的消息原样返回。
- `test_message_order.py` / `message-order.test.ts`，让一轮先思考、再文本、再工具调用的消息经过每种协议的客户端，检查线上的顺序。
- `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`，检查回传时发出的确切内容项。
- `test_mmsp_server.py` / `mmsp-server.test.ts`，检查经过服务端的流与上游的流相同。
