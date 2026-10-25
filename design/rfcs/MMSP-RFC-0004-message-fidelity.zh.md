# MMSP-RFC-0005 重要字段不能丢弃

- Feature Name: `essential_fields`
- Start Date: 2026-10-24
- RFC PR: [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)
- Kind: rule

[English](MMSP-RFC-0005-essential-fields.md)

## Summary
[summary]: #summary

流报告的内容要到达调用方：客户端走完的一条流，以一个 `stop` 事件结束，它的 `usage_metadata` 是一个对象，`finish_reason` 有值，由这条流构建的助手消息同时带有这两项。模型需要拿回的内容要发回去：客户端回传它自己的模型产生的思考时，带上该模型从这段思考继续所需的一切，回传每个工具调用时都带上服务商的调用 id。另一个模型或端点产生的思考，按服务商接受它的形式发回，在服务商拒绝它的地方则略去；它绝不作为助手自己的文本发回。

## Motivation
[motivation]: #motivation

调用方只能从 `stop` 事件读到一次请求的开销，存储的历史把每个回合的开销记在它的助手消息上。2026-10-22，CI 中一条 GLM-5.3-Flash 的流在携带用量的数据块到达之前就结束了（[run 39841678668](https://github.com/Prism-Shadow/model-message-stream-protocol/actions/runs/39841678668)）。对同一请求的探测表明，服务商的最后一个数据块每次都同时携带结束原因和用量，因此那是一条中途断开的流，而这正是调用方想要重试的情况（[#272](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/272)）。

每个推理模型在工具调用循环中缺了先前的思考都会退化，有几个还会拒绝请求：
- 调用过工具的回合缺少 `reasoning_content` 时，DeepSeek 返回 400；
- 一步中的第一个调用缺少思考签名时，Gemini 3 返回 400；
- Claude 5.5 拒绝被部分略去的思考块。

项目负责人的要求是：消息转成 `UniMessage` 再转回去以后，不丢失模型需要的任何东西，首先是它的思考。2026-10-22 的审查在每个官方客户端上运行了一个带思考与工具调用的回合及其回传，发现了这一点不成立的两处（[#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268)、[#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)）。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0010 与 MMSP-RFC-0011。

## Rule
[rule]: #rule

- **用量与结束原因。** 客户端的 `stop` 事件在线上报告用量和结束原因的地方携带它们，可以分几次携带。基类把这些部分逐字段合并进唯一的公开 `stop`：后到的计数替换先到的，0 仍然是 0。服务商不报告的计数为 `None`；不要求任何计数必须是数字。
- **embedding。** embedding 请求先以内容项流出它的向量，然后是一个 `stop`，以 `prompt_tokens` 携带端点报告的输入计数，`finish_reason` 为 `stop`。`openai-embedding` 按向量的 `index` 把每个向量与它的输入对应起来。
- **`IncompleteStreamError`。** 服务商的流缺少用量或结束原因就结束时，在它之前的事件之后、原本 `stop` 的位置抛出 `IncompleteStreamError`，因此调用方不会看到缺少这两项的 stop，历史也不会记录这一回合。这个错误指明客户端与缺少的一个或多个字段，并携带已经到达的用量或结束原因，好让这些 token 仍能计入。它不是 `StreamProtocolError`，那是客户端的缺陷；也不是 `EmptyResponseError`，那是没有内容的响应（[MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md)）。
- **复制到助手消息上。** `concat_uni_events_to_uni_message`、有状态的历史与 tracer 把 `stop` 事件的 `usage_metadata` 和 `finish_reason` 复制到助手消息上。调用方手工构建的消息可以两者都不带。
- **`mmsp` 客户端：**
  - 原样转发其服务端的 `stop`；
  - 服务端的流在 `stop` 之前结束时，自己抛出 `IncompleteStreamError`；
  - 服务端的 `IncompleteStreamError` 以 `UpstreamError` 的形式到达它，带有该 `error_type` 以及这个错误的各个字段。
- **每种线上格式需要发回的**，就是客户端记录下来的（[MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)）：
  - Responses 推理内容项的通道与 `encrypted_content`，以及网关附加的 `signature` 与 `format`；
  - Messages 思考块的 `signature`，以及 redacted 思考块的 `data`；
  - Interactions 思考步骤的签名；
  - generateContent 中 part 的 `thought_signature`，放回它当初所在的那个 part；
  - Chat Completions 回合的推理字段名，文本放在该字段中。字段名未知时两个字段都放；对话已经产生过该字段之后，在只做工具调用、没有思考的回合中放空值；
  - 网关加密的推理块，以 `encrypted_content`、`format` 与 `reasoning_id` 记录，回传时重建。

  一个字段只有在探测表明缺了它请求会失败或模型会退化时，才能加入这份清单。
- **来自别处的思考。** 范围是同一模型、同一端点。对于在别处产生的思考：
  - `anthropic-official` 略去不带签名的思考内容项，与 API 对模型无法读取的思考块的处理一致；
  - 回传给 Gemini 时把文本保留为不带签名的思考，并在 API 校验签名的地方放上 Google 文档给出的占位签名：`google-official` 用它开启这一回合，`google-genai` 用它为这一回合的第一个调用签名；
  - Chat Completions 的回传把文本放进两个推理字段；
  - Responses 的回传重建一个推理内容项，文本作为 `reasoning_text`；
  - 经由兼容客户端 `ant-messages` 时，不带签名的思考内容项以不带签名的形式发回。这是第三方 Messages 服务端接受的形式；Anthropic 自己的 API 会拒绝它。

  它们都不会把这段思考放进助手的文本。
- **只有思考。** 只有思考、别无其他内容的响应不会被记录，因为没有服务商接受它回传：它抛出 `EmptyResponseError`。
- **`tool_call_id`** 在线上格式带有调用 id 时保存服务商的调用 id，回传时发回。线上格式同时带有内容项 id 和调用 id 时，它保存的是调用 id，结果依靠调用 id 对应到它的调用。不带 `tool_call_id` 的工具结果抛出 `InvalidMessageError`（[MMSP-RFC-0009](MMSP-RFC-0009-typed-errors.zh.md)）。
- **`mmsp` 客户端**把内容项及其 `fidelity` 原样发给它的服务端，因此服务端的上游客户端按上述方式回传它们。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`，它们构建唯一的 `stop`，并在缺少字段时于它的位置抛出异常。
- `src_py/mmsp/errors.py` / `src_ts/src/errors.ts` 中的 `IncompleteStreamError`，以及它在 `wire.py` / `wire.ts` 中的分支。
- 各客户端的消息转换，以及它们在事件转换中记录的 fidelity。
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，共享的 e2e 测试用它检查每一条流。
- `test_stream_protocol.py`、`test_unknown_events.py`、`test_empty_response.py`、`test_mmsp_server.py`、`test_reasoning_fidelity.py`、`test_reasoning_replay_without_thinking.py`、`test_message_order.py`、`test_tool_call_arguments.py` 及其对应的 Jest 测试。
- `test_client.py` / `client.test.ts` 中工具调用用例的第二轮，它回传清单中每个模型做出工具调用的那一回合，连同其中的思考。
