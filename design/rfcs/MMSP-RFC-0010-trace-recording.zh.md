# MMSP-RFC-0010 轨迹记录

- Feature Name: `trace_recording`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)
- Kind: spec

[English](MMSP-RFC-0010-trace-recording.md)

## Abstract

当请求的 `UniConfig` 带有 **`trace_id`** 时，MMSP 会在产出 **`stop` 事件**前，将对话（发出的消息、助手回复及配置）写为**缓存目录**下的**两个文件**（`<trace_id>.json` 与 `<trace_id>.txt`）。本文规定保存时机、`trace_id` 校验、轨迹内容、文件格式及 tracer 查看器。

## 1. Introduction

- **核心动机**（「写一下 trace 的逻辑」）：所有模型共用同一轨迹格式，调用方几秒内即可定位错误工具参数或失控思考，harness 也能据此修改提示词、工具或代码并重跑。
- **演进历史**：
  - **初版与 TS 移植**：[#17](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/17) 加入 `trace_id` 与有状态轮后保存；[#34](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/34)、[#38](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/38) 将写入与查看器带到 TypeScript；[#96](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/96) 加入 `created_at` 与查看器轮次。
  - **移至 `stop` 前保存**（[#223](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/223)）：移入 `streaming_response` 产出 `stop` 之前，确保在 `stop` 处停读的调用方总能拿到轨迹。
  - **双包统一与路径限制**（[#300](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/300)）：统一命名、时间戳格式，并拒绝越出缓存目录的 id。
- **2026-11-02 — 与提示缓存解耦**（[#307](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/307)，[MMSP-RFC-0011](MMSP-RFC-0011-prompt-cache-sessions.zh.md)）：提示缓存键改由 `session_id` 提供，`moonshot-official` 不再在 Kimi K2 上把 `trace_id` 作为 `prompt_cache_key` 发送，轨迹 id 不再发给任何服务商。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **轨迹 id**：`UniConfig.trace_id` 字符串，以 `/` 分隔目录、相对于缓存目录的路径。
- **缓存目录**：环境变量 `MMSP_CACHE_DIR` 指定的目录（未设置时为相对于工作目录的 `cache`），`streaming_response` 每次处理轨迹 id 时读取。
- **Tracer**：`mmsp.integration.tracer` / `integration/tracer` 中的 `Tracer` 类，负责写入轨迹并提供查看器。

## 3. 何时保存轨迹

- **紧接 `stop` 之前**：配置带有 `trace_id` 时，`streaming_response` / `streamingResponse` 必须在内容项关闭且 `stop` 构建后、紧接产出 `stop` 前保存轨迹，且不得在其他时刻保存。
- **异常或提前关闭不保存**：产出 `stop` 前抛出异常（服务商错误、`IncompleteStreamError`、`EmptyResponseError`、`StreamProtocolError` 或中止错误，见 [MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#3-中断一条流) §3）或生成器在 `stop` 前关闭时，不保存轨迹。
- **有状态调用**：经由 `streaming_response` 保存截至当前的整段对话。
- **`mmsp` 客户端**：`trace_id` 随配置传至服务端，由服务端上游客户端保存在服务端缓存目录下，`mmsp` 客户端不得自行保存。
- **不发给服务商**：任何服务商客户端都不发送 `trace_id`；提示缓存键由 `session_id` 提供（[MMSP-RFC-0011](MMSP-RFC-0011-prompt-cache-sessions.zh.md)）。

## 4. 轨迹 id

- **子目录与规范化**：`/` 产生缓存目录下的子目录；目录内路径按 `path.resolve` 规范化（`agent/../kept` 写为 `kept.json`），空 `trace_id` 不保存。
- **请求前越界拒绝**：文件解析在缓存目录之外或指向目录本身（绝对路径、越界 `..`、`.`、`agent/..`）时，`streaming_response` 必须在请求发出前拒绝，抛出指明 `trace_id` 的 `UnsupportedParameterError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1）：
  `<client> does not support trace_id '<id>': it must be a relative path that stays inside the cache directory.`
- **`mmsp` 转发校验**：由服务端上游客户端对照服务端缓存目录检查，越界时调用方收到 `error_type`（`errorType`）为 `UnsupportedParameterError` 的 `UpstreamError`（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#4-经由服务端转发) §4）。

## 5. 轨迹的内容

- **历史（`history`）**：已转换旧内容项类型并打上 `created_at` 的请求消息（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#63-created_at) §6.3），后接由流构建的助手消息（含完整内容项、`usage_metadata`、`finish_reason` 及 `stop` 的 `created_at`）。
- **配置与保存时间**：原样配置加上保存方客户端的模型 id `model`（保留 `trace_id`），以及保存时间。
- **无临时状态**：助手消息不得带 `fidelity.item_id`（已由 `StreamItems` 去掉，见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5），不含任何 delta 或未完成轮次（§3）。
- **无密钥**：密钥、base URL 与请求头为构造参数，不入轨迹；调用方不应把密钥放进配置。

## 6. 文件与格式

- **双文件完整重写**：每次保存在缓存目录下写入 `<trace_id>.json` 与 `<trace_id>.txt`（后缀追加于规范化 id 后，如 `run.v2.json` / `run.v2.txt`，自动创建缺失目录），且每次必须完整重写两文件以保留最新状态。

| 文件 | 格式与内容 |
| --- | --- |
| `<trace_id>.json` | UTF-8 JSON `{"history": [...], "config": {...}, "timestamp": "..."}`：CJK 不转义，`bytes` 值（如 `inline_data.done` / `inline_thinking.done` 的 `data`）写为 base64，`timestamp` 为带毫秒与 `Z` 的 UTC ISO 8601（`toISOString()`，如 `2026-10-24T09:30:00.000Z`）。 |
| `<trace_id>.txt` | 供人阅读的记录：不含 `trace_id` 的配置，后接编号消息（角色、内容项、用量、结束原因）。程序应当读取 `.json`，`.txt` 排版不作规定。 |

## 7. 读取轨迹

- **查看器**：`create_web_app` / `createWebApp`（或默认端口 `25750` 的 `start_web_server` / `startWebServer`）列出缓存目录，按轮次呈现 `.json` 轨迹，其余文件以纯文本显示。
- **旧格式转换**：加载 0.5.0 前的轨迹文件时转换旧内容项类型（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。
- **路径与符号链接拦截**：解析符号链接后既非缓存目录本身也不在其内的路径，必须以 `403` 拒绝并从列表中略去。
- **Playground**：在 `/tracer/` 提供查看器，包含同进程 MMSP 服务端的轨迹。

## 8. Conformance

- **实现**：`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`、`src_py/mmsp/integration/tracer.py` / `src_ts/src/integration/tracer.ts`、`src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`。
- **测试**：`src_py/tests/test_tracer.py` / `src_ts/tests/tracer.test.ts`（`stop` 前落盘、无 `item_id`、双文件覆盖与建目录、0.5.0 前旧类型转换、后缀追加、UTC `Z` 时间戳、越界拒绝、查看器含符号链接 `403`）、`src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`（请求前抛 `UnsupportedParameterError`）、`src_py/tests/test_interruption.py` / `src_ts/tests/interruption.test.ts`（`stop` 前中止/关闭不保存）。
- **文档**：`site/src/docs/tracing.en.md` / `tracing.zh.md`、`server.en.md` Traces 与 `server.zh.md`「追踪」一节、`configuration.en.md` / `configuration.zh.md` 的 `trace_id` 表。
