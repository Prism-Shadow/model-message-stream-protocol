# MMSP-RFC-0011 思考经往返转换不丢失

- Feature Name: `thinking_round_trip`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0011-thinking-round-trip.md)

## Summary
[summary]: #summary

客户端回传它自己的模型在它自己的端点上产生的思考时，带上该模型从这段思考继续所需的一切：经由当初承载它的字段或通道发回的文本，记录在 `fidelity` 中的签名、加密的推理内容或推理字段名，以及服务商对一个做了工具调用却没有思考的回合所要求的空推理字段；请求被接受，模型的行为不受影响。另一个模型或端点产生的思考，按服务商接受非自身所产生思考的形式发回，在服务商拒绝它的地方则略去；它绝不作为助手自己的文本发回。

## Motivation
[motivation]: #motivation

每个推理模型在工具调用循环中缺了先前的思考都会退化，有几个还会拒绝请求：调用过工具的回合缺少 `reasoning_content` 时，DeepSeek 返回 400；一步中的第一个调用缺少思考签名时，Gemini 3 返回 400；Claude 5.5 拒绝被部分略去的思考块；OpenAI、Kimi、GLM 与 MiniMax 的文档写明了质量的损失（见 `llmsdk_docs/` 下的快照）。[MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.zh.md) 规定回传可以携带什么；本规则规定它必须保留什么，这正是项目负责人提出的要求：客户端的消息转成 `UniMessage` 再转回去以后，不丢失模型需要的任何东西，首先是它的思考。写下这条规则时做的审查于 2026-10-22 在每个官方客户端上运行了一个带思考与工具调用的回合及其回传，发现这句话不成立的两处：回传给 Claude 一个不带签名的思考内容项，已在 [#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268) 修复；OpenRouter 上的 Chat Completions 客户端从不读取 `reasoning_details`，而在这条路由上，GPT 加密的推理内容与 Gemini 的思考签名正是由它承载，已在 [#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273) 中修复。

## Rule
[rule]: #rule

- 每种线上格式需要发回的，就是客户端记录下来的：Responses 推理内容项的通道、`encrypted_content`，以及网关附加的 `signature` 与 `format`；Messages 思考块的 `signature`，以及 redacted 思考块的 `data`；Interactions 思考步骤的签名；generateContent 中 part 的 `thought_signature`，放回它当初所在的那个 part；Chat Completions 回合的推理字段名，文本放在该字段中，字段名未知时两个字段都放，对话已经产生过该字段之后，在只做工具调用、没有思考的回合中放空值；网关加密的 `reasoning_details` 片段，按收到的原样。一个字段只有在探测表明缺了它请求会失败或模型会退化时，才能加入这份清单（[MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.zh.md)）。
- 范围是同一模型、同一端点。来自别处的思考：`anthropic-official` 略去不带签名的思考内容项，与 API 对模型无法读取的思考块的处理一致；回传给 Gemini 时以 Google 文档给出的占位签名开启这一回合，并把文本保留为不带签名的思考；Chat Completions 的回传把文本放进两个推理字段；Responses 的回传重建一个 `reasoning_text` 内容项。它们都不会把这段思考放进助手的文本。
- 经由兼容客户端 `ant-messages` 时，不带签名的思考内容项以不带签名的形式发回，这是第三方 Messages 服务端接受的形式；Anthropic 自己的 API 会拒绝它。
- 只有思考、别无其他内容的响应不会被记录，因为没有服务商接受它回传：它抛出 `EmptyResponseError`（[MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.zh.md)）。
- `mmsp` 客户端把内容项及其 `fidelity` 原样发给它的服务端，因此服务端的上游客户端按上述方式回传它们。

## Enforced by
[enforced-by]: #enforced-by

各客户端的消息转换，以及它们在事件转换中记录的 fidelity；`src_py/tests/test_reasoning_fidelity.py`、`test_reasoning_replay_without_thinking.py`、`test_message_order.py` 及其对应的 Jest 测试；`test_client.py::test_tool_use` / `client.test.ts` 的第二轮，它回传模型清单中每个模型的思考回合。
