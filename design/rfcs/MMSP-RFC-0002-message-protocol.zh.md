# MMSP-RFC-0002 消息协议

- Feature Name: `message_protocol`
- Start Date: 2026-10-24
- RFC PR: [#301](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/301)
- Kind: spec

[English](MMSP-RFC-0002-message-protocol.md)

## Abstract

MMSP 是所有模型共用的一套消息协议。调用模型只用三种结构：输入 `UniConfig`，输入与输出 `UniMessage`，输出 `UniEvent`；其中的内容项是一个封闭的类型集合，只在 `types.py` / `types.ts` 中定义一次。本文规定这三种结构、消息能携带什么（内容项的通用字段，以及每个内容项上精简的 `fidelity`）、服务商的功能如何进入协议，以及 Python 与 TypeScript 两个包的一致性：两个包是同一套协议。

## 1. Introduction

MMSP 的用意，是让调用方只面对一种消息格式和一套流语法，换模型只需换一个字符串。服务商的功能一旦以某个客户端独有的键进入，调用方就又得去了解这个服务商；两个包的行为一旦不同，就成了第二套协议。写下两包一致这条规则时做的审查发现，两个包发出的请求有两处不一致：一个是 OpenAI Python SDK 当作关键字参数拒绝的键（[#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)），一个是 openai-node 不会从字面的 `extra_body` 中展开的键（[#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)）。共享的 e2e 测试与唯一的模型清单（[#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)）检查两包是否一致，而不只是承诺。

回传的回合要被 API 接受，且模型的行为不受影响；它不必逐字段重现线上的内容项，而每一个照搬进 `fidelity` 的字段，都是使用方、trace 与历史记录要多携带的一种服务商结构。[#159](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/159) 加入 `fidelity`，用来承载严格的上游要求原样发回的推理字段；[#287](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/287) 不再整块保存网关的推理块，改为保存重建它所需的三个键。项目负责人的原话是：「转换只保留必要的部分，冗余字段不需要保留」。

这些要求最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0002、MMSP-RFC-0009、MMSP-RFC-0008 的一部分与 MMSP-RFC-0012 的后半部分，在 [#298](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/298) 中写作 MMSP-RFC-0002 与 MMSP-RFC-0004。原 MMSP-RFC-0002 中保持顺序的那一条，现在是 [MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#6-顺序) §6。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- *内容项*（item）：消息或事件的 `content_items` 中的一项。*完整内容项*的类型以 `.done` 结尾；*片段*的类型以 `.delta` 结尾。
- *通用字段*：`types.py` / `types.ts` 为内容项定义的、`fidelity` 以外的字段，例如 `text`、`thinking`、`arguments` 或 `tool_call_id`。
- *Fidelity*：内容项的 `fidelity` 对象，即没有通用字段承载的线上数据（§5）。
- *公开流*：定义见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#2-conventions-and-terminology) §2。*回传*：定义见 [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#2-conventions-and-terminology) §2。

## 3. 三种结构

### 3.1 `UniConfig`

一次请求的配置是一个 `UniConfig`：由 `types.py` / `types.ts` 定义的键组成，每个键都是可选的。同一个键在每个客户端上的含义必须相同；客户端如何发送、忽略或拒绝一个键，见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#6-请求参数) §6。

### 3.2 `UniMessage`

消息有 `role`（`user` 或 `assistant`）与 `content_items`，另有可选的 `usage_metadata`、`finish_reason` 与 `created_at`（自纪元起的毫秒数）。消息必须只包含完整内容项：基类用流中的完整内容项构建助手消息，调用方发来的其他内容项一律被拒绝（[MMSP-RFC-0007](MMSP-RFC-0007-error-types.zh.md#31-请求之前) §3.1），只有 0.5.0 之前记录的历史中的内容项类型例外，它们会被转换（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。内容项的顺序是消息的一部分（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#6-顺序) §6）。由流构建的助手消息带有这条流的 `usage_metadata` 与 `finish_reason`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#44-助手消息) §4.4）；调用方手工构建的消息可以两者都不带。

### 3.3 `UniEvent`

事件有 `role`、`event_type`（`delta` 或 `stop`）、`content_items`、`usage_metadata`、`finish_reason` 与 `created_at`。在公开流中，`delta` 事件必须恰好携带一个内容项（片段或完整内容项），且既不带用量也不带结束原因；唯一的 `stop` 事件必须不带任何内容项，并同时带有两者（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#4-流的语法) §4）。客户端交给基类的事件是什么样，见 [MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#41-客户端产出什么) §4.1。

### 3.4 内容项

完整内容项的类型有 `text.done`、`image_url.done`、`inline_data.done`、`thinking.done`、`inline_thinking.done`、`tool_call.done`、`tool_result.done` 与 `embedding.done`。片段的类型是其中除 `image_url` 与 `tool_result` 之外各类型的 `.delta` 形式；这两种由调用方写入，不会出现在任何流中。消息或事件不得携带其他任何类型的内容项，服务商自己的类型也包括在内。

## 4. 服务商功能

- 服务商的功能必须以协议中的 `UniConfig` 键或内容项字段进入 MMSP，或者以不透明的 `fidelity` 附在所属的内容项上（§5），而绝不作为某个客户端独有的键或字段。
- 修改任何结构（内容项的类型或字段、`UniConfig` 的键、`UniMessage` 或 `UniEvent` 的字段）都是修改协议，必须经由 RFC。

## 5. 消息携带什么

- 消息只保存其内容项的通用字段，外加每个内容项回传时需要的 `fidelity`：没有通用字段承载的线上数据，例如思考签名、加密的推理内容、phase，或严格的上游要求的推理字段名。每种线上格式需要发回什么、一个字段凭什么加进来，见 [MMSP-RFC-0004](MMSP-RFC-0004-message-fidelity.zh.md#4-每种线上格式需要发回什么) §4。
- `fidelity` 不得存放通用字段的副本、服务商会重新生成或忽略的 id，或任何回传都用不到的字段。
- 同一种数据在每个客户端的 `fidelity` 中必须用同一个名字：`signature`、`encrypted_content`、`format`、`channel`、`phase`、`reasoning_field`、`reasoning_id`。客户端不得以线上格式自己的名字整块保存一个线上内容项或一组线上内容项。`reasoning_id` 只为网关加密的推理块保存，网关需要拿回这个块的 id。
- `fidelity.item_id` 是客户端在流式过程中用来标识自己内容项的 id。`StreamItems` 必须在内容项发出之前去掉它，因此它不会出现在使用方、trace 或历史记录中。
- 使用方应当把 `fidelity` 当作不透明数据，原样传回。
- 早先版本在内容项内部记录的那些形状，读取到 0.6.0 为止（[MMSP-RFC-0009](MMSP-RFC-0009-protocol-conversion.zh.md#7-每种输入一种形状) §7）。

## 6. 两个包中的同一套协议

- `mmsp` 与 `@prismshadow/mmsp` 必须拥有相同的客户端、映射、错误类和流，名称一致，只随各语言的大小写与惯用写法而不同。一个包缺少、或与另一个包做法不同的行为，都是缺陷。
- 两个包发出的请求体必须相同。SDK 类型参数之外的键走各自 SDK 的通道：OpenAI 与 Anthropic 的 Python SDK 用 `extra_body`，它们的 TypeScript SDK 直接放在请求体顶层。
- 一项改动必须在同一个 PR 中同时落到两个包，并附上相互对应的测试。

## 7. Conformance

- `src_py/mmsp/types.py`、`src_ts/src/types.ts`；`src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts` 中的抽象转换方法，以及只保留流中完整内容项的 `concat_uni_events_to_uni_message` / `concatUniEventsToUniMessage`。
- `src_py/mmsp/stream_items.py` / `src_ts/src/streamItems.ts`，它们让每个内容项只有一份 fidelity，并去掉 `item_id`；`src_py/tests/stream_grammar.py` / `src_ts/tests/streamGrammar.ts`，它们拒绝仍带着 `item_id` 的内容项。
- `src_py/tests/` 与 `src_ts/tests/` 下成对的测试，其中包括 `test_request_body.py` / `request-body.test.ts`，读取 Anthropic 客户端在每条 SDK 版本线上发出的请求体；以及 `test_reasoning_fidelity.py` / `reasoning-fidelity.test.ts`，断言回传发出的推理内容项的确切内容，不带 id，也不带残缺的密文。
- 共享的 e2e 测试 `src_py/tests/test_client.py` 与 `src_ts/tests/client.test.ts` 是每个客户端都要满足的同一份契约：
  - 模型以它在 `.github/ci/models.json` 中的条目进入这些测试，条目写明能力标记与密钥变量；
  - 没有共享测试按模型名分支，也没有模型拥有专属的测试文件；
  - 共享测试失败时，除非证明并非如此，都视为客户端有错；
  - 任何更大范围的测试改动，都需要项目负责人逐项明确批准。
- `.github/ci/models.json`，两套测试共同读取的唯一模型清单，以及 `.github/ci/plan.py`、`.github/ci/README.md` 与 `.github/workflows/ci.yml`。清单只保留每个模型族最新的一代；离开清单的一代模型仍然受支持，并照常路由（[MMSP-RFC-0005](MMSP-RFC-0005-client-routing.zh.md#3-客户端类型) §3）。
- `test_client.py` / `client.test.ts` 中检查清单里每个条目都路由到其客户端分组的那个路由用例。
