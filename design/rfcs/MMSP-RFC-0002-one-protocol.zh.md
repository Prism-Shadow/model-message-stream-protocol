# MMSP-RFC-0002 消息协议须统一

- Feature Name: `one_protocol`
- Start Date: 2026-10-24
- RFC PR: TBD
- Kind: rule

[English](MMSP-RFC-0002-one-protocol.md)

## Summary
[summary]: #summary

调用任何模型都使用同样的三种结构：输入 `UniConfig`，输入与输出 `UniMessage`，输出 `UniEvent`。内容项只能是 `types.py` / `types.ts` 定义的类型之一，消息只包含完整的 `.done` 内容项，消息和事件中不会出现服务商自己的类型。两个包是同一套协议：`mmsp` 与 `@prismshadow/mmsp` 拥有相同的客户端、映射、错误类和流，名称一致，只随各语言的大小写与惯用写法而不同；一个包缺少、或与另一个包做法不同的行为，都是缺陷。

## Motivation
[motivation]: #motivation

MMSP 的用意，是让调用方只面对一种消息格式和一套流语法，换模型只需换一个字符串。服务商的功能一旦以某个客户端独有的键进入，调用方就又得去了解这个服务商；两个包的行为一旦不同，就成了第二套协议。保持顺序这一条来自客户端出过的一个故障：一个 Responses 风格的消息转换，把收集起来的文本追加到了原本排在它后面的工具调用之后，DeepSeek 因此回复 "No tool output found for tool call"。写下两包一致这条规则时做的审查发现，两个包发出的请求有两处不一致：一个是 OpenAI Python SDK 当作关键字参数拒绝的键（[#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)），一个是 openai-node 不会从字面的 `extra_body` 中展开的键（[#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)）。共享的 e2e 测试与唯一的模型清单（[#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)）检查两包是否一致，而不只是承诺。这条规则最初在 [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265) 中写作 MMSP-RFC-0002 与 MMSP-RFC-0009。

## Rule
[rule]: #rule

- 服务商的功能要么以协议中的 `UniConfig` 键或内容项字段进入 MMSP，要么以不透明的 `fidelity` 附在所属的内容项上（[MMSP-RFC-0004](MMSP-RFC-0004-lean-messages.zh.md)），绝不成为某个客户端独有的键或字段。修改任何结构（内容项的类型或字段、`UniConfig` 的键、`UniEvent` 的字段）都是修改协议，须经 RFC。
- 只要传输格式能表达顺序，消息转换就保持助手回合中各内容项的顺序（先思考，再文本，再工具调用）。
- 两个包发出的请求体相同。SDK 类型参数之外的键走各自 SDK 的通道：OpenAI 与 Anthropic 的 Python SDK 用 `extra_body`，它们的 TypeScript SDK 直接放在请求体顶层。一项改动在同一个 PR 中同时落到两个包，并附上相互对应的测试。
- 共享的 e2e 测试 `src_py/tests/test_client.py` 与 `src_ts/tests/client.test.ts` 是每个客户端都要满足的同一份契约：
  - 模型以它在 `.github/ci/models.json` 中的条目进入这些测试，条目写明能力标记与密钥变量；
  - 没有共享测试按模型名分支，也没有模型拥有专属的测试文件；
  - 共享测试失败时，除非证明并非如此，都视为客户端有错；
  - 任何更大范围的测试改动，都需要项目负责人逐项明确批准。
- 离开测试模型清单的一代模型仍然受支持，并照常路由（[MMSP-RFC-0006](MMSP-RFC-0006-explicit-routing.zh.md)）。

## Enforced by
[enforced-by]: #enforced-by

- `src_py/mmsp/types.py`、`src_ts/src/types.ts`。
- `src_py/mmsp/base_client.py` / `src_ts/src/baseClient.ts` 中的抽象转换方法。
- `src_py/tests/` 与 `src_ts/tests/` 下成对的测试文件，其中包括 `test_message_order.py` / `message-order.test.ts`，以及 `test_request_body.py` / `request-body.test.ts`，后者读取 Anthropic 客户端在每条 SDK 版本线上发出的请求体。
- `.github/ci/models.json`，两套测试共同读取的唯一模型清单，以及 `.github/ci/plan.py`、`.github/ci/README.md` 与 `.github/workflows/ci.yml`。
- `test_client.py` / `client.test.ts` 中检查清单里每个条目都路由到其客户端分组的那个路由用例。
