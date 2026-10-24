> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 使用 Kimi API 的 Partial Mode

> 使用 Kimi API Partial Mode 续写给定文本、固定回复开头、继续被截断的输出或保持角色一致性。

Partial Mode 让 Kimi 大模型顺着给定的语句继续往下生成，而不是从头开始回复。当你需要固定回复的开头（例如客服场景中智能机器人每一句都以"尊敬的用户您好"开头）、补全被截断的长输出，或强化角色扮演的一致性时，可以使用 Partial Mode。

本页示例默认使用最新模型 `kimi-k3.1-pro`。K3.1 Pro 使用请求顶层 `reasoning_effort` 配置推理强度（支持 `"low"` / `"high"` / `"max"`，默认 `"max"`）。换用 `kimi-k3.1-pro-highspeed` 等其他模型时，需要替换 `model` 字段，并根据模型支持情况调整参数配置，详见[模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)。

## 让模型从指定开头继续生成

Partial Mode 的用法是：在 `messages` 列表尾部追加一条 `role=assistant`、`partial=True` 的消息，把希望模型"接着说"的内容放在 `content` 字段中，模型就会强制以该内容开头生成回复。以下示例演示了如何让模型以固定话术开头：

**python**

```python theme={null}
import os

from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url = "https://api.moonshot.cn/v1",
)

completion = client.chat.completions.create(
    model = "kimi-k3.1-pro",
    messages = [
        {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
        {"role": "user", "content": "你好？"},
        {
            "partial": True, # <-- 通过 partial 参数，开启 Partial Mode
        	"role": "assistant", # <-- 我们在用户提问之后添加一条 role=assistant 的消息
        	"content": "尊敬的用户您好，", # <-- 通过 content 把话"喂到 Kimi 大模型嘴里"，让 Kimi 大模型接着这句话继续往下说
        },
    ]
)

# Kimi 大模型会顺着"喂到嘴里的话"继续说下去，因此我们需要手动将喂给 Kimi 大模型的话拼接到最终生成的回复中
print("尊敬的用户您好，" + completion.choices[0].message.content)
```

**node.js**

```js theme={null}
const OpenAI = require('openai')

const client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY, // 运行前请设置 MOONSHOT_API_KEY 环境变量
    baseURL: "https://api.moonshot.cn/v1",
})

async function main() {
    let completion = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {role: "system", content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
            {role: "user", content: "你好？"},
            {
                partial: true, // <-- 通过 partial 参数，开启 Partial Mode
                role: "assistant", // <-- 我们在用户提问之后添加一条 role=assistant 的消息
                content: "尊敬的用户您好，", // <-- 通过 content 把话"喂到 Kimi 大模型嘴里"，让 Kimi 大模型接着这句话继续往下说
            },
        ]
    })

    // Kimi 大模型会顺着"喂到嘴里的话"继续说下去，因此我们需要手动将喂给 Kimi 大模型的话拼接到最终生成的回复中
    console.log("尊敬的用户您好，" + completion.choices[0].message.content)
}

main()
```

使用 Partial Mode 的要点：

1. 在 messages 列表尾部添加一条额外的 message，设置 `role=assistant`、`partial=True`；
2. 将需要喂给 Kimi 大模型的内容放置在 `content` 字段中，Kimi 大模型会强制以 `content` 的内容开头开始生成回复；
3. 将步骤 2 中的 `content` 拼接到 Kimi 大模型生成的内容之前，组成完整的回复。

## 补全被截断的输出

调用 Kimi API 时，可能由于对输入和输出 Tokens 数量的预估出现偏差，导致 `max_tokens` 字段的值被设置过低，Kimi 大模型不能完整地输出回复内容。这种情况下，`finish_reason` 的值为 `length`，即 Kimi 大模型生成的回复所占用的 Tokens 数量大于请求设置的 `max_tokens` 值。此时，如果你对已经输出的内容感到满意，想让 Kimi 大模型顺着已经输出的内容继续输出剩余内容，就可以用 Partial Mode 把已输出的内容作为前缀传回。以下示例演示了输出被截断后的续写流程：

> [!NOTE]
>
> 注意 `max_tokens` 会优先被思考消耗：`kimi-k3.1-pro` 默认开启思考，`max_tokens` 设置较小时，截断点可能落在思考阶段——此时 `content` 仍为空、`finish_reason` 已是 `length`，续写会因前缀为空而从头生成。使用本流程时，请把 `max_tokens` 设得足够大，确保截断发生在正文阶段。

**python**

```python theme={null}
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url = "https://api.moonshot.cn/v1",
)

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "user", "content": "请背诵完整的出师表。"},
    ],
    max_tokens=1200,  # <-- 注意这里，我们设置一个较小的 max_tokens 的值，以观察 Kimi 大模型无法完整输出内容的情况
)

if completion.choices[0].finish_reason == "length":  # <-- 当内容被截断时，finish_reason 的值为 length
    prefix = completion.choices[0].message.content
    reasoning_content = completion.choices[0].message.reasoning_content
    print(prefix, end="")  # <-- 在这里，你将看到被截断的部分输出内容
    print("「继续输出--------->」")
    completion = client.chat.completions.create(
        model="kimi-k3.1-pro",
        messages=[
            {"role": "user", "content": "请背诵完整的出师表。"},
            {"role": "assistant", "content": prefix, "partial": True, "reasoning_content": reasoning_content} # 思考模式需要reasoning_content
        ],
        max_tokens=86400,  # <-- 注意这里，我们将 max_tokens 的值设置为一个较大的值，以确保 Kimi 大模型能完整输出内容
    )
    print(completion.choices[0].message.content)  # <-- 在这里，你将看到 Kimi 大模型顺着之前已经输出的内容，继续将输出内容补全完整
```

**node.js**

```js theme={null}
const OpenAI = require('openai')

client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY, // 运行前请设置 MOONSHOT_API_KEY 环境变量
    baseURL: "https://api.moonshot.cn/v1",
})

async function main() {
    let completion = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {role: "user", content: "请背诵完整的出师表。"},
        ],
        max_tokens: 1200,  // <-- 注意这里，我们设置一个较小的 max_tokens 的值，以观察 Kimi 大模型无法完整输出内容的情况
    })

    if (completion.choices[0].finish_reason == "length") {  // <-- 当内容被截断时，finish_reason 的值为 length
        prefix = completion.choices[0].message.content
        reasoning_content = completion.choices[0].message.reasoning_content
        console.log(prefix)
        console.log("「继续输出--------->」")
        let completion = await client.chat.completions.create({
            model: "kimi-k3.1-pro",
            messages: [
                {"role": "user", "content": "请背诵完整的出师表。"},
                {"role": "assistant", "content": prefix, "partial": true, "reasoning_content": reasoning_content},
            ],
            max_tokens: 86400
        })
        console.log(completion.choices[0].message.content)  // <-- 在这里，你将看到 Kimi 大模型顺着之前已经输出的内容，继续将输出内容补全完整
    }
}

main()
```

思考模式下续写时，需要把上一轮返回的 `reasoning_content` 一并传回（见示例中的注释）。

## 用 `name` 字段固定角色身份

`name` 是 Partial Mode 中的一个特殊字段，作用是强化模型对角色的认知，强制模型以 `name` 指定的角色的口吻输出内容。`name` 字段是输出内容前缀的一部分。以下示例使用 Kimi 大模型进行角色扮演，以《明日方舟》中的凯尔希医生为例：通过设置 `"name": "凯尔希"`，让 Kimi 大模型以凯尔希作为自己的角色进行输出，更好地保持角色的一致性：

**python**

```python theme={null}
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/v1",
)

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {
            "role": "system",
            "content": "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
        },
        {
            "role": "user",
            "content": "你怎么看待特蕾西娅和阿米娅？",
        },
        {
            "partial": True,
            "role": "assistant",
            "name": "凯尔希",
            "content": "",
        },
    ],
    max_tokens=65536,
)

print(completion.choices[0].message.content)
```

**node.js**

```js theme={null}
const OpenAI = require('openai')

client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
})

async function main() {
    let completion = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {
                role: "system",
                content: "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
            },
            {
                role: "user",
                content: "你怎么看待特蕾西娅和阿米娅？",
            },
            {
                partial: true,
                role: "assistant",
                name: "凯尔希",
                content: "",
            },
        ],
        max_tokens: 65536,
    })

    console.log(completion.choices[0].message.content)
}

 main()
```

## 在长对话中保持角色一致

以下通用方法可以帮助大模型在长时间对话中保持角色扮演的一致性：

* 提供清晰的角色描述：在设置角色时，详细介绍他们的个性、背景以及可能具有的任何具体特征或怪癖，帮助 Kimi 大模型更好地理解和模仿角色；
* 增加关于角色的细节：说话的语气、风格、个性，甚至背景故事和动机等，例如上面示例中提供了一些凯尔希的语录；
* 指导角色在各种情况下如何行动：如果预计角色会遇到某些特定类型的用户输入，或者希望控制角色扮演互动中某些情况下的输出，应在系统提示词（system prompt）中提供明确的指令和指南，说明该角色在这些情况下应如何行动；
* 定期强化角色设定：如果对话的轮次非常长，可以定期使用系统提示词（system prompt）强化角色的设定，特别是当模型开始产生一些偏离时。

以下示例演示了在多轮对话之后重新插入系统提示词、强化角色设定的做法：

**python**

```python theme={null}
 import os

 from openai import OpenAI

 client = OpenAI(
     api_key=os.environ["MOONSHOT_API_KEY"],
     base_url="https://api.moonshot.cn/v1",
 )

 completion = client.chat.completions.create(
     model="kimi-k3.1-pro",
     messages=[
         {
             "role": "system",
             "content": "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
         },
         {
             "role": "user",
             "content": "你怎么看待特蕾西娅和阿米娅？",
         },

         # 假设这中间产生了非常多轮的对话
         # ...

         {
             "role": "system",
             "content": "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
         },
         {
             "partial": True,
             "role": "assistant",
             "name": "凯尔希",
             "content": "",
         },
     ],
     max_tokens=65536,
 )

 print(completion.choices[0].message.content)
```

**node.js**

```js theme={null}
const OpenAI = require('openai')

client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1",
})

async function main() {
    let completion = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {
                role: "system",
                content: "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
            },
            {
                role: "user",
                content: "你怎么看待特蕾西娅和阿米娅？",
            },

            // 假设这中间产生了非常多轮的对话
            // ...

            {
                role: "system",
                content: "下面你扮演凯尔希，请用凯尔希的语气和我对话。凯尔希是手机游戏《明日方舟》中的六星医疗职业医师分支干员。前卡兹戴尔勋爵，前巴别塔成员，罗德岛高层管理人员之一，罗德岛医疗项目领头人。在冶金工业、社会学、源石技艺、考古学、历史系谱学、经济学、植物学、地质学等领域皆拥有渊博学识。于罗德岛部分行动中作为医务人员提供医学理论协助与应急医疗器械，同时也作为罗德岛战略指挥系统的重要组成人员活跃在各项目中。",
            },
            {
                partial: true,
                role: "assistant",
                name: "凯尔希",
                content: "",
            },
        ],
        max_tokens: 65536,
    })

    console.log(completion.choices[0].message.content)
}

 main()
```
