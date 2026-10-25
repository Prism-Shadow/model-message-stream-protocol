# MMSP-RFC-0010 轨迹记录

- Feature Name: `trace_recording`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[English](MMSP-RFC-0010-trace-recording.md)

## Abstract

轨迹是请求的 `UniConfig` 带有 `trace_id` 时 MMSP 为一段对话写下的记录：发出的消息、回答它们的助手消息以及配置，在产出 `stop` 事件之前写成缓存目录下的两个文件。本文规定轨迹何时保存、接受哪些轨迹 id、轨迹包含什么、文件及其格式，以及 tracer 的查看器如何读取它们。

## 1. Introduction

项目负责人为本规范提出的要求是：「写一下 trace 的逻辑」。调用方能按实际发生的样子读到每一轮，一个错误的工具参数、一段失控的思考，几秒内就能找到，不必从日志里拼凑；一个审视自己轨迹的 harness 能据此修改提示词、工具或代码，再跑一遍。轨迹对每个模型都是同一种格式的同一种记录，所以它作为协议的一部分在这里规定，而不是留给各个客户端自行决定。

[#17](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/17) 加入了 `trace_id` 与 tracer，当时在有状态的一轮之后保存历史；[#34](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/34) 与 [#38](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/38) 把写入与查看器带到 TypeScript；[#96](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/96) 加入了 `created_at` 与查看器中的轮次；[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223) 把保存移进 `streaming_response`，放在产出 `stop` 之前，这样在 `stop` 处停止读取的调用方也能找到轨迹。两个包的写入在文件命名、时间戳以及轨迹 id 能触及的位置上曾有差异；[#M](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/M) 统一了它们，并让 `streaming_response` 拒绝缓存目录之外的 id。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *轨迹 id*：请求的 `UniConfig` 中的 `trace_id` 字符串，是相对于缓存目录的路径，其中 `/` 分隔目录。
- *缓存目录*：环境变量 `MMSP_CACHE_DIR` 指定的目录，未设置时为 `cache`，相对于工作目录；`streaming_response` 每次处理轨迹 id 时读取。
- *Tracer*：`mmsp.integration.tracer` / `integration/tracer` 中的 `Tracer` 类，负责写入轨迹文件并提供查看器。

## 3. 何时保存轨迹

- 配置带有 `trace_id` 时，`streaming_response` / `streamingResponse` 必须保存轨迹：在流的内容项都已关闭、`stop` 已构建之后，紧接在产出 `stop` 之前，这样调用方看到 `stop` 时轨迹已经在磁盘上。它不得在其他任何时刻保存。
- 在产出 `stop` 之前抛出异常的 `streaming_response` 不保存轨迹，无论是服务商的错误、`IncompleteStreamError`、`EmptyResponseError`、`StreamProtocolError` 还是中止错误（[MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#3-中断一条流) §3）；生成器在 `stop` 之前被关闭的也不保存。
- 有状态调用经由 `streaming_response` 保存，所以它的轨迹是到此为止的整段对话。
- 经由 `mmsp` 客户端时，`trace_id` 随配置传到服务端：服务端的上游客户端把轨迹保存在服务端的缓存目录下，`mmsp` 客户端不得自己保存。
- `moonshot-official` 在 Kimi K2 一代上还把轨迹 id 作为 `prompt_cache_key` 发送。其他服务商客户端都不把它发给服务商。

## 4. 轨迹 id

- 轨迹 id 指定缓存目录下的文件；其中的 `/` 产生子目录。
- `streaming_response` 必须在请求发出之前拒绝文件会解析到缓存目录之外的轨迹 id，例如绝对路径、`..` 段离开了该目录的 id，或空 id。它抛出指明 `trace_id` 的 `UnsupportedParameterError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1），消息为 [fix/trace-writer: exact message]。文件解析在缓存目录之内的 id 按原样使用。
- 经由 `mmsp` 客户端时，由服务端的上游客户端对照服务端的缓存目录检查 id，调用方得到 `error_type`（`errorType`）为 `UnsupportedParameterError` 的 `UpstreamError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）。

## 5. 轨迹的内容

- 历史：请求的消息，旧内容项类型已转换、`created_at` 已打上（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#63-created_at) §6.3），后面是由流构建的助手消息，带着它的完整内容项、`usage_metadata` 与 `finish_reason`，以及 `stop` 事件的 `created_at`。
- 原样的配置，加上 `model`，即保存它的客户端的模型 id；`trace_id` 本身仍留在其中。
- 保存的时间。
- 助手消息不得带有 `fidelity.item_id`，它在内容项送出之前已被 `StreamItems` 去掉（[MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5）。轨迹中没有任何 delta，也没有未完成的一轮（§3）。
- 客户端的密钥、base URL 与请求头是构造参数，不是 `UniConfig` 的键，所以永远不会进入轨迹。调用方不应把密钥放进配置，因为轨迹会保存配置。

## 6. 文件与格式

- 一次保存在缓存目录下写入 `<trace_id>.json` 与 `<trace_id>.txt`，后缀追加在原样的 id 之后，所以 `run.v2` 写入 `run.v2.json` 与 `run.v2.txt`。缺少的目录会被创建。每次保存都必须完整重写这两个文件：同一 id 后来的保存替换先前的，所以一个轨迹 id 保存的是一段对话的最新状态。
- `<trace_id>.json` 是 `{"history": [...], "config": {...}, "timestamp": "..."}`，以 UTF-8 写入，CJK 文本不转义，每个 bytes 值，例如 `inline_data.done` 或 `inline_thinking.done` 内容项的 `data`，都写成 base64 文本。`timestamp` 是保存时的 UTC 时间，采用带毫秒、以 `Z` 结尾的 ISO 8601，即 JavaScript `toISOString()` 的形式：`2026-10-24T09:30:00.000Z`。
- `<trace_id>.txt` 是给人读的记录：不含 `trace_id` 的配置，然后是编号的每条消息，带着它的角色、内容项、用量与结束原因。程序应当读取 `.json`；这份记录的排版不作规定。

## 7. 读取轨迹

- tracer 的查看器（`create_web_app` / `createWebApp`，或默认在端口 25750 上的 `start_web_server` / `startWebServer`）列出缓存目录，把 `.json` 轨迹按轮次呈现，其他文件以纯文本显示。
- 它在加载 0.5.0 之前写下的轨迹文件时转换其中的内容项类型（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。
- 它必须以 403 拒绝解析到缓存目录之外的请求路径。
- Playground 在 `/tracer/` 上提供查看器，使用它自己的缓存目录；Playground 启动的 MMSP 服务端运行在 Playground 的进程里，所以它的轨迹也出现在那里。

## 8. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`，在 `stop` 之前保存轨迹；`src_py/mmsp/integration/tracer.py` / `src_ts/src/integration/tracer.ts`，写入与查看器；`src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`，不保存任何东西。
- `src_py/tests/test_tracer.py` / `src_ts/tests/tracer.test.ts`：带轨迹的响应在其 stop 事件到达调用方之前已在磁盘上；其 fidelity 保存时不带 `item_id`；两个文件都会写入，后来的保存覆盖它们，所在目录会被创建；0.5.0 之前保存的轨迹文件以当前内容项类型呈现；在 Python 中，查看器拒绝缓存目录之外的路径。
- `src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`，带 `trace_id` 发起流，检查在 `stop` 之前被中止、关闭或离开的流不保存任何东西。
- `site/src/docs/tracing.en.md` / `tracing.zh.md`；`server.en.md` 的 Traces 一节与 `server.zh.md` 的「追踪」一节；`configuration.en.md` / `configuration.zh.md` 中 `trace_id` 的表格。
