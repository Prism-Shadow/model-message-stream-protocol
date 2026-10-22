# MMSP-RFC-0012 转换直白，不带冗余

- Feature Name: `direct_conversion`
- Start Date: 2026-10-22
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0012-direct-conversion.md)

## Summary
[summary]: #summary

客户端只在它的转换方法中做转换，别处不做：每个方法读取 SDK 的类型化事件或交给它的通用内容项，一次遍历完成映射，在线上格式与通用结构之间没有自己的中间层，并且每种输入只接受一种形状。回传携带 [MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.zh.md) 允许的内容，仅此而已；内容项不携带任何回传都用不到的字段。

## Motivation
[motivation]: #motivation

审阅一个客户端，就是把它当作对其参考客户端的 diff 来看；读者顺着一次请求或一次响应，把整个文件从头读到尾。每多一层辅助函数、每一个接受同一输入两种形状的垫片、每一个「以防万一」留下的字段，都是两种语言彼此走样、服务商的怪癖藏身的地方。项目负责人提出的正是这些话：「转换代码尽量减少抽象，保持易懂，转换只保留必要的部分，冗余字段不需要保留」。mmsp-dev skill 原先把这些当作做法来讲；本 RFC 把它定为改动不得变通的规则。写下这条规则时做的审查没有发现辅助层，也没有发现无用的字段，但发现了三个读取某个输入第二种形状的分支，每一个都是为早先某个版本记录下的历史而留：以 bytes 保存的思考签名，等于函数名的工具调用 id，在记录通道之前就记录下来的推理内容项。

## Rule
[rule]: #rule

- 客户端的转换就是 `transform_uni_config_to_model_config`、`transform_uni_message_to_model_input` 与 `transform_model_output_to_uni_event`（`transformUniConfigToModelConfig`，…），而 `_streaming_response_internal` / `_streamingResponseInternal` 是对线上事件的一个简单循环（[MMSP-RFC-0003](MMSP-RFC-0003-stream-grammar.zh.md)）。它的辅助函数只有其参考客户端拥有的那些私有转换方法、图片的获取，以及 `utils`；客户端之间除了经由 `utils` 和基类，不共享任何东西，一个客户端需要另一个客户端已有的东西时就复制过来，这样每个客户端读起来都像对其参考客户端的 diff（Responses 协议的参考是 `openai_official`，Chat Completions 的参考是 `openai_chat`）。
- 转换方法直接读取 SDK 的属性，字段访问、用量计算与错误文本都留在用到它们的地方；只有在内联会淹没主流程时才提取一段代码，绝不为几行代码提取，也绝不写成同时接受 dict 与 SDK 对象的垫片。
- 每种输入只有一种形状：线上事件是 SDK 的类型，消息只包含 `.done` 内容项，0.5.0 之前记录的历史中的内容项类型在任何转换看到它们之前由 `legacy` 转换，直到 0.6.0 为止；这类历史在内容项内部携带的三种形状，即以 bytes 保存的思考签名、等于函数名的工具调用 id、不带通道的推理内容项，同样读取到 0.6.0 为止。
- 不带冗余：`StreamItems` 在内容项发出之前去掉 `item_id`；`fidelity` 不存放通用字段的副本，也不存放服务商会重新生成的 id（[MMSP-RFC-0008](MMSP-RFC-0008-minimal-replay.zh.md)）；客户端记录了、却没有任何回传使用的字段要删除，而不是保留。

## Enforced by
[enforced-by]: #enforced-by

按 `.agents/skills/mmsp-dev/SKILL.md` 所述，对照参考客户端审阅；`src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts` 中的 `StreamItems`，以及 `src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，它们拒绝任何内容项上的 `item_id`；`src_py/tests/test_reasoning_fidelity.py` 及其对应的 Jest 测试，它们断言回传发出的推理内容项的确切内容，不带 id，也不带残缺的密文；`test_message_order.py`；`test_stream_protocol.py`，它检查旧的内容项类型在转换看到消息之前已被转换。
