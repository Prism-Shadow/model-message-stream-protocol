---
description: MMSP 是什么，它由哪三个对象组成，以及一次请求如何流经它。
---

MMSP（Model Message Stream Protocol）为所有模型服务商提供了一套统一的消息格式和流式文法。它以 Python 包和 TypeScript 包的形式发布，两者行为一致。

各家模型 API 的基本构件相同：消息、思考、工具调用、流式输出。但编码方式各异。Anthropic 流式输出 content block，OpenAI 流式输出 output item，Gemini 流式输出 step，而 Chat Completions 流出的 chunk 不标明自己装的是什么。MMSP 按各家协议读取，最终交给你的代码统一的结构。

## 三个对象

你发送和接收的所有数据，都属于以下三个对象之一：

| 对象 | 说明 |
| --- | --- |
| [`UniConfig`](/zh/docs/configuration/) | 请求的配置项：工具、思考级别、系统提示词等。 |
| [`UniMessage`](/zh/docs/messages/) | 对话中的一条消息，来自用户或助手。它只包含完整的内容项。 |
| [`UniEvent`](/zh/docs/streaming/) | 流式响应中的一个事件。一条流由多个 `delta` 事件和一个 `stop` 事件组成。 |

在 Python 中它们是字典，在 TypeScript 中是类型化对象，两者的字段名完全相同。

## 请求流程

1. 使用模型 id 创建一个 [`AutoLLMClient`](/zh/docs/client/)。它会自动选择适配该模型协议的客户端。
2. 调用流式方法，传入消息和配置。客户端将两者转换为服务商的请求格式。
3. 服务商流式返回其原生事件。客户端将每个事件转换为 `UniEvent` 片段，MMSP 再用完整形式收尾每个内容项。
4. 完整的内容项按顺序组成助手消息。有状态调用在返回最后一个事件前，会先将这条消息记录到客户端的历史中。

服务商返回的、你的代码不需要但服务商要求原样传回的数据（例如思考签名），会作为 [`fidelity`](/zh/docs/fidelity/) 随内容项一起传递。

## 有状态与无状态

`streaming_response_stateful` 接收新消息，并在客户端内维护历史记录。它适用于 agent 循环：之前轮次的思考和工具调用会原样送回模型。

`streaming_response` 每次接收完整的消息列表，自身不保存任何状态。当你自行管理对话历史时使用它。

## 后续阅读

- [快速开始](/zh/docs/quickstart/)：流式获取第一条响应，并执行一次工具调用。
- [Agent 循环](/zh/docs/agent-loop/)：用四十行代码实现一个完整的 agent。
- [流式输出](/zh/docs/streaming/)：所有流都遵循的文法说明。
- [模型与端点](/zh/docs/models/)：MMSP 能对接的所有模型与端点。
