# MMSP-RFC-0009 异常要有类型

- Feature Name: `typed_errors`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[English](MMSP-RFC-0009-typed-errors.md)

## Summary
[summary]: #summary

MMSP 抛出的每个错误都是 `errors.py` / `errors.ts` 中的 `MMSPError` 子类，以出错的事情命名，并携带它的字段。除中止错误外（[MMSP-RFC-0012](MMSP-RFC-0012-interruptible-requests.zh.md)），`integration/` 之外的代码不会抛出裸的内置错误。MMSP 服务端转发每个 MMSP 错误时都带上它的字段，所以 `mmsp` 客户端抛出的 `UpstreamError` 以 `error_type` 指明错误类，以 `error` 携带这些字段。

## Motivation
[motivation]: #motivation

处理拒绝的调用方需要一个能捕获的类，在两个包中、经由服务端时都一样；裸的 `ValueError` 或 `Error` 无法与缺陷区分开。写下第一版规则时做的审查发现，两个 Google 客户端都用裸错误拒绝 `tts_config`（[#269](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/269)）。2026-10-23 的审查又发现了约六十处，从缺少 `tool_call_id` 的工具结果，到发给纯文本模型的图片。项目负责人随后把规则从被拒绝的值扩大到每一个错误（[#288](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/288)、[#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)）。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0007。

## Rule
[rule]: #rule

- **请求之前：**
  - `UnsupportedParameterError`：模型无法接受的 `UniConfig` 值，指明客户端与参数。`thinking_level` 从不属于此类（[MMSP-RFC-0010](MMSP-RFC-0010-thinking-levels-usable.zh.md)）。
  - `UnsupportedContentError`：格式正确、但模型无法接受的内容项。
  - `InvalidMessageError`：无法按原样发送的消息，适用时带有 `item_type` 与 `message_index`。例如未知的内容项、缺少 `tool_call_id` 的工具结果、不是合法 base64 或无法获取的图片、没有说话人标签的 TTS 脚本、没有可发送内容的消息。
  - `UnsupportedOperationError`：客户端根本无法执行的操作。
  - `ConcurrentCallError`（[MMSP-RFC-0008](MMSP-RFC-0008-immutable-history.zh.md)）。
  - `RoutingError`（[MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.zh.md)）。
  - 构造函数抛出的 `ApiKeyRequiredError`（[MMSP-RFC-0007](MMSP-RFC-0007-credential-scope.zh.md)）。
- **流内部**，出现在内容项或 `stop` 本该出现的位置：
  - `ToolCallArgumentParseError`；
  - `EmptyResponseError`；
  - `IncompleteStreamError`（[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md)）；
  - `StreamProtocolError`，客户端违反了流语法（[MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.zh.md)）；
  - `ProviderStreamError`，服务商在已打开的流中报告的错误；
  - `UnknownEventError`，设置了 `MMSP_DEBUG` 时无法识别的事件。
- **每个错误类**仍然是它所取代的内置错误：Python 中是 `ValueError`，TypeScript 中是 `Error`，`ProviderStreamError` 同时也是 `RuntimeError`。
- **新增的错误类**在同一个改动中加入 `to_wire_error` / `toWireError` 和两个包的导出。厂商 SDK 自己的异常原样传播，服务端按类名转发它们。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/errors.py`、`src_ts/src/errors.ts`。
- `src_py/mmsp/wire.py` / `src_ts/src/wire.ts`。
- `src_py/tests/test_mmsp_server.py` / `src_ts/tests/mmsp-server.test.ts`。它们让每个 `MMSPError` 子类经由服务端转发，检查这些用例覆盖了 `errors` 定义的每一个类，并检查每个类都已导出，且能作为它所取代的内置错误被捕获。
- `test_stream_protocol.py`、`test_message_order.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_env_credentials.py`、`test_image_detail.py`、`test_client.py`、`test_list_models.py` 及其对应的 Jest 测试，它们在每一类抛出位置断言错误类。
- 评审时用两条 grep 检查，它们在 `integration/` 之外找不到任何结果：`grep -rnE "raise (ValueError|RuntimeError|NotImplementedError|TypeError|KeyError|Exception)\b" src_py/mmsp` 与 `grep -rnE "throw new (Error|TypeError|RangeError)\b" src_ts/src`。
