# MMSP-RFC-0004 消息结构保持精简

- Feature Name: `lean_messages`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[English](MMSP-RFC-0004-lean-messages.md)

## Summary
[summary]: #summary

消息只保存其内容项的通用字段，外加每个内容项回传时需要的 `fidelity`：没有通用字段承载的线上数据，例如思考签名、加密的推理内容、phase，或严格的上游要求的推理字段名；它绝不复制通用字段的内容，绝不存放服务商会重新生成或忽略的 id，也绝不存放任何回传都用不到的字段。客户端回传助手回合时，依据这些字段重建请求，只额外补上服务商对回合所缺部分要求的替代内容（一个占位的思考签名、一个空的推理字段）。使用方把 `fidelity` 当作不透明数据，原样传回。

## Motivation
[motivation]: #motivation

回传的回合必须被 API 接受，且模型的行为不受影响；它不必逐字段重现线上的内容项，而每一个照搬进 `fidelity` 的字段，都是使用方、trace 与历史记录要多携带的一种服务商结构。[#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) 加入 `fidelity`，用来承载严格的上游要求原样发回的推理字段；此后，一个字段只有在探测表明缺了它请求会失败或模型会退化时，才能放进去。[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) 不再整块保存网关的推理块，改为保存重建它所需的三个键。项目负责人的原话是：「转换只保留必要的部分，冗余字段不需要保留」。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0008 与 MMSP-RFC-0012 的后半部分。

## Rule
[rule]: #rule

- 本规则规定消息可以携带什么；[MMSP-RFC-0005](MMSP-RFC-0005-essential-fields.zh.md) 规定必须保留什么。
- 同一种数据在每个客户端的 `fidelity` 中都用同一个名字：`signature`、`encrypted_content`、`format`、`channel`、`phase`、`reasoning_field`、`reasoning_id`。客户端绝不以线上格式自己的名字整块保存一个线上内容项或一组线上内容项。`reasoning_id` 只为网关加密的推理块保存，网关需要拿回这个块的 id。
- `StreamItems` 在内容项发出之前去掉 `fidelity.item_id`。`item_id` 是客户端在流式过程中用来标识自己内容项的 id，因此它不会出现在使用方、trace 或历史记录中。
- 客户端记录了、却没有任何回传使用的字段要删除，而不是保留。早先版本在内容项内部记录的那些形状，读取到 0.6.0 为止（[MMSP-RFC-0013](MMSP-RFC-0013-direct-implementation.zh.md)）。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/types.py` / `src_ts/src/types.ts` 中的 `Fidelity`。
- `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`，它们让每个内容项只有一份 fidelity，并去掉 `item_id`。
- 各客户端的消息转换。
- `src_py/tests/test_reasoning_fidelity.py`，它断言回传发出的推理内容项的确切内容，不带 id，也不带残缺的密文。
- `test_reasoning_replay_without_thinking.py`、`test_tool_call_arguments.py`、`test_stream_protocol.py` 及其对应的 Jest 测试。
- `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，它们拒绝仍带着 `fidelity.item_id` 的内容项。
