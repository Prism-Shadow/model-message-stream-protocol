# 两个包中每一处裸异常都改为 MMSP 错误类

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `errors`, `clients`, `auto_client`, `utils`, `tests`
- **PR:** [#290](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/290)

[English](2026-10-23-typed-error-sites.md)

## 变更内容

- `src_py/mmsp` 与 `src_ts/src` 中 `integration/` 之外，凡是抛出裸 `ValueError` / `RuntimeError` / `NotImplementedError` 或裸 `Error` 的地方，都改为抛出对应的 MMSP 错误类，并填好该类的字段。每个类都是 `MMSPError`，因此在 Python 中是 `ValueError`，在 TypeScript 中是 `Error`；在 Python 中 `ProviderStreamError` 同时也是 `RuntimeError`。
- 消息文本保持不变，只有由错误类自行拼出消息的两处例外：四个基于 OpenAI SDK 的厂商客户端缺少 key 时，消息由 `<P>_API_KEY is required for <Client>.` 变为 `<P>_API_KEY is required for <Client>: pass api_key or set <P>_API_KEY.`（TypeScript 中为 `apiKey`）；设置 `MMSP_DEBUG` 时遇到不认识的线路事件，消息由 `Unknown output: <event>` 变为 `<Client> does not recognize the event <preview>`。
- `utils` 中的 `speaker_turns` / `speakerTurns` 增加第三个参数，即客户端名称，供其抛出的错误使用。
- `AutoLLMClient._streaming_response_internal` 改为抛出 `UnsupportedOperationError`，不再抛出 `NotImplementedError`（Python）；TypeScript 的 `_streamingResponseInternal` 也改为抛出它，不再抛出 `Error`。
- `test_message_order.py` / `message-order.test.ts` 在每个客户端上检查：缺少 `tool_call_id` 的工具结果和未知类型的内容项都会抛出带 `item_type` 的 `InvalidMessageError`；未知事件、凭据、图片 detail 与路由的测试断言新的错误类，并断言它仍是被取代的那个内置错误。
- mmsp-dev skill 为每一种拒绝写明对应的错误类；`mmsp-python` 与 `mmsp-typescript` 两个 skill 的 API 参考写明：不属于任何已知家族的模型 id 抛出 `RoutingError`。

## 抛出场景

| 场景 | 类 | 字段 |
| --- | --- | --- |
| 未知的客户端类型、不属于任何已知家族的模型 id、没有对应类的客户端类型（`auto_client`） | `RoutingError` | `model`、`client_type`（没有指定时为 `None`） |
| 把 Vertex AI 服务账号 key 交给 `google_official` | `RoutingError` | `model`、`client_type="google-official"` |
| `deepseek_official`、`minimax_official`、`moonshot_official`、`zai_official` 没有 key | `ApiKeyRequiredError` | `client`、`client_type`、`base_url=None` |
| 图片不是合法的 base64，或无法获取 | `InvalidMessageError` | `client`、`item_type="image_url"` |
| 缺少 `tool_call_id` 的工具结果 | `InvalidMessageError` | `client`、`item_type="tool_result"` |
| 未知类型的内容项 | `InvalidMessageError` | `client`、`item_type` 为该内容项的类型 |
| 缺少说话人标签的双人 TTS 脚本 | `InvalidMessageError` | `client`、`item_type="text"` |
| 只支持文本的 DeepSeek 或 GLM 模型收到图片（在消息中或在工具结果中） | `UnsupportedContentError` | `client`、`item_type="image_url"` / `"tool_result"` |
| Gemini TTS 或 OpenAI embeddings 收到文本以外的内容项 | `UnsupportedContentError` | `client`、`item_type` 为该内容项的类型 |
| 设置了 `MMSP_DEBUG` 时不认识的线路事件 | `UnknownEventError` | `client`、`event` |
| Gemini Interactions 的 `error` 事件 | `ProviderStreamError` | `client`、`code` |
| `AutoLLMClient` 内部的流式方法 | `UnsupportedOperationError` | `client="AutoLLMClient"`、`operation` |
