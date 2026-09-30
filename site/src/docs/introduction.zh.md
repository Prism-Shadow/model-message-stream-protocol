---
description: MMSP 是什么，它由哪三个对象组成，以及一次请求如何流经它。
---

MMSP（Model Message Stream Protocol，模型消息流协议）为所有模型提供商定义了同一种消息格式和同一套流式文法。它以 Python 包和 TypeScript 包两种形式发布，两者行为一致。

各家模型 API 在基本构件上是一致的：消息、思考、工具调用、流式输出。不一致的是编码方式。Anthropic 流式输出 content block，OpenAI 流式输出 output item，Gemini 流式输出 step，而 Chat Completions 流式输出的 chunk 什么都不命名。MMSP 按各家自己的规则读取，交给你的代码的只有一种形状。

## 三个对象

你发送和接收的一切，都是这三个普通对象之一：

| 对象 | 是什么 |
| --- | --- |
| [`UniConfig`](/zh/docs/configuration/) | 一次请求的选项：工具、思考级别、系统提示词等。 |
| [`UniMessage`](/zh/docs/messages/) | 对话中的一条消息，来自用户或助手。它只包含完整的内容项。 |
| [`UniEvent`](/zh/docs/streaming/) | 流式响应中的一个事件。一条流由若干 `delta` 事件和一个 `stop` 事件组成。 |

在 Python 中它们是字典，在 TypeScript 中是带类型的对象，两种语言的字段名完全相同。

## 一次请求的旅程

1. 你用模型 id 创建一个 [`AutoLLMClient`](/zh/docs/client/)。它选出会讲该模型线上协议的客户端。
2. 你带着消息和配置调用一个流式方法。客户端把两者翻译成提供商的请求。
3. 提供商流式返回它自己的事件。客户端把每一个转成 `UniEvent` 片段，MMSP 再用完整形式收尾每一个内容项。
4. 完整的内容项按顺序组成助手消息。有状态调用在产出最后一个事件之前，先把这条消息记入客户端的历史。

提供商发来的、你的代码用不上但提供商要求原样送回的东西，比如思考签名，作为 [`fidelity`](/zh/docs/fidelity/) 跟随内容项一起传递。

## 有状态与无状态

`streaming_response_stateful` 接收新消息，并把历史保存在客户端里。它适合agent 循环：之前轮次的思考和工具调用会原样送回模型。

`streaming_response` 每次接收完整的消息列表，自己不保存任何东西。当对话由你自己存储时用它。

## 接下来读什么

- [快速开始](/zh/docs/quickstart/) 流式输出第一条响应，并跑通一次工具调用。
- [Agent 循环](/zh/docs/agent-loop/) 用四十行写出一个完整的 agent。
- [流式输出](/zh/docs/streaming/) 给出每条流都遵守的文法。
- [模型与端点](/zh/docs/models/) 列出 MMSP 能对接的一切。
