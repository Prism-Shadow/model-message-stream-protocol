# 流可立即停止：中止、关闭生成器或离开循环都会关闭发往服务商的请求

- **Date:** 2026-10-23
- **Type:** fix
- **Scope:** `base_client`, `auto_client`, `ant_messages`, `anthropic_official`, `deepseek_official`, `google_genai`, `google_official`, `minimax_official`, `moonshot_official`, `openai_chat`, `openai_official`, `openai_responses`, `zai_official`, `integration`

[English](2026-10-23-interruption.md)

## 变更内容

- Python 的 `streaming_response` 在每次读取前重新取得正在读取的任务，不再每个流只取一次，因此中止会取消正在进行的读取，无论它运行在哪个任务里，包括 MMSP 服务端与 playground 为每个事件单独启动的任务。没有读取在进行时的中止会立即关闭客户端的流，不再等到调用方下一次读取。恰在服务商的流结束时到达的中止仍抛出 `asyncio.CancelledError`，不发出 done 项，也不发出 `stop`。
- 每个 Python 客户端都在 `async with stream:` 内遍历 SDK 的流，因此关闭客户端的生成器（`aclose()`、离开 `async for`、中止）会关闭 HTTP 响应。`AutoLLMClient.streaming_response` 与 `streaming_response_stateful` 在关闭自身生成器时一并关闭客户端的生成器（`contextlib.aclosing`）。
- Python 的 `GoogleGenaiClient` 在自己的流被关闭时，关闭其 `generate_content_stream` 请求打开的 HTTP 响应；这些响应由它交给 SDK 的 httpx 客户端的响应事件钩子收集。此前仅关闭 SDK 的流，连接会一直保持到垃圾回收运行。
- TypeScript 的 `streamingResponse` 在客户端的流结束而信号已中止时抛出信号的 reason。openai 与 anthropic SDK 静默结束的中止以中止的形式到达调用方，默认是名为 `AbortError` 的 `DOMException`；此前它表现为若干 `.done` 项再加 `IncompleteStreamError`，或在用量与结束原因已经到达时表现为一个 `stop`，从而记录该轮并保存其 trace。
- TypeScript 的 `GoogleGenaiClient` 用自己的 `AbortController` 的信号发送 `generateContentStream`：调用方的信号中止时、客户端的生成器被关闭时都会中止它，因此 `return()` 与离开 `for await` 会关闭连接；被中止的流抛出信号的 reason，而不是 SDK 自己的 `AbortError`。
- Python 的 MMSP 服务端与 playground 发现调用方离开后，先中止信号，等待进行中的读取结束，再关闭流，因此一旦察觉断开，上游请求就会关闭；服务端仍在写入失败时察觉断开，即下一个事件或下一次 keep-alive 时。
- `test_interruption.py` / `interruption.test.ts` 让每种客户端以无状态与有状态两种方式，从一个发送三个增量后便静默的本地上游读取流，检查以下情况下连接在 200 ms 内关闭：调用方等待时中止、调用方忙碌时中止、`aclose()` / `return()`、离开循环；并检查调用方得到中止错误、没有 done 项也没有 `stop`，且没有任何记录或 trace。`test_abort_signal.py` 覆盖另一个任务正在读取时的中止以及流结束时的中止，`test_mmsp_server.py` 覆盖静默期间上游关闭，`mmsp-server.test.ts` 覆盖中止时静默结束的上游。单元测试中替代 SDK 流的对象改为客户端可用 `async with` 进入的流。

## 被中断的流

| 调用方 | Python | TypeScript |
| --- | --- | --- |
| 中止信号 | 已到达的增量，然后是携带信号 reason 的 `asyncio.CancelledError` | 已到达的增量，然后是信号的 reason |
| 关闭生成器或离开循环 | 已读取的增量，此后没有更多内容 | 已读取的增量，此后没有更多内容 |

无论哪种情况，正在进行的项都不会得到 `.done`，不会发出 `stop`，历史中不追加任何内容，也不保存 trace。
