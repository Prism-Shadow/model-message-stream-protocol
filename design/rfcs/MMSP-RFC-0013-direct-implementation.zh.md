# MMSP-RFC-0013 实现代码须直观

- Feature Name: `direct_implementation`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[English](MMSP-RFC-0013-direct-implementation.md)

## Summary
[summary]: #summary

客户端只在它的转换方法中做转换，别处不做：每个方法读取 SDK 的类型化事件或交给它的通用内容项，一次遍历完成映射，在线上格式与通用结构之间没有自己的中间层，并且每种输入只接受一种形状。客户端读起来就是对其参考客户端的 diff，读者顺着一次请求或一次响应，就能把整个文件从头读到尾。基类遵守同一条规则：它在 `streaming_response` / `streamingResponse` 中自己从上到下构建公开的流，由 `StreamItems` 为内容项收尾。

## Motivation
[motivation]: #motivation

审阅一个客户端，就是把它当作对其参考客户端的 diff 来看；读者顺着一次请求或一次响应，把整个文件从头读到尾。每多一层辅助函数、每一个接受同一输入两种形状的垫片，都是两种语言彼此走样、服务商的怪癖藏身的地方。项目负责人提出的正是这些话：「转换代码尽量减少抽象，保持易懂」。mmsp-dev skill 原先把这些当作做法来讲；本 RFC 把它定为改动不得变通的规则。写下这条规则时做的审查没有发现辅助层，但发现了三个读取某个输入第二种形状的分支，这些形状都是早先某个版本记录下的：以 bytes 保存的思考签名，等于函数名的工具调用 id，在记录通道之前就记录下来的推理内容项。[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) 把网关的推理块从 0.5.5 整块保存的形式改为共用的 fidelity 键，由此加上了第四个。2026-10-24，项目负责人对基类客户端提出了同样的要求：「base client也减少一些抽象,尽量让代码容易看懂」。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0012；消息可以携带什么，见 [MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)。

## Rule
[rule]: #rule

- 客户端的转换就是 `transform_uni_config_to_model_config`、`transform_uni_message_to_model_input` 与 `transform_model_output_to_uni_event`（`transformUniConfigToModelConfig`，…），而 `_streaming_response_internal` / `_streamingResponseInternal` 是对线上事件的一个简单循环（[MMSP-RFC-0003](MMSP-RFC-0003-async-streaming.zh.md)）。它的辅助函数只有其参考客户端拥有的那些私有转换方法、图片的获取，以及 `utils`；客户端之间的转换代码，除了经由 `utils` 和基类，或者由适配器继承它所服务协议的客户端、只覆盖其服务端读法不同的部分（如 `openai_chat_vllm_adapter` 之于 `openai_chat`），不共享任何东西；其他客户端需要另一个客户端已有的东西时就复制过来，这样每个客户端读起来都像对其参考客户端的 diff（Responses 协议的参考是 `openai_official`，Chat Completions 的参考是 `openai_chat`）。
- 转换方法直接读取 SDK 的属性，字段访问、用量计算与错误文本都留在用到它们的地方；只有在内联会淹没主流程时才提取一段代码，绝不为几行代码提取，也绝不写成同时接受 dict 与 SDK 对象的垫片。
- 每种输入只有一种形状：线上事件是 SDK 的类型，消息只包含 `.done` 内容项。0.5.0 之前记录的历史中的内容项类型，在任何转换看到它们之前由 `legacy` 转换，直到 0.6.0 为止。早先版本在内容项内部记录下的三种形状同样读取到 0.6.0 为止：以 bytes 保存的思考签名、不带通道的推理内容项，以及 0.5.5 整块保存的网关推理块。等于函数名的工具调用 id 不在其中：`google-genai` 收到不带 id 的调用时仍然这样记录，两个 Google 客户端回传这样的调用时都不带 id。
- 不保留任何冗余（[MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)）。
- 基类读起来也是如此。`streaming_response` / `streamingResponse` 校验消息、读取客户端的事件、把每个 delta 交给 `StreamItems`、合并用量和结束原因、构建 `stop`，按这个顺序，都在这一个方法里完成。它的中止处理也在这个方法里，所防范的竞争情况就写在旁边。客户端的事件与公开的流之间，没有私有类，也没有辅助层。

## Enforced by
[enforced-by]: #enforced-by

- 按 `.agents/skills/mmsp-dev/SKILL.md` 所述，对照参考客户端审阅。
- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`。
- `src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`。
- `src_py/tests/test_stream_protocol.py` / `src_ts/tests/stream-protocol.test.ts`，它们检查旧的内容项类型在转换看到消息之前已被转换。
- `test_reasoning_fidelity.py` 及其对应的 Jest 测试，它们断言回传发出的内容项的确切内容。
- `test_message_order.py` 及其对应的 Jest 测试。
