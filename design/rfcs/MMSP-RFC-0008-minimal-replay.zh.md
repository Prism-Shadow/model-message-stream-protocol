# MMSP-RFC-0008 回传最小化，fidelity 是例外通道

- Feature Name: `minimal_replay`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0008-minimal-replay.md)

## Summary
[summary]: #summary

客户端回传助手回合时，依据其内容项的通用字段和 `fidelity` 重建请求，只额外补上服务商对回合所缺部分要求的替代内容（一个占位的思考签名、一个空的推理字段）。`fidelity` 只存放没有通用字段承载、回传时又要发回的线上数据，例如思考签名、加密的推理内容、phase，或严格的上游要求的推理字段名；它绝不存放服务商会重新生成或忽略的 id，也绝不复制通用字段的内容。使用方把它当作不透明数据，原样传回。

## Motivation
[motivation]: #motivation

回传的回合必须被 API 接受，且模型的行为不受影响；它不必逐字段重现线上的内容项，而每一个照搬进 `fidelity` 的字段，都是使用方、trace 与历史记录要多携带的一种服务商结构。`fidelity` 在 [#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) 中加入，用来承载严格的上游要求原样发回的推理字段；此后，一个字段只有在探测表明缺了它请求会失败或模型会退化时，才能放进去。[#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268) 处理的是缺少 Claude 所要求签名的思考内容项：回传时略去它，而不是让请求失败；回传必须保留什么、来自另一模型的思考变成什么，见 [MMSP-RFC-0011](MMSP-RFC-0011-thinking-round-trip.zh.md)。

## Rule
[rule]: #rule

- 本规则规定回传可以携带什么；[MMSP-RFC-0011](MMSP-RFC-0011-thinking-round-trip.zh.md) 规定必须保留什么，[MMSP-RFC-0012](MMSP-RFC-0012-direct-conversion.zh.md) 规定此外不保留任何东西。
- 在流中，一个内容项最多只有一个 delta 携带它的 fidelity，该内容项的 `.done` 会再带一次。
- Claude 只接受带有它自己签发的签名的思考块，因此 `anthropic-official` 回传时略去不带签名的思考内容项；其他服务商对不是自己产生的思考的接受形式，见 [MMSP-RFC-0011](MMSP-RFC-0011-thinking-round-trip.zh.md)。
- 线上格式带有调用 id 时，`tool_call_id` 保存服务商的调用 id，回传时发回；线上格式同时带有内容项 id 和调用 id 时，它保存的是调用 id，结果依靠调用 id 对应到它的调用。

## Enforced by
[enforced-by]: #enforced-by

`types.py` / `types.ts` 中的 `Fidelity`；`StreamItems`，它让每个内容项只有一份 fidelity，并去掉 `item_id`；各客户端的消息转换；`src_py/tests/test_reasoning_fidelity.py`、`test_reasoning_replay_without_thinking.py`、`test_tool_call_arguments.py` 及其对应的 Jest 测试。
