---
description: 为什么选择 MMSP：每条流都在两个层次上标记状态，你的代码始终知道正在到达什么、何时结束。
---

所有模型 API 都支持流式输出，但它们在“程序如何得知正在到达什么、何时结束”这件事上各行其是。agent 代码恰恰在这里出错：用半截参数解析工具调用，把被截断的回合当成完整回答，每接一家服务商就重写一遍循环。MMSP 用一个决定解决了这个问题，并对所有服务商一视同仁：**每条流都携带两层状态标记。** 在这之上构建，你的 agent 其余部分都会变得简单。

## 两层状态

下面是一次真实的响应，先思考、再调用工具，MMSP 把它流式输出为：

```text
event_type  item
delta       thinking.delta   "The user wants"
delta       thinking.delta   " the weather in Paris."
delta       thinking.done    "The user wants the weather in Paris."
delta       tool_call.delta  get_weather
delta       tool_call.delta  {"city":
delta       tool_call.delta  "Paris"}
delta       tool_call.done   get_weather {"city": "Paris"}
stop        tool_call        usage_metadata {"prompt_tokens": 412, ...}
```

**里层标记一个内容项。** 同一类 token（文本、思考、工具调用、图片、音频、向量）以 `.delta` 片段流式到达，最后由恰好一个 `.done` 项收尾，给出完整内容：全部文本、解析好的参数、拼接好的字节。`text.delta` 表示“这段文本还在继续”，`text.done` 表示“这段文本结束了，完整内容在此”。

**外层标记整条消息。** 每个事件的类型都是 `delta`，直到恰好一个 `stop` 事件结束整条流，并带上结束原因和 token 用量。`delta` 表示“助手还在回答”，`stop` 表示“消息已完整，这是它结束的方式和原因”。

两个问题，两层标记，没有任何一处需要猜。

## 两层标记带来什么

- **流式展示，完整处理。** 界面随到随渲染每个 `.delta`，agent 逻辑只读 `.done`。你永远不会去解析半截 JSON 参数，也不必猜工具调用是否已经结束。
- **一个循环适配所有服务商。** Anthropic 结束的是 content block，OpenAI 结束的是 output item，Gemini 结束的是 step，而 Chat Completions 的 chunk 根本没有结束标记。MMSP 把它们统一为同样的两层，为一个模型写的循环可以跑在所有模型上。换模型，就是换一个模型 id。
- **没说完的回答一眼可见。** 没有 `stop` 事件的流就是没有完成，无论它已经输出了多少。截断永远不会悄无声息。
- **消息自动拼好。** 按顺序排列的 `.done` 项就是助手消息，思考签名等 [fidelity](/zh/docs/fidelity/) 随之附带，下一轮可以原样发回服务商。

## 为什么不用别的方案

- **各家服务商自己的 SDK** 各有一套事件模型：词汇不同，结束标记不同，工具参数所在的位置也不同。支持三家服务商，就要写三个解析器、修三份 bug。
- **把 Chat Completions 当作通用格式**，就没有内容项边界，也没有内容项的结束信号。思考、签名、图片和并行工具调用，每个网关各有各的补丁写法，或者干脆丢掉。
- **只返回最终消息的封装层**，要么放弃了流，要么把拼装留给你自己。

MMSP 保留完整的流，对所有服务商用同一种方式标记，并把完整的内容项交到你手上。这正是它的全部意义，也是我们自己的 agent 都构建在它之上的原因。

## 先看清一切，再持续改进

同样的结构让每一轮对话都易于记录。在配置中加上 `trace_id`，MMSP 就会按实际发生的样子保存每段对话：配置、每个完整的内容项、结束原因、token 用量和耗时。本地的 [tracer](/zh/docs/tracing/) 按轮次回放，一个错误的工具参数、一段失控的思考，几秒内就能定位，不必从日志里拼凑。

这些 trace 也是 agent 能够读取的数据。一个会回看自身 trace 的 agent harness，可以发现自己在哪里失败，修改提示词、工具或代码，然后再跑一遍，这就是递归自我进化（RSI）的循环。MMSP 为这个循环提供了跨所有模型统一的记录，使它成为自我进化型 agent 的基础设施。自我进化的 harness [PenguinHarness](https://penguin.ooo/) 正是通过 MMSP 与模型对话。

## 开始构建

- [快速开始](/zh/docs/quickstart/) 流式输出第一条响应，并运行一次工具调用。
- [流式输出](/zh/docs/streaming/) 列出了两层标记的全部规则。
- [Tracer 与 Playground](/zh/docs/tracing/) 记录并回放你的运行。
