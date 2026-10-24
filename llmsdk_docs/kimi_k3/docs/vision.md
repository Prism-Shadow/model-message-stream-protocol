> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 配置 Kimi 视觉模型

> 为 Kimi 多模态模型构建图片和视频输入，支持 base64、URL、文件上传与多图片对话。

Kimi 视觉模型（包括 `kimi-k3.1-pro`/`kimi-k3`/`kimi-k2.6`/`kimi-k2.7-code`/`kimi-k2.7-code-highspeed`）能够理解视觉内容，包括图片文字、图片颜色和物体形状等内容。`kimi-k3.1-pro`、`kimi-k3`、`kimi-k2.6`、`kimi-k2.7-code` 和 `kimi-k2.7-code-highspeed` 模型还能理解视频内容。需要让模型识别图片或视频时，按本页方式构造多模态请求。

## 用 base64 直接上传图片

以下示例把本地图片编码为 base64，通过 `image_url` 类型的消息部分传给 Kimi，并向它提问图片内容：

```python theme={null}
import os
import base64

from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("MOONSHOT_API_KEY"),
    base_url="https://api.moonshot.cn/v1",
)

# 在这里，你需要将 kimi.png 文件替换为你想让 Kimi 识别的图片的地址
image_path = "kimi.png"

with open(image_path, "rb") as f:
    image_data = f.read()

# 我们使用标准库 base64.b64encode 函数将图片编码成 base64 格式的 image_url
image_url = f"data:image/{os.path.splitext(image_path)[1].lstrip('.')};base64,{base64.b64encode(image_data).decode('utf-8')}"


completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {"role": "system", "content": "你是 Kimi。"},
        {
            "role": "user",
            # 注意这里，content 由原来的 str 类型变更为一个 list，这个 list 中包含多个部分的内容，图片（image_url）是一个部分（part），
            # 文字（text）是一个部分（part）
            "content": [
                {
                    "type": "image_url", # <-- 使用 image_url 类型来上传图片，内容为使用 base64 编码过的图片内容
                    "image_url": {
                        "url": image_url,
                    },
                },
                {
                    "type": "text",
                    "text": "请描述图片的内容。", # <-- 使用 text 类型来提供文字指令，例如"描述图片内容"
                },
            ],
        },
    ],
)

print(completion.choices[0].message.content)
```

使用 Vision 模型时，`message.content` 必须是 `array[object]`（即 JSON 数组）。**不要** 将 JSON 数组序列化后以 `string` 形式放入 `message.content`；这是非标准格式，不保证被当作视觉输入处理，不同模型或版本的行为可能不同。请始终使用下方的数组格式。

正确的格式——`content` 是包含多个部分的 JSON 数组：

```json theme={null}
{
    "model": "kimi-k3.1-pro",
    "messages":
    [
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"
        },
        {
            "role": "user",
            "content":
            [
                {
                    "type": "image_url",
                    "image_url":
                    {
                        "url": "data:image/png;base64,..."
                    }
                },
                {
                    "type": "text",
                    "text": "请描述这个图片"
                }
            ]
        }
    ]
}
```

错误的格式——数组被序列化成了字符串：

```json theme={null}
{
    "model": "kimi-k3.1-pro",
    "messages":
    [
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"
        },
        {
            "role": "user",
            "content": "[{\"type\": \"image_url\", \"image_url\": {\"url\": \"data:image/png;base64,...\"}}, {\"type\": \"text\", \"text\": \"请描述这个图片\"}]"
        }
    ]
}
```

## 用文件 ID 引用已上传的图片或视频

视频文件往往更大，可以先把图片或视频上传到 Moonshot，再通过文件 ID 引用，上传方式请参阅 [图片理解上传](https://platform.kimi.com/docs/api/files-upload.md)。以下示例上传一个视频文件，并通过 `ms://` 协议的 `video_url` 请求模型描述视频内容：

```python theme={null}
import os
from pathlib import Path

from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("MOONSHOT_API_KEY"),
    base_url="https://api.moonshot.cn/v1",
)

# 在这里，你需要将 video.mp4 文件替换为你想让 Kimi 识别的图片或视频的地址
video_path = "video.mp4"

file_object = client.files.create(file=Path(video_path), purpose="video")  # 上传视频到 Moonshot

completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"
        },
        {
            "role": "user",
            "content":
            [
                {
                    "type": "video_url",
                    "video_url":
                    {
                        "url": f"ms://{file_object.id}"  # 注意这里为 ms:// 而不是 base64 编码后的图片
                    }
                },
                {
                    "type": "text",
                    "text": "请描述这个视频"
                }
            ]
        }
    ]
)

print(completion.choices[0].message.content)
```

注意上面例子中 `video_url.url` 的格式为 `ms://<file-id>`，ms 为 moonshot storage 的缩写，这是 Moonshot 内部引用文件的协议。

## 支持的图片与视频格式

### 图片

图片支持以下格式（MIME 类型）：

* image/jpeg
* image/png
* image/gif
* image/webp
* image/bmp
* image/heic
* image/heif

注意：GIF、WebP 动图同样通过 `image_url` 方式传入，但底层可能会按视频解码，token 消耗也按视频方式计算。

### SVG

SVG 不支持作为图片输入：通过 `purpose="image"` 上传 SVG，或在 `image_url` 中传入 SVG（包括 base64 形式），都会被拒绝。如需让模型理解 SVG 内容，可以将 SVG 源码（XML 文本）直接放入 `messages` 中作为文本输入。

### 视频

视频支持以下格式（MIME 类型）：

* video/mp4
* video/mpeg
* video/mov
* video/avi
* video/x-flv
* video/mpg
* video/webm
* video/wmv
* video/3gpp

## 估算 token 消耗与费用

* 图片与视频按动态 token 计算：通过 [计算 token 接口](https://platform.kimi.com/docs/api/estimate.md)，可以在开始理解前获取包含图片或视频的请求的 token 消耗；
* 图片分辨率越高，消耗的 token 越多；视频由若干张关键帧组成，关键帧的数量越多、分辨率越高，token 消耗越多；
* Vision 模型根据模型推理的总 Tokens 计费，token 价格详见 [模型推理价格说明](https://platform.kimi.com/docs/pricing/chat.md)。

## 控制图片与视频分辨率

推荐图片分辨率不超过 4k（4096\*2160），视频分辨率不超过 1080p（1920\*1080）。再高的分辨率只会增加处理时间，也不会对模型理解的效果有提升。

## 在 base64 与文件上传之间选择

* 由于请求体的整体大小有限制，对于非常大的视频，必须使用上传文件的方式使用视觉理解功能；
* 对于需要多次引用的图片或视频，推荐使用文件上传的方式使用视觉理解功能；
* 关于上传文件的限制，请参阅 [文件上传](https://platform.kimi.com/docs/api/files-upload.md) 文档。

## 功能支持与限制

Vision 视觉模型支持的特性包括：

* 多轮对话
* 流式输出
* 工具调用
* JSON Mode
* Partial Mode

以下功能暂未支持或部分支持：

* URL 格式的图片：不支持，目前仅支持使用 base64 编码的图片内容和通过文件 ID 上传的图片/视频

其他限制：

* 图片数量：Vision 模型没有图片数量限制，但请确保请求的 Body 大小不超过 100M

不同模型对 `temperature`、`top_p`、`n` 等参数的取值约束不同，建议不要手动设置；各模型参数差异见 [模型参数配置差异](https://platform.kimi.com/docs/api/models-overview.md) 。
