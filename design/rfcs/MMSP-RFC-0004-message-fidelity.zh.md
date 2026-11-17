# MMSP-RFC-0004 消息保真

- Feature Name: `message_fidelity`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Updated by: [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)
- Kind: spec

[English](MMSP-RFC-0004-message-fidelity.md)

## Abstract

消息保真确保以 **`UniMessage`** 记录的对话回传给模型时既不丢失也不改变。模型产生的**思考**（含所需签名或密文）与 **`tool_call_id`** 完整发回，过去回合在每次调用中都序列化为相同的线上**前缀**（§6.4 所列除外），使服务商前缀缓存稳定命中。

## 1. Introduction

- **无损回传思考与工具调用**：推理模型在工具循环中缺失先前思考会退化或报错：DeepSeek 在工具调用回合缺 `reasoning_content` 返回 `400`，Gemini 3 在单步首调缺思考签名返回 `400`，Claude 5.5 拒绝部分略去的思考块。2026-10-22 全客户端审查修复了仅存的两处缺失（[#268](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/268)、[#273](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/273)）。
- **保持前缀一致（「讲一下 fidelity 来保护思考，前缀不发生改变，是 identical 的」）**：改动已产出的事件、修改返回的历史列表或并发有状态调用，都会静默改变上下文并破坏付费前缀缓存。[#291](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/291) 规定历史存深拷贝、单飞有状态调用、拒绝空消息，并确保 `created_at` 不上链（「给历史消息加时间戳created at不会影响输入token,也不会破坏前缀缓存,所以可以放心做」）。
- **RFC 演进**：原载于 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)（MMSP-RFC-0011 及 MMSP-RFC-0008 的 `tool_call_id` 与无签名思考条目）和 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298)（MMSP-RFC-0005、MMSP-RFC-0008）。

| 日期 / PR | 变更与原因 |
| :--- | :--- |
| **2026-11-11** ([#322](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/322), [#326](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/326)) | **Mistral 思考块回传**：Mistral 将思考作为内容块流式返回，并以 `422 extra_forbidden` 拒绝推理字段。修订 §4，由 `openai-chat` 插件（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#9-插件) §9）将思考作为内容块发回。 |

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **回传**：把记录下来的消息作为后续请求的一部分发回给模型。
- **前缀**：请求中最新消息之前的各条消息，取客户端发出的线上形式。
- **替身**：回传回合缺少服务商必需项时由客户端补入的占位内容（如占位思考签名或空推理字段）。
- **Fidelity**：定义见 [MMSP-RFC-0002](MMSP-RFC-0002-message-protocol.zh.md#5-消息携带什么) §5。
- **有状态的历史**：`streaming_response_stateful` 保存的消息。

## 3. 消息保留什么

- **内容项与 `fidelity`**：记录的消息保留内容项及 `fidelity`，后续每次调用都必须从它们回传。除 `created_at`（§6.3）外，MMSP 不在传入消息上写入任何内容。
- **`tool_call_id`**：线上带调用 id 时必须保存服务商调用 id（同时有内容项 id 与调用 id 时取调用 id），回传时必须发回。不带 `tool_call_id` 的工具结果抛出 `InvalidMessageError`。
- **流元数据**：由流构建的助手消息保留 `usage_metadata` 与 `finish_reason`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#44-助手消息) §4.4）。

## 4. 每种线上格式需要发回什么

- **同模型思考回传**：客户端回传自身模型产生的思考时，必须带上该模型继续推理所需的一切 `fidelity`。

| 线上格式 | 回传的 Fidelity 与规则 |
| :--- | :--- |
| **Responses** | 推理项的通道（`channel`）与 `encrypted_content`、网关附加的 `signature` 与 `format`，及助手消息的 `phase`。 |
| **Messages** | 思考块的 `signature`，以及 redacted 思考块的 `data`。 |
| **Interactions** | 思考步骤的签名（`signature`）。 |
| **`generateContent`** | part 的 `thought_signature`，放回当初所在的那个 part。 |
| **Chat Completions (`openai-chat`)** | 推理字段名（`reasoning_field`），文本放入该字段（未知时两个字段都放）。较早回合产生过该字段后，`openai-chat` 在仅调用工具、无思考的回合将该字段发为空值。**Mistral**：拒绝两个字段，把非空文本作为思考块放在回合内容前发回，为空时不发任何字段。 |
| **网关加密推理块** | 记录 `encrypted_content`、`format` 与 `reasoning_id`，回传时重建。 |

- **探测准入原则**：字段仅在探测表明缺失会导致请求失败或模型退化时才加入清单。客户端用通用字段、`fidelity` 与服务商要求的替身重建助手回合，不逐字段复刻线上项。

## 5. 别处产生的思考

- **禁止当作正文发回**：其他模型或端点产生的思考按目标服务商接受的形式发回，拒绝处则略去，并且不得作为助手自己的文本（`text`）发回。

| 客户端或协议 | 跨模型/无签名思考的处理 |
| :--- | :--- |
| **`anthropic-official`** | 略去不带签名的思考项（与 API 对无法读取思考块的处理一致）。 |
| **Gemini (`google-official`, `google-genai`)** | 保留为无签名思考，并在校验签名处放 Google 文档的占位签名：`google-official` 用它开启回合，`google-genai` 用它为回合首个调用签名。 |
| **Chat Completions (`openai-chat`)** | 未指明字段时，把文本放进两个推理字段。 |
| **Responses** | 重建推理内容项，文本作为 `reasoning_text`。 |
| **`ant-messages`** | 无签名思考项直接以无签名形式发回（第三方 Messages 服务端接受，Anthropic 官方 API 拒绝）。 |

- **拒绝纯思考回合**：没有任何服务商接受只有思考的响应回传，故纯思考响应不记录并抛出 `EmptyResponseError`；只有思考的回传消息也会在请求前被拒绝（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#33-请求之前) §3.3、§5）。

## 6. 相同的前缀

### 6.1 历史保存副本

- **深拷贝隔离**：有状态的历史必须与调用方及产出的事件零对象共享。`streaming_response_stateful` 记录发送消息的深拷贝，并在 `stop` 到达时记录助手消息的深拷贝；`get_history` 与 `set_history` 均读写副本。
- **`stop` 产出前记录**：回合在 `stop` 产出前记录，调用方看到 `stop` 即可停止迭代并立即开始下一次调用。无 `stop` 结束的流不追加内容，也不保存 trace（[MMSP-RFC-0010](MMSP-RFC-0010-trace-recording.zh.md#3-何时保存轨迹) §3）。

### 6.2 同一时间只有一次有状态调用

- **并发互斥（`ConcurrentCallError`）**：已有调用进行时再调 `streaming_response_stateful` 必须在发送前抛出 `ConcurrentCallError`（`AutoLLMClient` 占用被包装客户端；无状态 `streaming_response` 不存历史，可并行运行）。
- **释放与中止**：调用占用客户端直到 `stop`、错误、信号中止或生成器关闭。被中止的调用立即释放客户端且什么也不记录，即使中止与 `stop` 同时到达（[MMSP-RFC-0008](MMSP-RFC-0008-request-interruption.zh.md#6-有状态调用) §6）。

### 6.3 `created_at`

- **原地打戳且不上链**：无 `created_at` 的消息由 `streaming_response` 和 `mmsp` 客户端在对象本身上写入发送时间（调用方消息或历史副本）。没有任何消息转换读取 `created_at`，不影响输入 token 与前缀缓存。

### 6.4 过去回合的线上形式

- **单向转换（不读后文）**：消息转换必须只根据当前消息及之前的消息写出，不得读取之后的消息。向后传递的仅限：`openai-chat` 较早回合产生过的推理字段（§4）、Google 客户端供函数响应重复的调用名，及替身（§4、§5）。旧格式转换（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）每次转换一致且不改调用方消息，使过去回合每次发出的线上前缀完全相同。
- **URL 图片**：内联 URL 图片的客户端（`openai-chat`、`moonshot-official`、两个 Google 客户端、Bedrock 上的 `anthropic-official`）每次请求重读 URL，仅当 URL 返回相同字节时形式不变。
- **外层字段与 Bedrock 断点**：系统提示、工具、配置原样发送。唯一移动的标记是 `anthropic-official` 在 Bedrock 上设在最后一条用户消息最后一项的缓存断点，符合 Anthropic 最多回看 20 个块的递增对话缓存设计（`llmsdk_docs/claude4_6/docs/prompt-caching.md`，"How automatic prefix checking works"）。Anthropic API 上改设顶层 `cache_control`，回合不带标记。
- **Gemini TTS**：两个 Google 客户端只发最新消息，因模型拒绝多轮对话。

### 6.5 不悄悄丢弃

- **拒绝空消息**：无任何可发送内容的消息在请求发出前被拒绝（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#33-请求之前) §3.3）；不得丢弃也不得发空内容，保持请求与历史回合一致。

## 7. `mmsp` 客户端

- **原样转发**：`mmsp` 客户端把内容项及 `fidelity` 原样发给服务端；服务端上游客户端按 §4 和 §5 回传。

## 8. Conformance

- **基类、旧格式与 `mmsp` 客户端**：`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts`、`src_py/mmsp/legacy.py` / `src_ts/src/legacy.ts`、`src_py/mmsp/mmsp/client.py` / `src_ts/src/mmsp/client.ts`。
- **消息转换与 `created_at` 隔离**：`src_py/mmsp/<client>/client.py` 与 `src_ts/src/<client>/client.ts` 中的 `transform_uni_message_to_model_input` / `transformUniMessageToModelInput`（不读 `created_at` 或后续消息；仅 tracer 和 playground 读 `created_at` 用于显示）。
- **推理保真与顺序测试**：`src_py/tests/test_reasoning_fidelity.py`、`test_reasoning_replay_without_thinking.py`、`test_tool_call_arguments.py`、`test_message_order.py` 及其对应测试。
- **流协议测试（`test_stream_protocol.py` / `stream-protocol.test.ts`）**：校验只增 `created_at`、历史深拷贝隔离、`ConcurrentCallError`、中止释放且不记录、历史续接及旧内容项转换。
- **MMSP 服务端测试（`test_mmsp_server.py` / `mmsp-server.test.ts`）**：经由 `mmsp` 客户端记录有状态回合及 `created_at`。
- **共享 e2e 工具回传（`test_client.py` / `client.test.ts`）**：工具调用用例第二轮回传清单中每个模型的工具调用回合（含思考）。
