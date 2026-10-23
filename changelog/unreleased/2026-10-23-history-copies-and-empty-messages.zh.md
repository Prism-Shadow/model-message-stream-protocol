# 历史记录保存副本、一次一个有状态调用、没有可发送内容的消息

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `base_client`, `mmsp`, `openai_embedding`
- **Breaking:** yes — `get_history()` 与 `set_history()` 对历史记录做深拷贝；一个有状态调用尚未结束时再调用 `streaming_response_stateful` 会抛出 `ConcurrentCallError`；客户端没有任何可发送内容的消息，在原先被丢弃或以空内容发送的地方抛出 `InvalidMessageError`

[English](2026-10-23-history-copies-and-empty-messages.md)

## 变更内容

- `streaming_response_stateful` / `streamingResponseStateful` 记录的是所发送消息与助手消息的深拷贝，`get_history` / `getHistory` 返回深拷贝，`set_history` / `setHistory` 也存储一份深拷贝，因此历史记录与调用方以及已产出的事件不共享任何对象。Python 使用 `copy.deepcopy`；TypeScript 使用一个让 `Buffer` 仍是 `Buffer` 的拷贝，因为 `structuredClone` 会把它变成普通的 `Uint8Array`。
- 同一客户端上另一个有状态调用尚未结束时，`streaming_response_stateful` 在发送任何内容之前抛出 `ConcurrentCallError`。一个调用在其 `stop` 事件处（本轮记录之后）、在其错误处、或在其生成器关闭时结束。`AutoLLMClient` 只做转发，因此由被包装的客户端持有该调用；`streaming_response` 不受影响。
- 对于经旧格式规范化后 `content_items` 为空的消息，`streaming_response` 在请求发出之前抛出带 `message_index` 的 `InvalidMessageError`。
- 每个消息转换在消息的线路形式为空或只有思考时抛出 `InvalidMessageError`（`message <i> has nothing <Client> can send`）：`openai_chat`（因而 `openai_chat_vllm_adapter`）、`zai_official` 与 `moonshot_official` 在原先丢弃它的地方；`anthropic_official`（消息以 `once its unsigned thinking is left out` 结尾）与 `ant_messages` 在原先发送 `content: []` 或只有 thinking 块的地方；`openai_official`、`openai_responses`、`deepseek_official` 与 `minimax_official` 在消息没有产出任何条目或只产出 reasoning 条目的地方；`google_official` 在没有产出任何 step 或只产出 thought step 的地方；`google_genai` 在原先发送 `parts=[]` 或只有 thought part 的地方；`openai_embedding` 在原先为没有文本的消息发送 `" "` 的地方。
- `openai_embedding` 按每个向量的 `index` 把它与输入配对，而不再按 `data` 的顺序。
- `mmsp` 客户端通过基类的 `_stamp_created_at` / `stampCreatedAt` 为没有 `created_at` 的消息补上时间戳；当服务端的流在 `stop` 事件之前结束（无论是 `[DONE]` 还是响应体结束）时，抛出 `IncompleteStreamError`（`missing` 为两个字段），因此其有状态调用不记录任何内容。
- Python 为 `created_at` 为 `None` 的消息补上时间戳，与 TypeScript 对 `null` 的处理一致；移除了 Python `LLMClient` 类级别的 `_history = []` 默认值。
- `test_stream_protocol.py` / `stream-protocol.test.ts` 覆盖调用后调用方的消息、历史记录隔离、重叠的有状态调用、从给定历史开始的多轮运行、空消息以及向量顺序；`test_message_order.py` / `message-order.test.ts` 覆盖每个客户端上的空消息与只有思考的消息；`test_mmsp_server.py` / `mmsp-server.test.ts` 覆盖 `stop` 之前的 `[DONE]` 以及经 `mmsp` 客户端的 `created_at`。
- 网站的客户端页面说明了历史记录副本、一次一个有状态调用，以及会抛出错误的消息。

## 兼容性

- 通过 `set_history()` / `setHistory()` 修改已记录的历史：修改 `get_history()` 返回的消息，或修改传给 `set_history()`、`streaming_response_stateful()` 的消息，不再改变历史记录。
- 每个客户端一次只运行一个有状态调用：在下一次 `streaming_response_stateful` 之前，把流读到 `stop` 事件，或将其关闭（Python 中 `await stream.aclose()`；TypeScript 中调用 `return()` 或离开 `for await`）。并发的多个对话各用一个客户端，或使用无状态的 `streaming_response`。
- 从要发送的列表中去掉空消息或只有思考的消息；`InvalidMessageError.message_index` / `messageIndex` 指明是哪一条。用于嵌入时，不要发送没有文本的消息。
