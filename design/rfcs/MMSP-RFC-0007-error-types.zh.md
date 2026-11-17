# MMSP-RFC-0007 异常类型

- Feature Name: `error_types`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)
- Kind: spec

[English](MMSP-RFC-0007-error-types.md)

## Abstract

在 `integration/` 之外，除**中止错误**外，MMSP 抛出的每个错误都是 `errors.py` / `errors.ts` 中带结构化字段的 **`MMSPError`** 子类。本文规定所有**错误类**、**内置基类**、**服务端转发**及**新增规则**。

## 1. Introduction

- **核心问题**：调用方需要用同一个类在两个包和服务端之间捕获错误；裸 `ValueError` 或 `Error` 无法与代码缺陷区分。
- **审查发现**：
  - [#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)：两个 Google 客户端均用裸错误拒绝 `tts_config`。
  - [#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)、[#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)（2026-10-23 审查）：又发现约 60 处裸错误（如缺少 `tool_call_id` 的工具结果、发给纯文本模型的图片），遂将规则扩展至所有错误。
  - 最初载于 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)（MMSP-RFC-0007）与 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)（MMSP-RFC-0009）。
- **2026-11-04 更新（[#316](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/316)）**：OpenAI 格式的图像生成网关可能返回图像链接而非字节；在已打开的流中下载该链接遇到 HTTP 错误时，抛出 `ProviderStreamError` 并以 HTTP 状态码作为 `code`（§3.2）。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **裸的内置错误**：`ValueError`、`RuntimeError` 或 `Error` 本身的实例，而非 `MMSPError` 子类实例。
- **中止错误**：Python 中为携带信号原因的 `asyncio.CancelledError`，TypeScript 中为信号的 `reason`（[MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#2-conventions-and-terminology) §2）。

## 3. 错误类

- **禁止裸错误**：`integration/` 之外的代码不得自行抛出裸的内置错误；除中止错误外，只抛出下列错误类。
- **透传外部异常**：厂商 SDK 异常或调用方任务取消等仅向外传递的异常，原样传播。

### 3.1 请求之前

| 错误类 | 触发条件与携带字段 |
| :--- | :--- |
| `UnsupportedParameterError` | 模型不接受的 `UniConfig` 值（指明客户端与参数）。`thinking_level` 不得属此类（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#63-思考等级) §6.3）。 |
| `UnsupportedContentError` | 格式正确但模型不接受的内容项。 |
| `InvalidMessageError` | 无法按原样发送的消息（适用时带 `item_type` 与 `message_index`）：未知内容项、缺 `tool_call_id` 的工具结果、非法 base64 图片、无说话人标签的 TTS 脚本或空消息。 |
| `UnsupportedOperationError` | 客户端根本无法执行的操作。 |
| `ConcurrentCallError` | 重叠的有状态调用（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#62-同一时间只有一次有状态调用) §6.2）。 |
| `RoutingError` | 未知或无法路由的模型 ID（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#4-按模型-id-路由) §4）。 |
| `ApiKeyRequiredError` | 构造函数缺少凭据（[MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md#4-解析规则) §4）。 |

### 3.2 流内部

在内容项或 `stop` 本该出现的位置抛出（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5）：

| 错误类 | 触发条件与携带字段 |
| :--- | :--- |
| `ToolCallArgumentParseError` | 流式工具调用参数无法解析为 JSON 对象。 |
| `EmptyResponseError` | 响应无任何内容项，或仅有思考内容项。 |
| `IncompleteStreamError` | 流结束时缺少用量（usage）或结束原因（finish reason）。 |
| `StreamProtocolError` | 客户端违反流语法。 |
| `ProviderStreamError` | 服务商在已打开的流中报告、而其 SDK 不抛出的错误：Interactions API 的 `error` 事件，或下载生成图像 `url` 时的 HTTP 错误状态（状态码存为 `code`）。 |
| `UnknownEventError` | 设置 `MMSP_DEBUG` 时遇到无法识别的事件（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1）。 |

### 3.3 内置基类

- **所有错误类**：在 Python 中必须是 `ValueError`，在 TypeScript 中必须是 `Error`。
- **`ProviderStreamError`**：在 Python 中同时也是 `RuntimeError`。

## 4. 经由服务端转发

- **`MMSPError` 子类**：MMSP 服务端转发每个 MMSP 错误时都必须保留其字段（`to_wire_error` / `toWireError`）；`mmsp` 客户端抛出 `UpstreamError`，以 `error_type` 指明错误类，以 `error` 携带字段。
- **厂商 SDK 异常**：原样传播；服务端按类名转发，并在 SDK 保留了上游 HTTP 状态码时一并附上。

## 5. 新增错误类

- **同步注册与导出**：新增错误类必须在同一改动中加入 `to_wire_error` / `toWireError` 及两个包的导出。

## 6. Conformance

- **定义与协议转发**：`src_py/mmsp/errors.py`、`src_ts/src/errors.ts`、`src_py/mmsp/wire.py`、`src_ts/src/wire.ts`。
- **服务端转发与基类测试**：`src_py/tests/test_mmsp_server.py` 与 `src_ts/tests/mmsp-server.test.ts` 转发每个 `MMSPError` 子类，验证覆盖 `errors` 定义的全部类，并检查导出与 §3.3 内置基类。
- **抛出位置断言**：`test_stream_protocol.py`、`test_message_order.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_env_credentials.py`、`test_image_detail.py`、`test_client.py`、`test_list_models.py` 及其对应 Jest 测试。
- **零裸错误检查**（在 `integration/` 之外无匹配结果）：
  - `grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp`
  - `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`
