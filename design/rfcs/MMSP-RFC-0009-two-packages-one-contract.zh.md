# MMSP-RFC-0009 两个包，一份契约

- Feature Name: `two_packages_one_contract`
- Start Date: 2026-10-19
- RFC PR: [#265](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/265)
- Kind: rule

[English](MMSP-RFC-0009-two-packages-one-contract.md)

## Summary
[summary]: #summary

`mmsp` 与 `@prismshadow/mmsp` 拥有相同的客户端、映射、错误类和流，名称一致，只随各语言的大小写与惯用写法而不同；一个包缺少、或与另一个包做法不同的行为，都是缺陷。一项改动在同一个 PR 中同时落到两个包，并附上相互对应的测试。

## Motivation
[motivation]: #motivation

两个包是同一套协议的两种语言实现。在两者之间切换的调用方，或者用一个包运行 MMSP 服务端、用另一个包运行客户端的调用方，都期望同样的名称下有同样的行为。共享的 e2e 测试与唯一的模型清单（[#255](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/255)）检查这一点，而不只是承诺它。写下这条规则时做的审查发现，两个包发出的请求有两处不一致：一个是 OpenAI Python SDK 当作关键字参数拒绝的键（[#266](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/266)），一个是 openai-node 不会从字面的 `extra_body` 中展开的键（[#267](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/267)）；下面关于请求体的一条写明了每个 SDK 为这类键提供的通道。

## Rule
[rule]: #rule

- 两个包发出的请求体相同。SDK 类型参数之外的键走各自 SDK 的通道：OpenAI Python SDK 用 `extra_body`，openai-node 直接放在请求体顶层。
- 共享的 e2e 测试 `src_py/tests/test_client.py` 与 `src_ts/tests/client.test.ts` 是每个客户端都要满足的同一份契约。模型以它在 `.github/ci/models.json` 中的条目进入这些测试，条目写明能力标记与密钥变量。没有共享测试按模型名分支，也没有模型拥有专属的测试文件。
- 共享测试失败时，除非证明并非如此，都视为客户端有错。任何更大范围的测试改动，都需要项目负责人逐项明确批准。
- 离开测试模型清单的一代模型仍然受支持，并照常路由（[MMSP-RFC-0004](MMSP-RFC-0004-explicit-routing.zh.md)）。

## Enforced by
[enforced-by]: #enforced-by

`src_py/tests/` 与 `src_ts/tests/` 下成对的测试文件；`.github/ci/models.json`，两套测试共同读取的唯一模型清单；`.github/ci/plan.py`、`.github/ci/README.md` 与 `.github/workflows/ci.yml`；`test_client.py::test_model_catalog_routes_to_its_client_group` 及其对应的 Jest 测试。
