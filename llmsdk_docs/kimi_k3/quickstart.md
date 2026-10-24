> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Kimi K3

> 了解 Kimi K3 的长程编程、知识工作、深度推理、视觉理解与 100 万 token 上下文能力。

## 模型简介

Kimi K3 是 Kimi 的上一代旗舰模型，拥有 2.8 万亿参数，基于 KDA 混合线性注意力机制（Kimi Delta Attention）和注意力残差（Attention Residuals）技术构建，原生支持视觉理解，并拥有 100 万 token 上下文窗口。它是全球首个开源的 3 万亿级别模型，面向长程编程、知识工作和推理等前沿智能场景而设计。

完整 Benchmark 与案例请参考 [技术博客](https://www.kimi.com/blog/kimi-k3) 。Kimi 目前正与推理合作伙伴和开源维护者密切协作，对齐技术细节，确保模型能在整个生态中可靠上线。完整模型权重已发布。关于架构、训练和评测的更多细节，将随 Kimi K3 技术报告一同公布。

### 3 万亿级开源模型

Kimi K3 是首个达到 2.8 万亿参数规模的开源模型。这是 Kimi 持续推进模型规模边界的最新一步：在过去 12 个月（2025/07–2026/07）中的 9 个月里，Kimi 模型都保持着开源模型的规模上限。

![开源前沿模型规模随时间变化](https://mintcdn.com/moonshotcn/no4X7IUdjGtP_MH_/assets/pics/k3-opensource-progress.png?fit=max\&auto=format\&n=no4X7IUdjGtP_MH_\&q=85\&s=bc2cc9afeaec649be37c812f0b8c5325)

Kimi K3 基于 Kimi Delta Attention（KDA）和 Attention Residuals（AttnRes）构建。这两项架构更新，都是为了让信息在更长序列和更深模型中流动得更顺畅。我们也进一步扩大了 Mixture of Experts（MoE）的稀疏度：结合 Stable LatentMoE 框架后，模型可以在 896 个专家中高效激活 16 个。再加上训练方法和数据配方的优化，这些结构性改进让 Kimi K3 相比 K2 的整体扩展效率提升约 2.5 倍，能更有效地把算力转化为能力。

![Kimi K3 架构](https://mintcdn.com/moonshotcn/no4X7IUdjGtP_MH_/assets/pics/k3-arch.png?fit=max\&auto=format\&n=no4X7IUdjGtP_MH_\&q=85\&s=b83048095b73528f2a601698f5b51ddd)

### 编程

Kimi K3 具备很强的长程编码能力。在极少人工监督的情况下，它可以持续完成长时间工程任务，理解和处理大型代码库，并协调使用终端工具。

Kimi K3 也擅长结合软件工程与视觉推理的任务。它能够利用截图和视觉反馈，优化游戏开发、前端和 CAD 等场景。

### 知识工作

Kimi K3 推动了端到端知识工作的进展。除了公开基准外，Kimi K3（max）在我们的内部评测中也展现出稳定提升。这些评测来自真实用户与智能体协作流程中反复出现的任务模式和挑战。Kimi K3 在不同生产场景导向的工作流中都表现出一致优势，说明其智能体知识工作能力得到了全面提升。

## 访问条件

Kimi K3 是旗舰模型：在开放平台完成充值（最低充值金额 10 元）后即可解锁调用。新用户注册认证赠送的 15 元代金券不可用于 Kimi K3。

累计充值金额同时决定账户等级与速率限制（并发、RPM、TPM、TPD），详见 [充值与限速](https://platform.kimi.com/docs/pricing/limits.md) 。

## 立即开始

* [Playground](https://platform.kimi.com/playground)
* [申请 API Key](https://platform.kimi.com/console/api-keys)

以下示例需要 Python 3.9+ 和 OpenAI SDK。先安装 SDK，并初始化一次客户端；后续 Python 示例复用 `client`。

```bash theme={null}
python3 -m pip install --upgrade 'openai>=1.0'
```

```python theme={null}
import os

from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/v1",
)
```

## 基础调用

**Python**

```python theme={null}
completion = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "用一句话介绍 Kimi K3。"}],
)

print(completion.choices[0].message.content)
```

**cURL**

```bash theme={null}
curl https://api.moonshot.cn/v1/chat/completions \
  --header "Authorization: Bearer $MOONSHOT_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "model": "kimi-k3",
    "messages": [{"role": "user", "content": "用一句话介绍 Kimi K3。"}]
  }'
```

## 推理强度

K3 始终开启思考模式，并支持通过请求顶层 `reasoning_effort` 配置推理强度。

> [!NOTE]
>
> 推理强度支持 `low` / `high` / `max` 三档（默认 `max`）。用法见 [推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md) 。

```python theme={null}
completion = client.chat.completions.create(
    model="kimi-k3",
    reasoning_effort="max",
    messages=[{"role": "user", "content": "证明根号 2 是无理数。"}],
)

print(completion.choices[0].message.content)
```

> [!NOTE]
>
> 多轮对话和工具调用时，将 API 返回的完整 assistant message 原样加入下一次请求，不要只保留 `content`。

## 流式输出

流式响应分别提供推理增量 `reasoning_content` 和最终答案增量 `content`。更多细节见 [流式输出](https://platform.kimi.com/docs/guide/utilize-the-streaming-output-feature-of-kimi-api.md) 。

```python theme={null}
stream = client.chat.completions.create(
    model="kimi-k3",
    messages=[{"role": "user", "content": "解释为什么天空是蓝色的。"}],
    stream=True,
)

for chunk in stream:
    delta = chunk.choices[0].delta
    reasoning = getattr(delta, "reasoning_content", None)
    if reasoning:
        print(reasoning, end="", flush=True)
    if delta.content:
        print(delta.content, end="", flush=True)
```

## 视觉输入

视觉消息的 `content` 必须是对象数组，而不是序列化后的字符串。完整格式与限制见 [视觉输入](https://platform.kimi.com/docs/guide/use-kimi-vision-model.md) 。

**本地图片**

```python theme={null}
import base64
from pathlib import Path

image_data: str = base64.b64encode(Path("image.png").read_bytes()).decode()
completion = client.chat.completions.create(
    model="kimi-k3",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_data}"},
                },
                {"type": "text", "text": "描述这张图片。"},
            ],
        }
    ],
)

print(completion.choices[0].message.content)
```

**视频文件**

```python theme={null}
from pathlib import Path

video = client.files.create(file=Path("video.mp4"), purpose="video")
try:
    completion = client.chat.completions.create(
        model="kimi-k3",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {"url": f"ms://{video.id}"},
                    },
                    {"type": "text", "text": "概括这个视频。"},
                ],
            }
        ],
    )
    print(completion.choices[0].message.content)
finally:
    client.files.delete(video.id)
```

## 结构化输出

使用 `json_schema` 和 `strict: true` 约束最终 `message.content`，只解析该字段，不解析 `reasoning_content`。

> **姓名与年龄 schema**
>
> ```python theme={null}
> import json
>
> completion = client.chat.completions.create(
>     model="kimi-k3",
>     messages=[
>         {"role": "user", "content": "小林今年 28 岁。提取姓名和年龄。"}
>     ],
>     response_format={
>         "type": "json_schema",
>         "json_schema": {
>             "name": "person",
>             "strict": True,
>             "schema": {
>                 "type": "object",
>                 "properties": {
>                     "name": {"type": "string"},
>                     "age": {"type": "integer"},
>                 },
>                 "required": ["name", "age"],
>                 "additionalProperties": False,
>             },
>         },
>     },
> )
>
> person: dict[str, object] = json.loads(
>     completion.choices[0].message.content or "{}"
> )
> print(person)
> ```

详见 [结构化输出](https://platform.kimi.com/docs/guide/response_format.md) 。

## Partial Mode

在消息末尾添加 `partial=True` 的 assistant message，让模型从指定文本前缀继续生成。最终展示时需要自行拼接前缀。

```python theme={null}
prefix: str = "结论："
completion = client.chat.completions.create(
    model="kimi-k3",
    messages=[
        {"role": "user", "content": "用一句话说明保持接口兼容的重要性。"},
        {"role": "assistant", "content": prefix, "partial": True},
    ],
)

print(prefix + (completion.choices[0].message.content or ""))
```

详见 [Partial Mode](https://platform.kimi.com/docs/guide/use-partial-mode-feature-of-kimi-api.md) 。

## 自定义工具与 `tool_choice`

首轮用 `tool_choice="required"` 强制至少调用一个工具。执行每个调用后，回传完整 assistant message，并用对应的 `tool_call_id` 逐条追加工具结果。

> **最小天气 Agent Loop**
>
> ```python theme={null}
> import json
> from typing import Any
>
> tools: list[dict[str, Any]] = [
>     {
>         "type": "function",
>         "function": {
>             "name": "get_weather",
>             "description": "查询城市天气",
>             "parameters": {
>                 "type": "object",
>                 "properties": {"city": {"type": "string"}},
>                 "required": ["city"],
>             },
>         },
>     }
> ]
> messages: list[Any] = [
>     {"role": "user", "content": "北京今天天气怎么样？"}
> ]
>
> first = client.chat.completions.create(
>     model="kimi-k3",
>     messages=messages,
>     tools=tools,
>     tool_choice="required",
> )
> assistant_message = first.choices[0].message
> messages.append(assistant_message)
>
> for tool_call in assistant_message.tool_calls or []:
>     arguments: dict[str, str] = json.loads(tool_call.function.arguments)
>     result: str = json.dumps(
>         {"city": arguments["city"], "weather": "晴", "temperature_c": 24},
>         ensure_ascii=False,
>     )
>     messages.append(
>         {"role": "tool", "tool_call_id": tool_call.id, "content": result}
>     )
>
> final = client.chat.completions.create(
>     model="kimi-k3",
>     messages=messages,
>     tools=tools,
> )
> print(final.choices[0].message.content)
> ```

详见 [工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md) 。

## 动态加载工具

把完整工具定义放进一条不含 `content` 的 `system` message，即可从该位置起加载工具。

> **动态加载计算器**
>
> ```python theme={null}
> from typing import Any
>
> dynamic_messages: list[dict[str, Any]] = [
>     {"role": "user", "content": "计算 23 乘以 47。"},
>     {
>         "role": "system",
>         "tools": [
>             {
>                 "type": "function",
>                 "function": {
>                     "name": "calculate",
>                     "description": "计算一个算术表达式",
>                     "parameters": {
>                         "type": "object",
>                         "properties": {
>                             "expression": {
>                                 "type": "string",
>                                 "description": "待计算的算术表达式",
>                             }
>                         },
>                         "required": ["expression"],
>                     },
>                 },
>             }
>         ],
>     },
> ]
> completion = client.chat.completions.create(
>     model="kimi-k3",
>     messages=dynamic_messages,
> )
>
> print(completion.choices[0].message.tool_calls)
> ```

* 工具定义必须包含完整的 `name`、`description` 和 `parameters`。
* 声明从该 message 所在位置起生效。
* 后续请求仍需在历史中携带该 message，服务端不会保存声明。

详见 [动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md) 。

## 1M 上下文与 TTL 缓存

上下文缓存对普通模型请求自动生效，无需手动创建缓存：满足条件的前缀写入缓存后，命中部分按缓存命中价格计费，写入会产生一次性的缓存写入费用。TTL 支持 `5m`（默认）与 `1h`，建议按业务请求间隔选择——连续追问等间隔较短的场景用默认 `5m` 即可；间隔可能超过 5 分钟时，传 `prompt_cache_options.ttl` 选择 `1h` 档，避免缓存过期后重复写入。缓存按块存储，不足一整块的部分无法写入缓存，会计为缓存未命中。

```python theme={null}
from pathlib import Path

knowledge: str = Path("knowledge-base.md").read_text(encoding="utf-8")

for question in ["总结关键结论。", "列出三个实施风险。"]:
    completion = client.chat.completions.create(
        model="kimi-k3",
        messages=[
            {"role": "system", "content": knowledge},
            {"role": "user", "content": question},
        ],
    )
    print(completion.choices[0].message.content)
```

如何选择 TTL、提高命中率并验证用量，详见 [上下文缓存](https://platform.kimi.com/docs/guide/context-caching.md) 。

## 官方工具

官方工具通过 Formula 接入：

1. 从 Formula 的 `/tools` 接口获取工具定义。
2. 将定义加入 Chat Completions 请求的 `tools`。
3. 收到 `tool_calls` 后，将对应函数名和参数提交到 Formula 的 `/fibers` 接口。
4. 将完整 assistant message 和 Fiber 输出作为对应的 tool message 加入历史。
5. 再次调用 Chat Completions，直到模型返回最终答案。

完整客户端与接口契约见 [官方工具](https://platform.kimi.com/docs/guide/use-official-tools.md) 。联网搜索工具正在更新，近期不建议使用。

## 重要限制

* 推理强度通过请求顶层 `reasoning_effort` 配置，支持 `low` / `high` / `max`（默认 `max`）；K3 始终开启思考模式。
* `max_completion_tokens` 默认 131072，最大可设置为 1048576。
* `temperature=1.0`、`top_p=0.95`、`n=1`、`presence_penalty=0`、`frequency_penalty=0` 为固定值，建议不要显式传入。
* 多轮对话和工具调用必须原样回传完整 assistant message。
* 视觉输入不支持公网图片 URL；请使用 base64 或 `ms://<file-id>`，并确保 `content` 是对象数组。
* 联网搜索正在更新，近期不建议用于生产流程。

## 常见问题

> **Kimi K3 如何计费？**
>
> Kimi K3 上下文长度为 1M tokens，计费不按上下文长度分段，所有用量均按量付费。计费项包括：缓存写入（区分 TTL 5min / TTL 1h 两档）、输入（区分缓存命中与未命中）和输出，均按统一单价计费，详见 [Kimi K3 定价](https://platform.kimi.com/docs/pricing/chat.md) 。

> **新用户赠送的 15 元代金券可以体验 Kimi K3 吗？**
>
> 不可以。模型发布后，国内注册并完成认证的用户获赠的 15 元代金券不可用于体验 Kimi K3，请充值后解锁使用。

> **Kimi K3 的思维链怎么关？**
>
> 目前关不了，K3 始终开启思考模式。如果觉得思考过程太长，可以将 `reasoning_effort` 设置为 `low` 降低推理强度，详见 [推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)。

## 模型价格

关于 token 价格，详见 [产品定价](https://platform.kimi.com/docs/pricing/chat.md) 。

## 相关文档

> **[推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)**
>
> 配置 reasoning\_effort。

> **[视觉输入](https://platform.kimi.com/docs/guide/use-kimi-vision-model.md)**
>
> 发送图片与视频。

> **[结构化输出](https://platform.kimi.com/docs/guide/response_format.md)**
>
> 使用严格 JSON Schema。

> **[Partial Mode](https://platform.kimi.com/docs/guide/use-partial-mode-feature-of-kimi-api.md)**
>
> 从指定前缀继续生成。

> **[工具调用约束](https://platform.kimi.com/docs/guide/use-tool-choice.md)**
>
> 控制模型是否调用工具。

> **[动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md)**
>
> 按需注入工具定义。

> **[工具调用最佳实践](https://platform.kimi.com/docs/guide/kimi-k3-tool-calling-best-practice.md)**
>
> 组合工具调用能力。

> **[官方工具](https://platform.kimi.com/docs/guide/use-official-tools.md)**
>
> 接入 Formula 工具。

> **[Kimi K3 定价](https://platform.kimi.com/docs/pricing/chat.md)**
>
> 查看输入与输出价格。
