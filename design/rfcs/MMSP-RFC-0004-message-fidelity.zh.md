# MMSP-RFC-0004 消息保真

- Feature Name: `message_fidelity`
- Start Date: 2026-10-24
- RFC PR: [#N](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/N)
- Kind: spec

[English](MMSP-RFC-0004-message-fidelity.md)

## Abstract

消息保真指的是：以 `UniMessage` 记录下来的对话，回传给模型时既不丢失也不改变。模型产生的思考带着该模型从这段思考继续所需的一切发回，每个工具调用都带着服务商的调用 id 发回，一个过去的回合在每次调用中都以相同的线上形式发出（§6.4 所列的情况除外），因此服务商的前缀缓存看到的是同一个前缀。本文规定一条记录下来的消息保留什么、每种线上格式怎样回传它、别处产生的思考怎样处理，以及历史与消息转换怎样让前缀保持一致。

## 1. Introduction

每个推理模型在工具调用循环中缺了先前的思考都会退化，有几个还会拒绝请求：调用过工具的回合缺少 `reasoning_content` 时，DeepSeek 返回 400；一步中的第一个调用缺少思考签名时，Gemini 3 返回 400；Claude 5.5 拒绝被部分略去的思考块。项目负责人要求，消息转成 `UniMessage` 再转回去以后，不丢失模型需要的任何东西，首先是它的思考；2026-10-22 的审查在每个官方客户端上运行了一个带思考与工具调用的回合及其回传，发现了这一点不成立的两处（[#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268)、[#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)）。

一段对话就是一个前缀，服务商缓存它，调用方为它付费。历史如果在两个回合之间变了，模型的上下文和开销也就跟着变了，而没有人做过这个决定：事件产出之后又被改动，调用方改动了拿回去的列表，第二次调用记下一个生成时没有看到第一次的回合。[#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) 让历史保存副本，同一时间只运行一次有状态调用，没有可发送内容的消息被拒绝。关于时间戳，项目负责人的决定是：给历史消息加时间戳created at不会影响输入token,也不会破坏前缀缓存,所以可以放心做。

项目负责人对本文的要求：讲一下 fidelity 来保护思考，前缀不发生改变，是 identical 的。这些内容最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0011 以及 MMSP-RFC-0008 中关于 `tool_call_id` 和不带签名的思考的条目，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0005 与 MMSP-RFC-0008。

## 2. Conventions and Terminology

本文中的关键词 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，当且仅当以全大写出现时，按 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）的定义理解。本中文版把它们依次写作 必须、不得、应当、不应 与 可以。

- *回传*：把一条记录下来的消息作为之后某次请求的一部分发回给模型。
- *前缀*：一次请求中最新那条消息之前的各条消息，取客户端发出的线上形式。
- *替身*：客户端在回传的回合中，为这个回合缺少而服务商又要求的东西放进去的内容（占位的思考签名、空的推理字段）。
- *Fidelity*：定义见 [MMSP-RFC-0002 §5](MMSP-RFC-0002-message-protocol.zh.md)。*有状态的历史*：`streaming_response_stateful` 保存的消息。

## 3. 消息保留什么

- 一条记录下来的消息保留它的内容项及其 `fidelity`，之后的每次调用都必须从它们回传这条消息。除了 `created_at`（§6.3），MMSP 不在交给它的消息上写入任何东西。
- 线上格式带有调用 id 时，`tool_call_id` 必须保存服务商的调用 id，回传时必须把它发回。线上格式同时带有内容项 id 和调用 id 时，它保存的是调用 id，结果依靠调用 id 对应到它的调用。不带 `tool_call_id` 的工具结果抛出 `InvalidMessageError`。
- 由一条流构建的助手消息保留这条流的 `usage_metadata` 与 `finish_reason`（[MMSP-RFC-0003 §4.4](MMSP-RFC-0003-message-requests.zh.md#44-助手消息)）。

## 4. 每种线上格式需要发回什么

客户端回传它自己的模型产生的思考时，必须带上该模型从这段思考继续所需的一切。每种线上格式需要发回的，就是客户端记录为 `fidelity` 的内容：

- Responses 推理内容项的通道与 `encrypted_content`，以及网关附加的 `signature` 与 `format`，还有助手消息的 `phase`；
- Messages 思考块的 `signature`，以及 redacted 思考块的 `data`；
- Interactions 思考步骤的签名；
- generateContent 中 part 的 `thought_signature`，放回它当初所在的那个 part；
- Chat Completions 回合的推理字段名，文本放在该字段中；字段名未知时两个字段都放，对话中较早的回合产生过该字段之后，`openai-chat` 在只做工具调用、没有思考的回合中把这个字段发成空值；
- 网关加密的推理块，以 `encrypted_content`、`format` 与 `reasoning_id` 记录，回传时重建。

一个字段只有在探测表明缺了它请求会失败或模型会退化时，才加入这份清单。客户端用通用字段、这些 fidelity 以及服务商要求的替身重建回传的助手回合；它不逐字段复刻线上的内容项。

## 5. 别处产生的思考

§4 的范围是同一模型、同一端点。另一个模型或端点产生的思考，按服务商接受它的形式发回，在服务商拒绝它的地方则略去，并且不得作为助手自己的文本发回：

- `anthropic-official` 略去不带签名的思考内容项，与 API 对模型无法读取的思考块的处理一致；
- 回传给 Gemini 时把文本保留为不带签名的思考，并在 API 校验签名的地方放上 Google 文档给出的占位签名：`google-official` 用它开启这一回合，`google-genai` 用它为这一回合的第一个调用签名；
- Chat Completions 的回传在内容项没有指明字段时，把文本放进两个推理字段；
- Responses 的回传重建一个推理内容项，文本作为 `reasoning_text`；
- 经由 `ant-messages` 时，不带签名的思考内容项以不带签名的形式发回，这是第三方 Messages 服务端接受的形式；Anthropic 自己的 API 会拒绝它。

只有思考、别无其他内容的响应不会被记录，因为没有服务商接受它回传：它抛出 `EmptyResponseError`；回传的消息如果只有思考，也会被拒绝（[MMSP-RFC-0003 §3.3](MMSP-RFC-0003-message-requests.zh.md#33-请求之前)、[§5](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束)）。

## 6. 相同的前缀

### 6.1 历史保存副本

有状态的历史必须与调用方、与产出的事件都不共享任何对象：`streaming_response_stateful` 记录发送的那条消息的深拷贝，并在 `stop` 事件到达时记录助手消息的深拷贝；`get_history` 返回一份副本，`set_history` 保存一份副本。回合在 `stop` 产出之前记录，因此调用方在看到 `stop` 时就停止迭代也没有问题，下一次调用也能从那时开始。没有 `stop` 就结束的流不追加任何内容，也不保存 trace（[MMSP-RFC-0010 §3](MMSP-RFC-0010-trace-recording.zh.md)）。

### 6.2 同一时间只有一次有状态调用

一个客户端上已有一次调用在进行时，再调用 `streaming_response_stateful` 必须在发送任何内容之前抛出 `ConcurrentCallError`。一次调用占用客户端，直到它的 `stop`、它的错误、它的信号被中止，或它的生成器被关闭；被中止的调用立即释放客户端，并且什么也不记录，即使中止恰好发生在它的 `stop` 到达之时（[MMSP-RFC-0008 §6](MMSP-RFC-0008-request-interruption.zh.md)）。`streaming_response` 不保存历史，能与有状态调用同时运行。`AutoLLMClient` 把调用转发给它包装的客户端，占用的是被包装的那个客户端。

### 6.3 `created_at`

发送时没有 `created_at` 的消息，由 `streaming_response` 和 `mmsp` 客户端在这个对象本身上写入发送的时间：可能是调用方自己的消息，也可能是历史中某条记录时没有它的消息的副本。没有任何消息转换读取 `created_at`，所以它不会到达服务商，输入 token 和前缀缓存都不受影响。MMSP 不会在交给它的消息上写入别的任何内容。

### 6.4 过去回合的线上形式

- 消息转换必须只根据一条消息本身和它之前的消息来写出这条消息，不得读取它之后的消息。转换向后带的，只是后面的消息需要从前面的消息得到的东西：`openai-chat` 对话中较早的回合产生过的推理字段（§4），以及在 Google 客户端中，每个调用的名字，回答这个调用的函数响应会重复它。替身（§4、§5）由这个回合和它之前的回合决定。旧格式转换（[MMSP-RFC-0009 §7](MMSP-RFC-0009-protocol-conversion.zh.md)）每次调用都以同样的方式转换一条消息，并且从不就地修改。所以一个回传的回合在每次调用中都以相同的线上形式发出，服务商的前缀缓存看到的是同一个前缀。
- 以 URL 给出的图片，由把它内联进请求的客户端（`openai-chat`、`moonshot-official`、两个 Google 客户端、Bedrock 上的 `anthropic-official`）在每次请求时重新读取，所以只有在这个 URL 返回同样的字节时，它才以相同的形式发出。
- 请求在消息之外携带的内容（系统提示、工具、配置）属于调用方，原样发送；MMSP 加到请求体中的内容只取决于客户端、模型和配置。唯一会移动的标记是 `anthropic-official` 在 Bedrock 上设置的缓存断点：它放在每次请求最后一条用户消息的最后一个内容项上，所以一个回合在某次调用中带着它，在下一次调用中就不再带。这正是 Anthropic 为不断增长的对话给出的做法：一次请求会读到上一次请求的断点写下的缓存条目，最多回看 20 个块（`llmsdk_docs/claude4_6/docs/prompt-caching.md`，"How automatic prefix checking works"）。在 Anthropic API 上，客户端改为设置顶层的 `cache_control`，没有回合携带标记。
- Gemini TTS 请求没有前缀：两个 Google 客户端都只发送最新的那条消息，因为这个模型拒绝多轮对话。

### 6.5 不悄悄丢弃

客户端没有任何可发送内容的消息，会在请求发出之前被拒绝（[MMSP-RFC-0003 §3.3](MMSP-RFC-0003-message-requests.zh.md#33-请求之前)）；它不得被丢弃，也不得以空内容发送，因此请求与历史中的回合始终一致。

## 7. `mmsp` 客户端

`mmsp` 客户端把内容项及其 `fidelity` 原样发给它的服务端；服务端的上游客户端按 §4 和 §5 的规定回传它们。

## 8. Conformance

- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`；`src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`；`src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`。
- `src_py/mmsp/<client>/client.py` 和 `src_ts/src/<client>/client.ts` 中的消息转换（`transform_uni_message_to_model_input` / `transformUniMessageToModelInput`），它们都不读取 `created_at`，也不读取之后的消息，以及它们的事件转换记录的 fidelity；除了类型定义和打时间戳的地方，只有 tracer 和 playground 读取 `created_at`，用来显示。
- `src_py/tests/test_reasoning_fidelity.py` 及其对应测试（回传发出的确切内容项）；`test_reasoning_replay_without_thinking.py`、`test_tool_call_arguments.py`、`test_message_order.py` 及其对应测试。
- `test_stream_protocol.py` / `stream-protocol.test.ts`：调用方的消息只多出 `created_at`，别无其他；历史与调用方、与流都不共享任何对象；第二次有状态调用抛出 `ConcurrentCallError`；被中止的调用释放客户端，并且什么也不记录；对话接着交给它的历史继续；旧的内容项类型被转换。
- `test_mmsp_server.py` / `mmsp-server.test.ts`，经由 `mmsp` 客户端记录一个有状态的回合，连同它的 `created_at`。
- `test_client.py` / `client.test.ts` 中工具调用用例的第二轮，回传清单中每个模型做出工具调用的那一回合，连同其中的思考。
