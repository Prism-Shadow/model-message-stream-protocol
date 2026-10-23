# 带类型的错误类，经 MMSP 服务端连同字段一起转发

- **Date:** 2026-10-23
- **Type:** feature
- **Scope:** `errors`, `wire`

[English](2026-10-23-typed-error-classes.md)

## 变更内容

- 在 `errors.py` / `errors.ts` 中新增 `RoutingError`、`InvalidMessageError`、`UnsupportedContentError`、`UnknownEventError`、`ProviderStreamError` 与 `ConcurrentCallError`，并从 `mmsp` 与 `@prismshadow/mmsp` 导出。它们都是 `MMSPError`，因此在 Python 中是 `ValueError`，在 TypeScript 中是 `Error`；在 Python 中 `ProviderStreamError` 同时也是 `RuntimeError`。
- `ApiKeyRequiredError` 接受 `base_url=None` / `baseUrl: null`，用于完全没有拿到 key 的客户端，此时消息为 `<P>_API_KEY is required for <Client>: pass api_key or set <P>_API_KEY.`（TypeScript 中为 `apiKey`）。
- `to_wire_error` / `toWireError` 连同字段发送每一个 MMSP 错误：在原有的六个之外加入六个新类、`ApiKeyRequiredError` 与 `UpstreamError`，因此 `mmsp` 客户端的 `UpstreamError` 在 `error_type` / `errorType` 中给出类名，并在 `error` 中带上其字段。
- `test_mmsp_server.py` / `mmsp-server.test.ts` 让每个 `MMSPError` 子类都经 MMSP 服务端转发一次，在 `mmsp` 客户端检查其 `error_type` 与字段，并检查每个类都已导出、能被 `ValueError` / `Error` 捕获，`ProviderStreamError` 也能被 `RuntimeError` 捕获。
- 网站的错误页面以及 `mmsp-python`、`mmsp-typescript` 两个 skill 的 API 参考列出了新增的类。

## 错误类

| 类 | 何时抛出 | Python 字段 | TypeScript 字段 |
| --- | --- | --- | --- |
| `RoutingError` | 客户端类型和模型 id 都没有指明客户端 | `model`、`client_type` | `model`、`clientType` |
| `InvalidMessageError` | 消息无法按原样发送：未知内容项、没有 `tool_call_id` 的工具结果、无效图片、缺少说话人标签的 TTS 脚本、没有任何可发送内容的消息 | `client`、`item_type`、`message_index` | `client`、`itemType`、`messageIndex` |
| `UnsupportedContentError` | 格式正确、但模型无法接收的内容项 | `client`、`item_type` | `client`、`itemType` |
| `UnknownEventError` | 设置了 `MMSP_DEBUG` 时，客户端不认识的线路事件 | `client`、`event`（预览，首尾各保留 72 个字符） | `client`、`event` |
| `ProviderStreamError` | 服务商在已打开的流中报告的错误 | `client`、`code` | `client`、`code` |
| `ConcurrentCallError` | 同一客户端上一次有状态调用尚未结束时发起的有状态调用 | `client` | `client` |
