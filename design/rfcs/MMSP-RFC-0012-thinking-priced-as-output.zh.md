# MMSP-RFC-0012 思考按输出计价

- Feature Name: `thinking_price`
- Start Date: 2026-11-20
- RFC PR: [#359](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/359)
- Implementation PR: [#360](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/360)
- Kind: change
- Superseded by: [MMSP-RFC-0013](MMSP-RFC-0013-output-priced-by-modality.zh.md)

[English](MMSP-RFC-0012-thinking-priced-as-output.md)

## Abstract

模型**没有单独的思考价格**：注册表的 **`ModelPricing`** 不含思考单价，一轮调用的 **`thoughts_tokens`** 计为输出，按 **`response_tokens`** 计费。`usage_metadata` 中的 `thoughts_tokens` 计数保留。

## 1. Introduction

- **两行曾对思考单独定价**：注册表按用量分桶存放单价，其中包括 `thoughts_tokens`。该键原本都取输出单价，只有 `google-official` 上的两行例外，其厂商按文本单价列出思考价格：`gemini-omni-1.2-flash`（每百万 $9，视频输出为 $12，[#318](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/318)）与 `gemini-nano-banana-2.1`（$7.50，图像输出为 $30，[#349](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/349)）。
- **负责人决定（2026-11-20）**：模型没有单独的思考价格。思考计为输出、按输出单价计费，MMSP 与 PenguinHarness 均如此；PenguinHarness 的计量本就把思考算作输出。

## 2. Conventions and Terminology

本文中的关键词“必须”“不得”“应当”“不应”“可以”依次对应 BCP 14（[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)、[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)）中的 MUST、MUST NOT、SHOULD、SHOULD NOT 与 MAY，按其定义解释；本文只在这一含义上使用这五个词。

- **输出 token**：`stop` 事件 `usage_metadata` 中的 `thoughts_tokens + response_tokens`（[MMSP-RFC-0003](MMSP-RFC-0003-message-requests.zh.md#5-流怎样结束) §5）。
- **输出单价**：注册表某一行的 `pricing.response_tokens`。

## 3. 思考的价格

- **没有思考键**：`ModelPricing`（Python 与 TypeScript）必须只包含 `currency`、`prompt_tokens`、`response_tokens` 与可选的 `cached_tokens`。`list_supported_models` / `listSupportedModels` 在 USD 与 CNY 下都不得返回其他单价键。
- **计为输出**：一轮调用的思考 token 必须按输出单价计价，其输出成本为每百万 token `(thoughts_tokens + response_tokens) × pricing.response_tokens`。本仓库内的使用方（状态探测、`/models.json`、用量文档与 Skill）必须按此计算。
- **厂商另列的单价**：厂商为思考另列单价的行必须只存其输出单价；该行的注释可以写明厂商所列的单价。
- **计数不变**：客户端必须继续在 `usage_metadata` 中单独报告 `thoughts_tokens`；去掉的只是它的单价。

## 4. Drawbacks

- **两行的计算成本高于账单**：厂商对思考的计费低于输出单价时，计算成本比账单高出其差额：`gemini-nano-banana-2.1` 每百万思考 token 高 $22.50，`gemini-omni-1.2-flash` 高 $3（标价分别读取于 2026-11-19 与 2026-11-06）。
- **不兼容变更**：读取 `pricing.thoughts_tokens` 的调用方（TypeScript 编译报错，Python 抛 `KeyError`）改为读取 `pricing.response_tokens`。

## 5. Rationale and Alternatives

- **一个输出单价**：使用方用同一个数字为每个模型的输出计价，PenguinHarness 正是如此；只有部分行设置的第二个输出单价，是每个使用方都要额外处理的价格。
- **保留 `thoughts_tokens` 并令其等于 `response_tokens`**：旧调用方仍能编译，但留下一个命名已不存在之价格的键，日后的行可能再次把它设成不同的值。
