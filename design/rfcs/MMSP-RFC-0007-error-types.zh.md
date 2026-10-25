# MMSP-RFC-0007 异常类型

- Feature Name: `error_types`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[English](MMSP-RFC-0007-error-types.md)

## Abstract

在 `integration/` 之外，除中止错误外，MMSP 抛出的每个错误都是 `errors.py` / `errors.ts` 中的 `MMSPError` 子类，以出错的事情命名，并携带它的字段。本文规定这些错误类、各自在哪里抛出、它们属于哪些内置异常、MMSP 服务端怎样转发它们，以及怎样新增一个错误类。

## 1. Introduction

处理拒绝的调用方需要一个能捕获的类，在两个包中、经由服务端时都一样；裸的 `ValueError` 或 `Error` 无法与缺陷区分开。写下第一版规则时做的审查发现，两个 Google 客户端都用裸错误拒绝 `tts_config`（[#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)）。2026-10-23 的审查又发现了约六十处，从缺少 `tool_call_id` 的工具结果，到发给纯文本模型的图片，项目负责人随后把规则从被拒绝的值扩大到每一个错误（[#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)、[#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)）。本规范最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0007，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0009。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *裸的内置错误*：内置异常类本身的实例，例如 `ValueError`、`RuntimeError` 或 `Error`，而不是 `MMSPError` 子类的实例。
- *中止错误*：Python 中是携带信号原因的 `asyncio.CancelledError`，TypeScript 中是信号的 `reason`（[MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#2-conventions-and-terminology) §2）。

## 3. 错误类

`integration/` 之外的代码不得自己抛出裸的内置错误：除中止错误外，它抛出的都是下列错误类之一。厂商 SDK 的异常、调用方任务的取消这类它只是向外传递的异常，原样传播。

### 3.1 请求之前

- `UnsupportedParameterError`：模型无法接受的 `UniConfig` 值，指明客户端与参数。`thinking_level` 不得属于此类（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#63-思考等级) §6.3）。
- `UnsupportedContentError`：格式正确、但模型无法接受的内容项。
- `InvalidMessageError`：无法按原样发送的消息，适用时带有 `item_type` 与 `message_index`，例如未知的内容项、缺少 `tool_call_id` 的工具结果、不是合法 base64 的图片、没有说话人标签的 TTS 脚本，或没有可发送内容的消息。
- `UnsupportedOperationError`：客户端根本无法执行的操作。
- `ConcurrentCallError`（[MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#62-同一时间只有一次有状态调用) §6.2）；`RoutingError`（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#4-按模型-id-路由) §4）；构造函数抛出的 `ApiKeyRequiredError`（[MMSP-RFC-0006](MMSP-RFC-0006-upstream-credentials.zh.md#4-解析规则) §4）。

### 3.2 流内部

出现在内容项或 `stop` 本该出现的位置（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5）：
- `ToolCallArgumentParseError`：流式传来的工具调用参数无法解析为 JSON 对象；
- `EmptyResponseError`：响应中除了思考没有别的内容项，或者根本没有内容项；
- `IncompleteStreamError`：流结束时缺少用量或结束原因；
- `StreamProtocolError`：客户端违反了流语法；
- `ProviderStreamError`：服务商在已打开的流中报告、而它的 SDK 不会抛出的错误，即 Interactions API 的 `error` 事件；
- `UnknownEventError`：设置了 `MMSP_DEBUG` 时无法识别的事件（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1）。

### 3.3 内置基类

每个错误类都必须在 Python 中是 `ValueError`、在 TypeScript 中是 `Error`；`ProviderStreamError` 在 Python 中同时也是 `RuntimeError`。

## 4. 经由服务端转发

MMSP 服务端转发每个 MMSP 错误时都必须带上它的字段（`to_wire_error` / `toWireError`），所以 `mmsp` 客户端抛出的 `UpstreamError` 以 `error_type` 指明错误类，以 `error` 携带这些字段。厂商 SDK 自己的异常原样传播，服务端按类名转发它们，SDK 保留了上游的 HTTP 状态码时一并带上。

## 5. 新增错误类

新增的错误类必须在同一个改动中加入 `to_wire_error` / `toWireError` 和两个包的导出。

## 6. Conformance

- `src_py/mmsp/errors.py`、`src_ts/src/errors.ts`；`src_py/mmsp/wire.py` / `src_ts/src/wire.ts`。
- `src_py/tests/test_mmsp_server.py` / `src_ts/tests/mmsp-server.test.ts`，它们让每个 `MMSPError` 子类经由服务端转发，检查这些用例覆盖了 `errors` 定义的每一个类，并检查每个类都已导出，且属于 §3.3 所说的内置异常。
- `test_stream_protocol.py`、`test_message_order.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_env_credentials.py`、`test_image_detail.py`、`test_client.py`、`test_list_models.py` 及其对应的 Jest 测试，它们在每一类抛出位置断言错误类。
- 评审时用两条 grep 检查，它们在 `integration/` 之外找不到任何结果：`grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp` 与 `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`。
