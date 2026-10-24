> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 使用 Kimi API 完成工具调用（tool_calls）

> 定义、注册和执行 Kimi API `tool_calls`，回传工具结果并处理流式工具调用。

工具调用 `tool_calls` 让 Kimi 大模型从“说”进化到“做”：模型根据对话上下文决定是否调用工具、以 JSON 格式生成调用参数，由你的应用执行工具并回传结果，模型再基于结果生成最终回复。借助 `tool_calls`，Kimi 大模型能帮你搜索互联网内容、查询数据库，甚至操作智能家居。本页用一个联网搜索案例走通从定义、注册到执行的完整流程，并覆盖流式输出等场景的注意事项。

## 一次工具调用的完整流程

一次工具调用 `tool_calls` 包含以下步骤：

1. 使用 JSON Schema 格式定义工具；
2. 通过 `tools` 参数将定义好的工具提交给 Kimi 大模型，你可以一次性提交多个工具；
3. Kimi 大模型会根据当前聊天的上下文，决定使用哪个或哪几个工具，Kimi 大模型也可以选择不使用工具；
4. Kimi 大模型会将调用工具所需要的参数和信息通过 JSON 格式输出；
5. 使用 Kimi 大模型输出的参数，执行对应的工具，并将工具执行结果提交给 Kimi 大模型；
6. Kimi 大模型根据工具执行结果，给予用户回复；

> [!TIP]
>
> 如果你的应用需要挂载大量工具（几十上百个），建议使用[动态加载工具](https://platform.kimi.com/docs/guide/use-dynamic-tool-loading.md)按需注入工具定义，而不是一次性全部提交——可以显著降低 token 消耗并提升工具选择的准确率。

## 用工具调用让模型学会联网搜索

Kimi 大模型的知识来源于训练数据，无法回答时效性强的问题。下面用“搜索引擎”和“网页浏览器”两个工具，演示如何让模型自己搜索最新知识并据此作答。

### 用 JSON Schema 定义工具

人在网上查资料时，通常先打开搜索引擎（例如百度或必应）搜索内容、浏览搜索结果，再打开一个或多个结果网页获取需要的知识。把这两个动作抽象成工具，就是“搜索引擎”和“网页浏览器”——用 JSON Schema 描述后提交给 Kimi 大模型，它就能和人一样搜索并浏览网页。

工具定义使用 JSON Schema 格式编写：

> [JSON Schema](https://json-schema.org/) is a vocabulary that you can use to annotate and validate JSON documents.
>
> [JSON Schema](https://json-schema.org/) 是一种用于描述 JSON 数据格式的 JSON 文档。

我们定义以下 JSON Schema：

```json theme={null}
{
	"type": "object",
	"properties": {
		"name": {
			"type": "string"
		}
	}
}
```

这个 JSON Schema 定义了一个 JSON Object，这个 JSON Object 中包含了一个名为 `name` 的字段，并且该字段的类型为 `string`，例如：

```json theme={null}
{
	"name": "Hei"
}
```

通过 JSON Schema 来描述我们的工具定义，能让 Kimi 大模型更清晰和直观地知道我们的工具需要哪些参数，以及每个参数的类型和介绍。接下来让我们来定义前文提到的“搜索引擎”和“网页浏览器”这两个工具：

**python**

```python theme={null}
tools = [
	{
		"type": "function", # 约定的字段 type，目前支持 function 作为值
		"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "search", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": """ 
				通过搜索引擎搜索互联网上的内容。

				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { # 使用 parameters 字段来定义函数接收的参数
				"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["query"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { # properties 中是具体的参数定义，你可以定义多个参数
					"query": { # 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", # 使用 type 定义参数类型
						"description": """
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	},
	{
		"type": "function", # 约定的字段 type，目前支持 function 作为值
		"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "crawl", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": """
				根据网站地址（URL）获取网页内容。
			""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { # 使用 parameters 字段来定义函数接收的参数
				"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["url"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { # properties 中是具体的参数定义，你可以定义多个参数
					"url": { # 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", # 使用 type 定义参数类型
						"description": """
							需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。
						""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	}
]
```

**node.js**

```js theme={null}
const tools = [
	{
		"type": "function", // 约定的字段 type，目前支持 function 作为值
		"function": { // 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "search", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": ""/* 
				通过搜索引擎搜索互联网上的内容。
 
				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			*/, // 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { // 使用 parameters 字段来定义函数接收的参数
				"type": "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["query"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { // properties 中是具体的参数定义，你可以定义多个参数
					"query": { // 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", // 使用 type 定义参数类型
						"description": ""/*
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						*/ // 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	},
	{
		"type": "function", // 约定的字段 type，目前支持 function 作为值
		"function": { // 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "crawl", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": ""/*
				根据网站地址（URL）获取网页内容。
			*/, // 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { // 使用 parameters 字段来定义函数接收的参数
				"type": "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["url"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { // properties 中是具体的参数定义，你可以定义多个参数
					"url": { // 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", // 使用 type 定义参数类型
						"description": ""/*
							需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。
						*/ // 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	}
]
```

在使用 JSON Schema 定义工具时，我们使用以下固定的格式来定义一个工具：

```json theme={null}
{
	"type": "function",
	"function": {
		"name": "NAME",
		"description": "DESCRIPTION",
		"parameters": {
			"type": "object",
			"properties": {
				
			}
		}
	}
}
```

其中，`name`、`description`、`parameters.properties` 由工具提供方定义，其中 `description` 描述了工具的具体作用、以及在什么场合需要使用工具，`parameters` 描述了成功调用工具所需要的具体参数，包括参数类型、参数介绍等；**最终，Kimi 大模型会根据 JSON Schema 的定义，生成一个满足定义要求的 JSON Object 作为工具调用的参数（arguments）。**

### 把工具注册给模型

把 `search` 工具提交给 Kimi 大模型，看看它能否正确调用工具：

本页示例默认使用最新模型 `kimi-k3.1-pro`。K3.1 Pro 使用请求顶层 `reasoning_effort` 配置推理强度（支持 `"low"` / `"high"` / `"max"`，默认 `"max"`）。换用 `kimi-k3.1-pro-highspeed` 等其他模型时，需要替换 `model` 字段，并根据模型支持情况调整参数配置，详见[模型参数参考](https://platform.kimi.com/docs/api/models-overview.md)。

**python**

```python theme={null}
import os

from openai import OpenAI


client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url="https://api.moonshot.cn/v1",
)

tools = [
	{
		"type": "function", # 约定的字段 type，目前支持 function 作为值
		"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "search", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": """ 
				通过搜索引擎搜索互联网上的内容。

				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { # 使用 parameters 字段来定义函数接收的参数
				"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["query"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { # properties 中是具体的参数定义，你可以定义多个参数
					"query": { # 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", # 使用 type 定义参数类型
						"description": """
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	},
	# {
	# 	"type": "function", # 约定的字段 type，目前支持 function 作为值
	# 	"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
	# 		"name": "crawl", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
	# 		"description": """
	# 			根据网站地址（URL）获取网页内容。
	# 		""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
	# 		"parameters": { # 使用 parameters 字段来定义函数接收的参数
	# 			"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
	# 			"required": ["url"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
	# 			"properties": { # properties 中是具体的参数定义，你可以定义多个参数
	# 				"url": { # 在这里，key 是参数名称，value 是参数的具体定义
	# 					"type": "string", # 使用 type 定义参数类型
	# 					"description": """
	# 						需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。
	# 					""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
	# 				}
	# 			}
	# 		}
	# 	}
	# }
]

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
        {"role": "user", "content": "请联网搜索 Context Caching，并告诉我它是什么。"} # 在提问中要求 Kimi 大模型联网搜索
    ],
    tools=tools, # <-- 我们通过 tools 参数，将定义好的 tools 提交给 Kimi 大模型
)

print(completion.choices[0].model_dump_json(indent=4))
```

**node.js**

```js theme={null}
const OpenAI = require("openai")
 
 
const client = new OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY, // 运行前请设置 MOONSHOT_API_KEY 环境变量
    baseURL: "https://api.moonshot.cn/v1",
})
 
const tools = [
	{
		"type": "function", // 约定的字段 type，目前支持 function 作为值
		"function": { // 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "search", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": ""/* 
				通过搜索引擎搜索互联网上的内容。
 
				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			*/, // 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { // 使用 parameters 字段来定义函数接收的参数
				"type": "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["query"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { // properties 中是具体的参数定义，你可以定义多个参数
					"query": { // 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", // 使用 type 定义参数类型
						"description": ""/*
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						*/ // 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	},
	// {
	// 	"type": "function", // 约定的字段 type，目前支持 function 作为值
	// 	"function": { // 当 type 为 function 时，使用 function 字段定义具体的函数内容
	// 		"name": "crawl", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
	// 		"description": """
	// 			根据网站地址（URL）获取网页内容。
	// 		""", // 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
	// 		"parameters": { // 使用 parameters 字段来定义函数接收的参数
	// 			"type": "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
	// 			"required": ["url"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
	// 			"properties": { // properties 中是具体的参数定义，你可以定义多个参数
	// 				"url": { // 在这里，key 是参数名称，value 是参数的具体定义
	// 					"type": "string", // 使用 type 定义参数类型
	// 					"description": """
	// 						需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。
	// 					""" // 使用 description 描述参数以便 Kimi 大模型更好地生成参数
	// 				}
	// 			}
	// 		}
	// 	}
	// }
]

async function main() {
    const completion = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            {role: "system", content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
            {role: "user", content: "请联网搜索 Context Caching，并告诉我它是什么。"} // 在提问中要求 Kimi 大模型联网搜索
        ],
        tools: tools, // <-- 我们通过 tools 参数，将定义好的 tools 提交给 Kimi 大模型
    })
     
    console.log(JSON.stringify(completion.choices[0], null, 4))
}

main()
```

代码运行成功后，模型返回如下内容：

```json theme={null}
{
    "finish_reason": "tool_calls",
    "message": {
        "content": "",
        "role": "assistant",
        "tool_calls": [
            {
                "id": "search:0",
                "function": {
                    "arguments": "{\n    \"query\": \"Context Caching\"\n}",
                    "name": "search"
                },
                "type": "function"
            }
        ]
    }
}
```

`finish_reason` 为 `tool_calls` 表示本次返回的不是模型回复，而是模型选择执行工具——可以通过 `finish_reason` 的值判断当前回复是否是一次工具调用。

此时 `message` 中的 `content` 为空，因为模型还在执行 `tool_calls`，尚未生成面向用户的回复；新增的 `tool_calls` 字段是一个列表，包含本次需要调用的所有工具调用信息——这说明 **模型可以一次性选择多个工具进行调用，可以是多个不同的工具，也可以是相同工具使用不同参数进行调用** 。`tool_calls` 中每个元素都代表一次工具调用：模型为每次调用生成唯一的 `id`，用 `function.name` 表明工具函数名称，把执行参数放在 `function.arguments` 中（`arguments` 是合法的、被序列化的 JSON Object；`type` 目前是固定值 `function`）。

接下来，用模型生成的工具调用参数去执行具体的工具。

### 执行工具并回传结果

Kimi 大模型不会替你执行工具——收到模型生成的参数后，需要由你的应用自行执行。为什么模型不自己执行工具？设想一个典型场景： **你向用户提供一个基于 Kimi 大模型的智能机器人，在这个场景有三个角色：用户、机器人、Kimi 大模型。用户向机器人提问，机器人调用 Kimi 大模型 API，并将 API 的结果返回给用户。当使用 `tool_calls` 时，用户向机器人提问，机器人带着 `tools` 调用 Kimi API，Kimi 大模型返回 `tool_calls` 参数，机器人执行完 `tool_calls`，将结果再次提交给 Kimi API，Kimi 大模型生成返回给用户的消息（`finish_reason=stop`），此时机器人才会把消息返回给用户。** 整个 `tool_calls` 过程对用户而言是透明、隐式的：用户并不直接“看到”工具调用，只看到机器人返回的最终回复。

下面的完整示例以“机器人”的视角执行模型返回的 `tool_calls`，演示工具执行循环：

**python**

```python theme={null}
from typing import *

import json
import httpx
import os

from openai import OpenAI


client = OpenAI(
    api_key=os.environ["MOONSHOT_API_KEY"], # 运行前请设置 MOONSHOT_API_KEY 环境变量
    base_url="https://api.moonshot.cn/v1",
)

tools = [
	{
		"type": "function", # 约定的字段 type，目前支持 function 作为值
		"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "search", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": """ 
				通过搜索引擎搜索互联网上的内容。

				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { # 使用 parameters 字段来定义函数接收的参数
				"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["query"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { # properties 中是具体的参数定义，你可以定义多个参数
					"query": { # 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", # 使用 type 定义参数类型
						"description": """
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	},
	{
		"type": "function", # 约定的字段 type，目前支持 function 作为值
		"function": { # 当 type 为 function 时，使用 function 字段定义具体的函数内容
			"name": "crawl", # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
			"description": """
				根据网站地址（URL）获取网页内容。
			""", # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
			"parameters": { # 使用 parameters 字段来定义函数接收的参数
				"type": "object", # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
				"required": ["url"], # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
				"properties": { # properties 中是具体的参数定义，你可以定义多个参数
					"url": { # 在这里，key 是参数名称，value 是参数的具体定义
						"type": "string", # 使用 type 定义参数类型
						"description": """
							需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。
						""" # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
					}
				}
			}
		}
	}
]


def search_impl(query: str) -> List[Dict[str, Any]]:
    """
    search_impl 使用搜索引擎对 query 进行搜索，目前主流的搜索引擎（例如 Bing）都提供了 API 调用方式，你可以自行选择
    你喜欢的搜索引擎 API 进行调用，并将返回结果中的网站标题、网站链接、网站简介信息放置在一个 dict 中返回。

    这里只是一个简单的示例，你可能需要编写一些鉴权、校验、解析的代码。
    """
    r = httpx.get("https://your.search.api", params={"query": query})
    return r.json()


def search(arguments: Dict[str, Any]) -> Any:
    query = arguments["query"]
    result = search_impl(query)
    return {"result": result}


def crawl_impl(url: str) -> str:
    """
    crawl_url 根据 url 获取网页上的内容。

    这里只是一个简单的示例，在实际的网页抓取过程中，你可能需要编写更多的代码来适配复杂的情况，例如异步加载的数据等；同时，在获取
    网页内容后，你可以根据自己的需要对网页内容进行清洗，只保留文本或移除不必要的内容（例如广告信息等）。
    """
    r = httpx.get(url)
    return r.text


def crawl(arguments: dict) -> str:
    url = arguments["url"]
    content = crawl_impl(url)
    return {"content": content}


# 通过 tool_map 将每个工具名称及其对应的函数进行映射，以便在 Kimi 大模型返回 tool_calls 时能快速找到应该执行的函数
tool_map = {
    "search": search,
    "crawl": crawl,
}

messages = [
    {"role": "system",
     "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"},
    {"role": "user", "content": "请联网搜索 Context Caching，并告诉我它是什么。"}  # 在提问中要求 Kimi 大模型联网搜索
]

finish_reason = None

# 我们的基本流程是，带着用户的问题和 tools 向 Kimi 大模型提问，如果 Kimi 大模型返回了 finish_reason: tool_calls，则我们执行对应的 tool_calls，
# 将执行结果以 role=tool 的 message 的形式重新提交给 Kimi 大模型，Kimi 大模型根据 tool_calls 结果进行下一步内容的生成：
#
#   1. 如果 Kimi 大模型认为当前的工具调用结果已经可以回答用户问题，则返回 finish_reason: stop，我们会跳出循环，打印出 message.content；
#   2. 如果 Kimi 大模型认为当前的工具调用结果无法回答用户问题，需要再次调用工具，我们会继续在循环中执行接下来的 tool_calls，直到 finish_reason 不再是 tool_calls；
#
# 在这个过程中，只有当 finish_reason 为 stop 时，我们才会将结果返回给用户。

while finish_reason is None or finish_reason == "tool_calls":
    completion = client.chat.completions.create(
        model="kimi-k3.1-pro",
        messages=messages,
        tools=tools,  # <-- 我们通过 tools 参数，将定义好的 tools 提交给 Kimi 大模型
    )
    choice = completion.choices[0]
    finish_reason = choice.finish_reason
    if finish_reason == "tool_calls": # <-- 判断当前返回内容是否包含 tool_calls
        messages.append(choice.message) # <-- 我们将 Kimi 大模型返回给我们的 assistant 消息也添加到上下文中，以便于下次请求时 Kimi 大模型能理解我们的诉求
        for tool_call in choice.message.tool_calls: # <-- tool_calls 可能是多个，因此我们使用循环逐个执行
            tool_call_name = tool_call.function.name
            tool_call_arguments = json.loads(tool_call.function.arguments) # <-- arguments 是序列化后的 JSON Object，我们需要使用 json.loads 反序列化一下
            tool_function = tool_map[tool_call_name] # <-- 通过 tool_map 快速找到需要执行哪个函数
            tool_result = tool_function(tool_call_arguments)

            # 使用函数执行结果构造一个 role=tool 的 message，以此来向模型展示工具调用的结果；
            # 注意，我们需要在 message 中提供 tool_call_id 和 name 字段，以便 Kimi 大模型
            # 能正确匹配到对应的 tool_call。
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_call_name,
                "content": json.dumps(tool_result), # <-- 我们约定使用字符串格式向 Kimi 大模型提交工具调用结果，因此在这里使用 json.dumps 将执行结果序列化成字符串
            })

print(choice.message.content) # <-- 在这里，我们才将模型生成的回复返回给用户
```

**node.js**

```js theme={null}
const axios = require('axios');
const openai = require('openai'); // 需要安装 openai 库

const client = new openai.OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY, // 运行前请设置 MOONSHOT_API_KEY 环境变量
    baseURL: "https://api.moonshot.cn/v1",
});

const tools = [
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "通过搜索引擎搜索互联网上的内容。\n\n当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。\n搜索结果包含网站的标题、网站的地址（URL）以及网站简介。",
            "parameters": {
                "type": "object",
                "required": ["query"],
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "用户搜索的内容，请从用户的提问或聊天上下文中提取。"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "crawl",
            "description": "根据网站地址（URL）获取网页内容。",
            "parameters": {
                "type": "object",
                "required": ["url"],
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "需要获取内容的网站地址（URL），通常情况下从搜索结果中可以获取网站的地址。"
                    }
                }
            }
        }
    }
];

async function searchImpl(query) {
    const response = await axios.get("https://your.search.api", { params: { query } });
    return response.data;
}

async function search(args) {
    const query = args.query;
    const result = await searchImpl(query);
    return { "result": result };
}

async function crawlImpl(url) {
    const response = await axios.get(url);
    return response.data;
}

async function crawl(args) {
    const url = args.url;
    const content = await crawlImpl(url);
    return { "content": content };
}

const toolMap = {
    "search": search,
    "crawl": crawl,
};

const messages = [
    { "role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。" },
    { "role": "user", "content": "请联网搜索 Context Caching，并告诉我它是什么。" }  // 在提问中要求 Kimi 大模型联网搜索
];

let finishReason = null;
let choice;

async function main() {
    while (finishReason === null || finishReason === "tool_calls") {
        const completion = await client.chat.completions.create({
            model: "kimi-k3.1-pro",
            messages: messages,
            tools: tools,  // <-- 我们通过 tools 参数，将定义好的 tools 提交给 Kimi 大模型
        });
        choice = completion.choices[0];
        finishReason = choice.finish_reason;
        if (finishReason === "tool_calls") { // <-- 判断当前返回内容是否包含 tool_calls
            messages.push(choice.message); // <-- 我们将 Kimi 大模型返回给我们的 assistant 消息也添加到上下文中，以便于下次请求时 Kimi 大模型能理解我们的诉求
            for (const toolCall of choice.message.tool_calls) { // <-- tool_calls 可能是多个，因此我们使用循环逐个执行
                const toolCallName = toolCall.function.name;
                const toolCallArguments = JSON.parse(toolCall.function.arguments); // <-- arguments 是序列化后的 JSON Object，我们需要使用 JSON.parse 反序列化一下
                const toolFunction = toolMap[toolCallName]; // <-- 通过 tool_map 快速找到需要执行哪个函数
                const toolResult = await toolFunction(toolCallArguments);

                // 使用函数执行结果构造一个 role=tool 的 message，以此来向模型展示工具调用的结果；
                // 注意，我们需要在 message 中提供 tool_call_id 和 name 字段，以便 Kimi 大模型
                // 能正确匹配到对应的 tool_call。
                messages.push({
                    "role": "tool",
                    "tool_call_id": toolCall.id,
                    "name": toolCallName,
                    "content": JSON.stringify(toolResult), // <-- 我们约定使用字符串格式向 Kimi 大模型提交工具调用结果，因此在这里使用 JSON.stringify 将执行结果序列化成字符串
                });
            }
        }
    }
    console.log(choice.message.content); // <-- 在这里，我们才将模型生成的回复返回给用户
}

main();
```

我们使用 while 循环来执行包含工具调用在内的代码逻辑，这是因为 Kimi 大模型通常不会只执行一次工具调用，尤其是在联网搜索这个场景，通常，Kimi 大模型会先选择调用 `search` 工具，通过 `search` 工具获取搜索结果后，再调用 `crawl` 工具将搜索结果中的 `url` 转换为具体的网页内容，整体的 messages 结构如下所示：

```
system: prompt                                                                                               # 系统提示词
user: prompt                                                                                                 # 用户提问
assistant: tool_call(name=search, arguments={query: query})                                                  # Kimi 大模型返回 tool_call 调用（单个）                            
tool: search_result(tool_call_id=tool_call.id, name=search)                                                  # 提交 tool_call 执行结果
assistant: tool_call_1(name=crawl, arguments={url: url_1}), tool_call_2(name=crawl, arguments={url: url_2})  # Kimi 大模型继续返回 tool_calls 调用（多个）
tool: crawl_content(tool_call_id=tool_call_1.id, name=crawl)                                                 # 提交 tool_call_1 执行结果
tool: crawl_content(tool_call_id=tool_call_2.id, name=crawl)                                                 # 提交 tool_call_2 执行结果
assistant: message_content(finish_reason=stop)                                                               # Kimi 大模型生成面向用户的回复消息，本轮对话结束
```

至此，我们完成了“联网查询”工具调用的全过程，如果你实现了自己的 `search` 和 `crawl` 方法，那么当你向 Kimi 大模型要求联网查询时，它会调用 `search` 和 `crawl` 两个工具，并根据工具调用结果给予你正确的回复。

## 处理流式输出中的 tool\_calls

流式输出模式（`stream`）下，`tool_calls` 同样适用，但有几点需要额外注意：

* 在流式输出的过程中，由于 `finish_reason` 将会在最后的数据块中出现，因此建议使用 `delta.tool_calls` 字段是否存在来判断当前回复是否包含工具调用；
* 在流式输出的过程中，会先输出 `delta.content`，再输出 `delta.tool_calls`，因此你必须等待 `delta.content` 输出完成后，才能判断和识别 `tool_calls`；
* 在流式输出的过程中，我们会在最初的数据块中，指明当前调用 `tool_calls` 的 `tool_call.id` 和 `tool_call.function.name`，在后续的数据块中将只输出 `tool_call.function.arguments`；
* 在流式输出的过程中，如果 Kimi 大模型一次性返回多个 `tool_calls`，那么我们会额外使用一个名为 `index` 的字段来标识当前 `tool_call` 的索引，以便于你能正确拼接 `tool_call.function.arguments` 参数，我们使用流式输出章节中的代码例子（不使用 SDK 的场合）来说明如何操作：

**python**

```python theme={null}
import os
import json
import httpx

tools = [
    {
        "type": "function",  # 约定的字段 type，目前支持 function 作为值
        "function": {  # 当 type 为 function 时，使用 function 字段定义具体的函数内容
            "name": "search",  # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
            "description": """ 
				通过搜索引擎搜索互联网上的内容。

				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			""",  # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
            "parameters": {  # 使用 parameters 字段来定义函数接收的参数
                "type": "object",  # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
                "required": ["query"],  # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
                "properties": {  # properties 中是具体的参数定义，你可以定义多个参数
                    "query": {  # 在这里，key 是参数名称，value 是参数的具体定义
                        "type": "string",  # 使用 type 定义参数类型
                        "description": """
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						"""  # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
                    }
                }
            }
        }
    },
]

header = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ.get('MOONSHOT_API_KEY')}",
}

data = {
    "model": "kimi-k3.1-pro",
    "messages": [
        {"role": "user", "content": "请联网搜索 Context Caching 技术。"}
    ],
    "stream": True,
    "tools": tools,  # <-- 添加工具调用
}

# 使用 httpx 向 Kimi 大模型发出 chat 请求，并获得响应 r
r = httpx.post("https://api.moonshot.cn/v1/chat/completions",
               headers=header,
               json=data)
if r.status_code != 200:
    raise Exception(r.text)

data: str

# 在这里，我们预先构建一个 List，用于存放不同的回复消息，由于我们设置了 n=2，因此我们将 List 初始化为 2 个元素
messages = [{}, {}]

# 在这里，我们使用了 iter_lines 方法来逐行读取响应体
for line in r.iter_lines():
    # 去除每一行收尾的空格，以便更好地处理数据块
    line = line.strip()

    # 接下来我们要处理三种不同的情况：
    #   1. 如果当前行是空行，则表明前一个数据块已接收完毕（即前文提到的，通过两个换行符结束数据块传输），我们可以对该数据块进行反序列化，并打印出对应的 content 内容；
    #   2. 如果当前行为非空行，且以 data: 开头，则表明这是一个数据块传输的开始，我们去除 data: 前缀后，首先判断是否是结束符 [DONE]，如果不是，将数据内容保存到 data 变量；
    #   3. 如果当前行为非空行，但不以 data: 开头，则表明当前行仍然归属上一个正在传输的数据块，我们将当前行的内容追加到 data 变量尾部；

    if len(line) == 0:
        chunk = json.loads(data)

        # 通过循环获取每个数据块中所有的 choice，并获取 index 对应的 message 对象
        for choice in chunk["choices"]:
            index = choice["index"]
            message = messages[index]
            usage = choice.get("usage")
            if usage:
                message["usage"] = usage
            delta = choice["delta"]
            role = delta.get("role")
            if role:
                message["role"] = role
            content = delta.get("content")
            if content:
                if "content" not in message:
                    message["content"] = content
                else:
                    message["content"] = message["content"] + content

            # 从这里，我们开始处理 tool_calls
            tool_calls = delta.get("tool_calls")  # <-- 先判断数据块中是否包含 tool_calls
            if tool_calls:
                if "tool_calls" not in message:
                    message["tool_calls"] = []  # <-- 如果包含 tool_calls，我们初始化一个列表来保存这些 tool_calls，注意此时的列表中没有任何元素，长度为 0
                for tool_call in tool_calls:
                    tool_call_index = tool_call["index"]  # <-- 获取当前 tool_call 的 index 索引
                    if len(message["tool_calls"]) < (
                            tool_call_index + 1):  # <-- 根据 index 索引扩充 tool_calls 列表，以便于我们能通过下标访问到对应的 tool_call
                        message["tool_calls"].extend([{}] * (tool_call_index + 1 - len(message["tool_calls"])))
                    tool_call_object = message["tool_calls"][tool_call_index]  # <-- 根据下标访问对应的 tool_call
                    tool_call_object["index"] = tool_call_index

                    # 下面的步骤，是根据数据块中的信息填充每个 tool_call 的 id、type、function 字段
                    # 在 function 字段中，又包括 name 和 arguments 字段，arguments 字段会由每个数据块
                    # 依次补充，如同 delta.content 字段一般。

                    tool_call_id = tool_call.get("id")
                    if tool_call_id:
                        tool_call_object["id"] = tool_call_id
                    tool_call_type = tool_call.get("type")
                    if tool_call_type:
                        tool_call_object["type"] = tool_call_type
                    tool_call_function = tool_call.get("function")
                    if tool_call_function:
                        if "function" not in tool_call_object:
                            tool_call_object["function"] = {}
                        tool_call_function_name = tool_call_function.get("name")
                        if tool_call_function_name:
                            tool_call_object["function"]["name"] = tool_call_function_name
                        tool_call_function_arguments = tool_call_function.get("arguments")
                        if tool_call_function_arguments:
                            if "arguments" not in tool_call_object["function"]:
                                tool_call_object["function"]["arguments"] = tool_call_function_arguments
                            else:
                                tool_call_object["function"]["arguments"] = tool_call_object["function"][
                                                                            "arguments"] + tool_call_function_arguments  # <-- 依次补充 function.arguments 字段的值
                    message["tool_calls"][tool_call_index] = tool_call_object

            data = ""  # 重置 data
    elif line.startswith("data: "):
        data = line[len("data: "):]

        # 当数据块内容为 [DONE] 时，则表明所有数据块已发送完毕，可断开网络连接
        if data == "[DONE]":
            break
    else:
        data = data + "\n" + line  # 我们仍然在追加内容时，为其添加一个换行符，因为这可能是该数据块有意将数据分行展示

# 在组装完所有 messages 后，我们分别打印其内容
for index, message in enumerate(messages):
    print("index:", index)
    print("message:", json.dumps(message, ensure_ascii=False))
    print("")
```

**node.js**

```js theme={null}
const os = require('os');
const axios = require('axios');// 使用 axios 库来执行 HTTP 请求
 
const tools = [
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "通过搜索引擎搜索互联网上的内容。\n\n当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。\n搜索结果包含网站的标题、网站的地址（URL）以及网站简介。",
            "parameters": {
                "type": "object",
                "required": ["query"],
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "用户搜索的内容，请从用户的提问或聊天上下文中提取。"
                    }
                }
            }
        }
    },
];
 
const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`
};
 
const data = {
    "model": "kimi-k3.1-pro",
    "messages": [
        {"role": "user", "content": "请联网搜索 Context Caching 技术。"}
    ],
    "stream": true,
    "tools": tools,
    "tool_choice": "auto"
};
 
axios.post("https://api.moonshot.cn/v1/chat/completions", 
    data,{
    headers: header,
    responseType: 'stream'   
}).then(response => {
    if (response.status !== 200) {
        throw new Error(response.text);
    }
    
    let data = "";
    let messages = [{}, {}];
 
    response.data.on('data', chunk => {
        let line = chunk.toString().trim();
 
        if (line === "") {
            let chunk = JSON.parse(data);
 
            for (let choice of chunk.choices) {
                let index = choice.index;
                let message = messages[index];
                let usage = choice.usage;
                if (usage) message.usage = usage;
                let delta = choice.delta;
                let role = delta.role;
                if (role) message.role = role;
                let content = delta.content;
                if (content) message.content = (message.content || "") + content;
 
                let tool_calls = delta.tool_calls;
                if (tool_calls) {
                    if (!message.tool_calls) message.tool_calls = [];
                    for (let tool_call of tool_calls) {
                        let tool_call_index = tool_call.index;
                        while (message.tool_calls.length < tool_call_index + 1) {
                            message.tool_calls.push({});
                        }
                        let tool_call_object = message.tool_calls[tool_call_index];
                        tool_call_object.index = tool_call_index;
 
                        let tool_call_id = tool_call.id;
                        if (tool_call_id) tool_call_object.id = tool_call_id;
                        let tool_call_type = tool_call.type;
                        if (tool_call_type) tool_call_object.type = tool_call_type;
                        let tool_call_function = tool_call.function;
                        if (tool_call_function) {
                            if (!tool_call_object.function) tool_call_object.function = {};
                            let tool_call_function_name = tool_call_function.name;
                            if (tool_call_function_name) tool_call_object.function.name = tool_call_function_name;
                            let tool_call_function_arguments = tool_call_function.arguments;
                            if (tool_call_function_arguments) {
                                if (!tool_call_object.function.arguments) {
                                    tool_call_object.function.arguments = tool_call_function_arguments;
                                } else {
                                    tool_call_object.function.arguments = tool_call_object.function.arguments + tool_call_function_arguments;
                                }
                            }
                        }
                        message.tool_calls[tool_call_index] = tool_call_object;
                    }
                }
            }
            data = ""; // 重置 data
        } else if (line.startsWith("data: ")) {
            data = line.substring(6);
        } else {
            data = data + "\n" + line;
        }
    });
 
    response.data.on('end', () => {
        for (let index = 0; index < messages.length; index++) {
            console.log("index:", index);
            console.log("message:", JSON.stringify(messages[index], null, 4));
            console.log("");
        }
    });
}).catch(error => {
    console.error("请求失败:", error);
});
```

以下是使用 openai SDK 处理流式输出中的 `tool_calls` 的代码示例：

**python**

```python theme={null}
import os
import json

from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("MOONSHOT_API_KEY"),
    base_url="https://api.moonshot.cn/v1",
)

tools = [
    {
        "type": "function",  # 约定的字段 type，目前支持 function 作为值
        "function": {  # 当 type 为 function 时，使用 function 字段定义具体的函数内容
            "name": "search",  # 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
            "description": """ 
				通过搜索引擎搜索互联网上的内容。

				当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。
				搜索结果包含网站的标题、网站的地址（URL）以及网站简介。
			""",  # 函数的介绍，在这里写上函数的具体作用以及使用场景，以便 Kimi 大模型能正确地选择使用哪些函数
            "parameters": {  # 使用 parameters 字段来定义函数接收的参数
                "type": "object",  # 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
                "required": ["query"],  # 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
                "properties": {  # properties 中是具体的参数定义，你可以定义多个参数
                    "query": {  # 在这里，key 是参数名称，value 是参数的具体定义
                        "type": "string",  # 使用 type 定义参数类型
                        "description": """
							用户搜索的内容，请从用户的提问或聊天上下文中提取。
						"""  # 使用 description 描述参数以便 Kimi 大模型更好地生成参数
                    }
                }
            }
        }
    },
]

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "user", "content": "请联网搜索 Context Caching 技术。"}
    ],
    stream=True,
    tools=tools,  # <-- 添加工具调用
)

# 在这里，我们预先构建一个 List，用于存放不同的回复消息，由于我们设置了 n=2，因此我们将 List 初始化为 2 个元素
messages = [{}, {}]

for chunk in completion:
    # 通过循环获取每个数据块中所有的 choice，并获取 index 对应的 message 对象
    for choice in chunk.choices:
        index = choice.index
        message = messages[index]
        delta = choice.delta
        role = delta.role
        if role:
            message["role"] = role
        content = delta.content
        if content:
            if "content" not in message:
                message["content"] = content
            else:
                message["content"] = message["content"] + content

        # 从这里，我们开始处理 tool_calls
        tool_calls = delta.tool_calls  # <-- 先判断数据块中是否包含 tool_calls
        if tool_calls:
            if "tool_calls" not in message:
                message["tool_calls"] = []  # <-- 如果包含 tool_calls，我们初始化一个列表来保存这些 tool_calls，注意此时的列表中没有任何元素，长度为 0
            for tool_call in tool_calls:
                tool_call_index = tool_call.index  # <-- 获取当前 tool_call 的 index 索引
                if len(message["tool_calls"]) < (
                        tool_call_index + 1):  # <-- 根据 index 索引扩充 tool_calls 列表，以便于我们能通过下标访问到对应的 tool_call
                    message["tool_calls"].extend([{}] * (tool_call_index + 1 - len(message["tool_calls"])))
                tool_call_object = message["tool_calls"][tool_call_index]  # <-- 根据下标访问对应的 tool_call
                tool_call_object["index"] = tool_call_index

                # 下面的步骤，是根据数据块中的信息填充每个 tool_call 的 id、type、function 字段
                # 在 function 字段中，又包括 name 和 arguments 字段，arguments 字段会由每个数据块
                # 依次补充，如同 delta.content 字段一般。

                tool_call_id = tool_call.id
                if tool_call_id:
                    tool_call_object["id"] = tool_call_id
                tool_call_type = tool_call.type
                if tool_call_type:
                    tool_call_object["type"] = tool_call_type
                tool_call_function = tool_call.function
                if tool_call_function:
                    if "function" not in tool_call_object:
                        tool_call_object["function"] = {}
                    tool_call_function_name = tool_call_function.name
                    if tool_call_function_name:
                        tool_call_object["function"]["name"] = tool_call_function_name
                    tool_call_function_arguments = tool_call_function.arguments
                    if tool_call_function_arguments:
                        if "arguments" not in tool_call_object["function"]:
                            tool_call_object["function"]["arguments"] = tool_call_function_arguments
                        else:
                            tool_call_object["function"]["arguments"] = tool_call_object["function"][
                                                                            "arguments"] + tool_call_function_arguments  # <-- 依次补充 function.arguments 字段的值
                message["tool_calls"][tool_call_index] = tool_call_object

# 在组装完所有 messages 后，我们分别打印其内容
for index, message in enumerate(messages):
    print("index:", index)
    print("message:", json.dumps(message, ensure_ascii=False))
    print("")
```

**node.js**

```js theme={null}
const os = require('os');
const openai = require('openai'); // 需要安装 openai 库

const client = new openai.OpenAI({
    apiKey: process.env.MOONSHOT_API_KEY,
    baseURL: "https://api.moonshot.cn/v1"
});

const tools = [
    {
        "type": "function",
        "function": {
            "name": "search",
            "description": "通过搜索引擎搜索互联网上的内容。\n\n当你的知识无法回答用户提出的问题，或用户请求你进行联网搜索时，调用此工具。请从与用户的对话中提取用户想要搜索的内容作为 query 参数的值。\n搜索结果包含网站的标题、网站的地址（URL）以及网站简介。",
            "parameters": {
                "type": "object",
                "required": ["query"],
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "用户搜索的内容，请从用户的提问或聊天上下文中提取。"
                    }
                }
            }
        }
    },
];

async function main() {
    const response = await client.chat.completions.create({
        model: "kimi-k3.1-pro",
        messages: [
            { "role": "user", "content": "请联网搜索 Context Caching 技术。" }
        ],
        stream: true,
        tools: tools,
        tool_choice: "auto"
    });

    let messages = [{}, {}];
    let data = '';

    for await (const chunk of response) {
         for (const choice of chunk.choices) {
            const index = choice.index;
            const message = messages[index];
            const delta = choice.delta;
            const role = delta.role;
            if (role) message.role = role;
            const content = delta.content;
            if (content) message.content = (message.content || "") + content;

            const tool_calls = delta.tool_calls;
            if (tool_calls) {
                if (!message.tool_calls) message.tool_calls = [];
                for (const tool_call of tool_calls) {
                    const tool_call_index = tool_call.index;
                    if (message.tool_calls.length < tool_call_index + 1) {
                        for (let i = message.tool_calls.length; i < tool_call_index + 1; i++) {
                            message.tool_calls.push({});
                        }
                    }
                    const tool_call_object = message.tool_calls[tool_call_index];
                    tool_call_object.index = tool_call_index;

                    const tool_call_id = tool_call.id;
                    if (tool_call_id) tool_call_object.id = tool_call_id;
                    const tool_call_type = tool_call.type;
                    if (tool_call_type) tool_call_object.type = tool_call_type;
                    const tool_call_function = tool_call.function;
                    if (tool_call_function) {
                        if (!tool_call_object.function) tool_call_object.function = {};
                        const tool_call_function_name = tool_call_function.name;
                        if (tool_call_function_name) tool_call_object.function.name = tool_call_function_name;
                        const tool_call_function_arguments = tool_call_function.arguments;
                        if (tool_call_function_arguments) {
                            if (!tool_call_object.function.arguments) {
                                tool_call_object.function.arguments = tool_call_function_arguments;
                            } else {
                                tool_call_object.function.arguments += tool_call_function_arguments;
                            }
                        }
                    }
                    message.tool_calls[tool_call_index] = tool_call_object;
                }
            }
        }
    }

    for (let index = 0; index < messages.length; index++) {
        console.log("index:", index);
        console.log("message:", JSON.stringify(messages[index], null, 2));
        console.log("");
    }
}

main().catch(console.error);
```

## 用 tool\_calls 代替 function\_call

`tool_calls` 由函数调用（`function_call`）进化而来，`function_call` 是 `tool_calls` 的子集——在某些特定语境下，或阅读兼容性代码时，可以将两者划等号。由于 OpenAI 已将 `function_call` 等参数（例如 `functions`）标记为“已废弃”，我们的 API 将不再支持 `function_call`，请用 `tool_calls` 代替。相比 `function_call`，`tool_calls` 有以下优点：

* 支持并行调用，Kimi 大模型可以一次返回多个 `tool_calls`，你可以在代码中使用并发的方式同时调用这些 `tool_call` 以减少时间消耗；
* 对于没有依赖关系的 `tool_calls`，Kimi 大模型也会倾向于并行调用，这相比于原顺序调用的 `function_call`，在一定程度上降低了 Tokens 消耗；

## 注意事项

* `finish_reason=tool_calls` 时，`message.content` 偶尔不为空：通常是模型在解释需要调用哪些工具、为什么调用。当工具调用耗时较长，或一轮对话需要串行多次调用工具时，这段描述性语句能减少用户等待的焦虑，也方便用户理解工具调用的流程并及时干预和矫正（例如终止错误的工具调用，或在下一轮对话中通过提示词矫正模型的工具选择）；
* `tools` 参数中的内容也会被计算在总 Tokens 中，请确保 `tools`、`messages` 中的 Tokens 总数合计不超过模型的上下文窗口大小。

### 保证每个 tool\_call 都有对应的 tool 消息

工具调用场景下，消息不再是 `system` / `user` / `assistant` 的简单交替：

```
system: ...
user: ...
assistant: ...
user: ...
assistant: ...
```

而是会变成：

```
system: ...
user: ...
assistant: ...
tool: ...
tool: ...
assistant: ...
```

当 Kimi 大模型生成了 `tool_calls` 时，请确保每一个 `tool_call` 都有对应的 `role=tool` 的 message，并且这条 message 设置了正确的 `tool_call_id`：`role=tool` 的 messages 数量与 `tool_calls` 的数量不一致会导致错误；`role=tool` 的 messages 中的 `tool_call_id` 与 `tool_calls` 中的 `tool_call.id` 无法对应也会导致错误。

### 排查 tool\_call\_id not found 错误

如果你遇到 `tool_call_id not found` 错误，可能是由于你未将 Kimi API 返回的 `role=assistant` 消息添加到 messages 列表中，正确的消息序列应该看起来像这样：

```
system: ...
user: ...
assistant: ...  # <-- 也许你并未将这一条 assistant message 添加到 messages 列表中
tool: ...
tool: ...
assistant: ...
```

你可以在每次收到 Kimi API 的返回值后，都执行 `messages.append(message)` 来将 Kimi API 返回的消息添加到消息列表中，以避免出现 `tool_call_id not found` 错误。

*注意：添加到 messages 列表中位于 `role=tool` 的 message 之前的 assistant messages，必须完整包含 Kimi API 返回的 `tool_calls` 字段及字段值。我们推荐直接将 Kimi API 返回的 `choice.message` “原封不动”地添加到 messages 列表中，以避免可能产生的错误。*
