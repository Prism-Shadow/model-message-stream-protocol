> Sources (fetched 2026-11-04, all public and read without a key): https://tokendance.space/docs/protocol-openai-image-generations.md, https://tokendance.space/docs/ark-image-generations.md, and the data behind the model page https://tokendance.space/models/seedream-5.0-lite, which renders in the browser from `GET https://tokendance.space/portal/api/models/seedream-5.0-lite`, `GET https://tokendance.space/portal/api/models/seedream-5.0-lite/endpoints/stats` and the public catalog `GET https://tokendance.space/gateway/v1/models`. Prices are CNY, the currency of the TokenDance catalog.

# TokenDance: seedream-5.0-lite

## 模型页数据（`/portal/api/models/seedream-5.0-lite`）

```json
{
  "id": "01KMM9QH8VZX83GM06Q4A6JEF4",
  "slug": "seedream-5.0-lite",
  "name": "ByteDance Seed: Seedream 5.0 lite",
  "context_length": 0,
  "description": "Seedream-5.0-lite 是字节跳动最新推出的图像生成模型。它首次集成了在线检索能力，能够引入实时网页信息，从而提升生成图像的时效性。同时，模型整体智能水平进一步升级，能够更加精准地理解复杂指令和视觉内容。此外，模型在世界知识广度、参考元素的一致性，以及各类专业场景下的生成质量方面也全面增强，更好地满足企业级视觉创作的需求。",
  "architecture": {
    "modality": "text,image→image",
    "input_modalities": [
      "text",
      "image"
    ],
    "output_modalities": [
      "image"
    ]
  },
  "author_id": "01KMM9HRD3AYGYFYJVYZCKSSFY",
  "created_at": 1774502790,
  "is_restricted": false,
  "sort_order": 0,
  "author": {
    "id": "01KMM9HRD3AYGYFYJVYZCKSSFY",
    "slug": "bytedance-seed",
    "name": "bytedance-seed",
    "icon": "https://tos.watcha.cn/tokendance/author-icons/20261028/originals/4e0f6119749854a9-01KMM9HRD3AYGYFYJVYZCKSSFY.png"
  },
  "provider_display_names": [
    "无问芯穹",
    "火山方舟"
  ],
  "supported_protocols": [
    "ark:image-generations",
    "openai:image-generations"
  ],
  "pricing": {
    "items": [
      {
        "id": "ark:image-generations:generated_images",
        "plans": [
          {
            "unit": "images",
            "rate": "0.22"
          }
        ]
      },
      {
        "id": "openai:image-generations:images",
        "plans": [
          {
            "unit": "images",
            "rate": "0.22"
          }
        ]
      }
    ]
  }
}
```

## 供应商端点（`/portal/api/models/seedream-5.0-lite/endpoints/stats`，去掉了实时统计字段）

```json
{
  "model_id": "01KMM9QH8VZX83GM06Q4A6JEF4",
  "endpoints": [
    {
      "id": "01KMMMM2NERC9AQAZZ1SY11PAJ",
      "display_name": "无问芯穹",
      "slug": "infini-ai",
      "supported_protocols": [
        "ark:image-generations",
        "openai:image-generations"
      ],
      "pricing": {
        "items": [
          {
            "id": "ark:image-generations:generated_images",
            "plans": [
              {
                "unit": "images",
                "rate": "0.22"
              }
            ]
          },
          {
            "id": "openai:image-generations:images",
            "plans": [
              {
                "unit": "images",
                "rate": "0.22"
              }
            ]
          }
        ]
      }
    },
    {
      "id": "01M0WHHSAF4NMBS2M6QQYVXB9X",
      "display_name": "火山方舟",
      "slug": "ark",
      "supported_protocols": [
        "ark:image-generations",
        "openai:image-generations"
      ],
      "pricing": {
        "items": [
          {
            "id": "ark:image-generations:generated_images",
            "plans": [
              {
                "unit": "images",
                "rate": "0.22"
              }
            ]
          },
          {
            "id": "openai:image-generations:images",
            "plans": [
              {
                "unit": "images",
                "rate": "0.22"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## 公开模型目录条目（`/gateway/v1/models`）

```json
{
  "id": "seedream-5.0-lite",
  "name": "ByteDance Seed: Seedream 5.0 lite",
  "created": 1774502790,
  "description": "Seedream-5.0-lite 是字节跳动最新推出的图像生成模型。它首次集成了在线检索能力，能够引入实时网页信息，从而提升生成图像的时效性。同时，模型整体智能水平进一步升级，能够更加精准地理解复杂指令和视觉内容。此外，模型在世界知识广度、参考元素的一致性，以及各类专业场景下的生成质量方面也全面增强，更好地满足企业级视觉创作的需求。",
  "context_length": 0,
  "supported_protocols": [
    "ark:image-generations",
    "openai:image-generations"
  ]
}
```

## OpenAI Image Generations 协议（`/docs/protocol-openai-image-generations.md`）

:::group

```bash title="cURL"
curl https://tokendance.space/gateway/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MODEL_ID",
    "prompt": "A cute cat playing with a ball of yarn",
    "n": 1,
    "size": "1024x1024"
  }'
```

```python title="Python"
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY", base_url="https://tokendance.space/gateway/v1")

response = client.images.generate(
    model="MODEL_ID",
    prompt="A cute cat playing with a ball of yarn",
    n=1,
    size="1024x1024",
)
print(response.data[0].url)
```

```javascript title="Node.js"
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  baseURL: 'https://tokendance.space/gateway/v1',
});

const response = await client.images.generate({
  model: 'MODEL_ID',
  prompt: 'A cute cat playing with a ball of yarn',
  n: 1,
  size: '1024x1024',
});
console.log(response.data[0].url);
```

:::

## 字节 Seedream 系列（`/docs/ark-image-generations.md`）

本页只记录通过 TokenDance Ark 生图协议调用 Seedream 时常见的参数问题。模型能力、价格和完整规格以 TokenDance 模型页及厂商官方资料为准。

## 调用地址

| 项 | 值 |
|---|---|
| 完整接口 | `POST https://tokendance.space/gateway/ark/v3/images/generations` |
| 鉴权 | `Authorization: Bearer YOUR_API_KEY` |
| 协议 ID | `ark:image-generations` |

`model` 填写 TokenDance [模型列表](/models)中的模型 ID。

## 最短调用

```bash title="文生图"
curl https://tokendance.space/gateway/ark/v3/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MODEL_ID",
    "prompt": "一只橙色复古收音机摆在木质书桌上，午后窗光，胶片质感。",
    "size": "2K",
    "response_format": "url",
    "output_format": "jpeg",
    "watermark": false
  }'
```

## 高频参数问题

### `image` 传字符串还是数组

- 文生图：不传 `image`。
- 单图生图：传图片 URL 或 Data URL 字符串。
- 多参考图：传图片数组，并在 `prompt` 中用“图1”“图2”说明各自用途。

```json title="多参考图关键字段"
{
  "model": "MODEL_ID",
  "prompt": "以图1的包袋为主体，融合图2的花纹和色彩。",
  "image": [
    "https://example.com/product.png",
    "https://example.com/pattern.png"
  ],
  "size": "2K"
}
```

图片 URL 必须允许服务端直接访问。使用需要登录、短时防盗链或已过期的地址时，通常会出现素材读取失败。

### `size` 使用档位还是像素

`size` 可以是模型支持的分辨率档位，也可能支持明确的 `宽x高`。不同模型的可选范围并不一致，不要在文档或业务代码中假设所有 Seedream 模型都支持同一组值。

如果接口提示尺寸错误：

1. 先改用模型页展示的标准分辨率档位。
2. 使用像素尺寸时检查宽高顺序和画幅比例。
3. 图生图出现拉伸时，先把输入图裁剪到目标画幅。

### `response_format` 和 `output_format` 的区别

| 参数 | 控制内容 |
|---|---|
| `response_format` | 结果如何返回：URL 或 Base64 数据 |
| `output_format` | 图片文件格式，例如 PNG 或 JPEG |
| `watermark` | 是否添加 AI 生成水印 |

`response_format: "url"` 时读取 `data[0].url`；使用 Base64 返回时读取对应的 Base64 字段。URL 可能有时效，生产环境应及时转存。

### 组图生成参数

支持组图的模型使用：

```json
{
  "sequential_image_generation": "auto",
  "sequential_image_generation_options": {
    "max_images": 4
  }
}
```

并非所有 Seedream 模型都支持组图。出现未知字段或能力不支持错误时，先从请求中删除这两个字段，再查看目标模型的协议能力。

### `stream` 与组图事件

只有支持流式生图的模型才能传 `stream: true`。常见事件包括单张成功、单张失败、整体完成和 `[DONE]`。生产代码不能在收到第一张图后就结束连接，应等待完成事件或流结束。

### 联网搜索工具

只有明确支持联网搜索的模型才能传：

```json
{
  "tools": [{"type": "web_search"}]
}
```

不要把 `tools` 作为所有生图请求的默认参数；模型不支持时应在适配层删除。

## 响应与用量

非流式响应主要读取 `data[]` 和 `usage`：

```json title="响应示意"
{
  "data": [{"url": "https://example.com/generated.png"}],
  "usage": {
    "generated_images": 1,
    "output_tokens": 100,
    "total_tokens": 100
  }
}
```

多图结果应遍历整个 `data` 数组，不要只读取 `data[0]`。

## 常见错误

| 现象 | 优先检查 |
|---|---|
| 图片读取失败 | URL 是否公开、未过期；Data URL 格式是否完整 |
| `size` 无效 | 目标模型是否支持该档位或像素尺寸 |
| 多参考图结果混乱 | 提示词是否明确引用“图1”“图2”及各自职责 |
| 组图或流式字段报错 | 目标模型是否支持对应能力；不支持时删除可选字段 |
| 返回 URL 失效 | 是否在任务完成后及时转存 |

## 协议资料

- [TokenDance Ark Image Generations 协议参考](/docs/protocol-ark-image-generations)

具体模型支持的参数与取值范围仍应以 TokenDance 模型页和页面顶部所列官方文档的最新内容为准。
