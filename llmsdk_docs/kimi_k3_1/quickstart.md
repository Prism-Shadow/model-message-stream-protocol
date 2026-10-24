> ## Documentation Index
> Fetch the complete documentation index at: https://platform.kimi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Kimi K3.1 Pro

> 了解 Kimi K3.1 Pro 的 API 调用方式：推理强度、流式输出、视觉输入、工具调用与 100 万 token 上下文。

## 模型简介

Kimi K3.1 Pro 是全新 K3.1 系列的第一个模型，也是我们迄今能力最强的 3 万亿级参数模型，支持 100 万上下文。K3.1 Pro 在代码、3D 创作、金融研究和其他长程 Agent 能力上的提升尤为显著。

我们同步推出高速版模型 Kimi K3.1 Pro Highspeed，同等智能，输出速度约 2\~3 倍。完整模型权重将于 11 月 4 日前发布。

### 持续突破前沿

在 Kimi K3.1 Pro 的研发中，我们大幅增加了强化学习（RL）环节的算力投入。为了支撑数百个下游领域的大规模联合训练，我们优化了技术栈的每一层，包括 RL 框架、长上下文推理、训练效率、沙箱基础设施、调度系统，以及用于环境质量检查的共享平台等，确保每一份新增的 RL 算力都能转化为稳定、高效的回报。

![Kimi K3.1 Pro 基准测试总览](https://mintcdn.com/moonshotcn/S1lhkeghrNNZD90I/assets/pics/k3-1-pro/benchmark-grid.png?fit=max\&auto=format\&n=S1lhkeghrNNZD90I\&q=85\&s=acf7c179611340590e6ec5e1ede6a693)

在代码、Agent 和知识类基准上，K3.1 Pro 达到或接近最强闭源模型的水平。Terminal-Bench 4.0 通过真实环境中资源受限的终端任务考察编程智能体的能力，每项任务均设有严格的专项测试。K3.1 Pro 在此项评估中得分 65.7%，超过 GPT-6 Astra（58.2%），与 Claude Opus 5.5（66.4%）仅有微弱差距。Kimi Code Bench 3.0 Long-horizon 是我们内部的基准测试，覆盖多种工程领域，重点考察编程智能体的多步执行、工具调用和端到端问题解决能力。K3.1 Pro 在此项测试中得分 61.2%，高于 K3 的 55.95%。

![Terminal-Bench 4.0 得分与单任务成本对比](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/terminal-bench-pareto.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=af03ed3c7506bb0f6d711f714dc439d5)

[快速开始](https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart.md#get-started)

### 代码

各种规模的编码任务，Kimi K3.1 Pro 都能完成：小到在真实代码库里修复一个问题，大到从零搭建一个完整项目。它也为游戏和网页体验带来更考究的视觉风格，并且知道如何用合适的外部专业工具把它们做出来。

K3.1 Pro 能熟练使用 Unity、Unreal Engine、Godot 等游戏引擎，并结合网络搜索与 3D 生成，做出完整的体验。它产出的前端页面、Three.js 交互场景和 3D 资产，在构图、排版、动效和细节打磨上都有明显提升。以下案例均由 K3.1 Pro 端到端完成：

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/coding-celestial-palace.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=511f76b5bc18323c3b43d283d8e8b33e" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 在 Unreal Engine 5.8 中构建了一座神话般的东方天宫，其特色在于一个半径为 1,750 米的、拥有 36 个柱间的柱廊——该柱廊在 Blender 中通过程序化建模生成，并通过 Nanite 和 Lumen 渲染了 3,600 万个源三角形。使用的外部资源包括：Cloud Forge VDB 云、Poly Haven/ambientCG 8K 材质，以及 NASA LRO/LOLA 月球数据。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/coding-eastern-rpg.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=a859a646208f139c0955c73f9b61e630" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 使用 Unreal Engine 5.8 制作了一段以东方古代为主题的 3D 角色扮演游戏预告片，片中一名剑客穿梭于云海之中，掠过漂浮的岛屿，最终进入云端之上的一座古典城市。概念设计及部分资源灵感源自Rednote创作者@-Duduu-。使用的外部资源：犍陀罗佛像和水月观音的3D扫描数据（明尼阿波利斯艺术博物馆，CC0）。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/coding-godot-adventure.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=4b8690a28100e0b50f6add862b53797f" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 使用 Godot 4.7.2 制作了一款风格独特的 3D 动作冒险游戏。该项目包含五个可探索区域，拥有程序生成的地形、道路、水域、植被和村庄布局，同时具备第三人称战斗、两阶段的BOSS战、资源采集、昼夜循环以及篝火快速传送功能。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/coding-robotic-arm.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=88b1e2103657d04044ccde803b6eafa0" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 开发了一个基于浏览器的 3D 机械臂展示系统，其中包含爆炸图、透明外壳和剖面图。该系统通过代码生成了 2,317 个部件和 268 条动态布线路径，并已通过 55 项浏览器验证。

### 3D 建模

Kimi K3.1 Pro 模型擅长 3D 创作与空间推理。给它一段文字描述、一张草图或一张参考图，它能推断出物体的形状、比例和空间关系，并将其重建为可用的 3D 模型。Kimi K3.1 Pro 可以不依赖 MCP 连接器，直接编写并运行 Blender、SolidWorks、Rhino 等专业建模软件脚本，完成素材构建、几何与材质细化、场景搭建，最后将成果接入 Three.js 场景或游戏引擎。

![Kimi K3.1 Pro 在 BenchCAD 上的成绩](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/benchcad.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=9dbd088699868164679473b0cb535d76)

K3.1 Pro 擅长参数化建模，例如机械零件、建筑模型、多参数可配置的产品和定制家具。无需依赖 MCP 连接器，它可以直接编写并运行 Blender、CAD 等专业建模工具的脚本，完成素材的构建与细化，修改单个部件，并调整几何、材质与场景布局。

以下案例均由 Kimi K3.1 Pro 端到端完成，可直接用于品牌宣传片、游戏和交互式网页体验。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/3d-airport-blender.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=59852bb917565424fa4e8c11cc36a1c6" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 在 Blender 中构建了一个机场内的热带雨林山谷，并制作了一段时长 17.5 秒、分辨率为 1920×1080、帧率为 60 fps 的建模展示视频。
使用的工具：Blender、Python、Geometry Nodes、Cycles、Pillow、NumPy 和 FFmpeg。
使用的外部资源：来自 Poly Haven 的“Kloofendal 48d Partly Cloudy (Pure Sky)” 4K HDRI 素材，作者为 Greg Zaal 和 Jarod Guest，采用 CC0 许可，用于天空照明和环境反射。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/3d-turbofan-freecad.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=2f947192ca6ad311a0766a7ce2dc876b" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 使用 Python 在 FreeCAD 中构建了一个详细的涡扇发动机模型，涵盖了风扇、减速齿轮箱、压缩机、燃烧室、涡轮以及外部管道，共计 2,100 个实体。该项目支持分步装配、内部爆炸图，以及展示风扇、低压转子和高压转子分别以 2,780、8,590 和 12,400 RPM 转速运行的旋转动画。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/3d-modular-lamp.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=a0589a20ee06b833bc2b525b92941bdf" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 利用 Trimesh 技术，设计了一款由五部分组成的、可 3D 打印的台灯，其灵感源自福建土楼，将土楼独特的圆形建筑结构重新诠释为精致的镂空格栅。

<video autoPlay muted loop playsInline controls>
  <source src="https://mintcdn.com/moonshotcn/-xUrxJovTi8Hjz7V/assets/videos/k3-1-pro/3d-cathedral.mp4?fit=max&auto=format&n=-xUrxJovTi8Hjz7V&q=85&s=958b822353b371d5d75d70354a172852" type="video/mp4" />
</video>

视频介绍

Kimi K3.1 Pro 在 Blender 中构建了一个基于浏览器的交互式 3D 网页，创建了一座由约 330 万个三角面组成的教堂内部场景，并为 8,368 个组件添加了动画效果，其中包括肋拱穹顶、石雕以及生动逼真的彩色玻璃光影效果。使用的外部资源：来自 Poly Haven 的石材纹理（CC0）以及 Mylius 拍摄的彩绘玻璃照片（CC BY-SA 3.0）。

[快速开始](https://platform.kimi.com/docs/guide/kimi-k3-1-pro-quickstart.md#get-started)

### 金融

凭借更强的推理与工具调用能力，Kimi K3.1 Pro 能够端到端交付完整的金融工作流。在外部基准上，K3.1 Pro 在 Office QA Pro v2 和 SpreadsheetBench 2 上均取得最佳成绩，两项均超过 Opus 5.5、Fable 5.1 和 GPT 6 Astra。Office QA Pro v2 考察基于真实金融文档的复杂财务数据分析，涉及检索、跨文档核对与多步数值推理；SpreadsheetBench 2 评估端到端的电子表格工作流，包括财务建模、跨表公式依赖与错误诊断。在衡量完整投资工作流（从标的筛选到盈利能力分析）的 Frontier Finance 上，K3.1 Pro 相比 K3 也有提升。

![Kimi K3.1 Pro 金融基准测试成绩](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/finance-benchmark.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=5e6d5f87f61a24aec618bab9ddd7e390)

金融分析和投资研究对事实准确性有很高要求。为此，我们针对高难度真实工作场景和高难度提示词，对 K3.1 Pro 的事实准确性进行了专项优化。在用户标记过事实错误的一组去标识化对话测试中，相较于 k3，新模型的单项事实陈述错误率从 23.35% 降至 6.85%；包含至少一处事实错误的回答比例仅为前代的约 46.4%。（这是一项针对事实准确性的压力测试，样本刻意聚焦模型容易出错的情形，所报告的错误率不代表日常使用中的整体水平。）

![Kimi K3.1 Pro 幻觉基准成绩](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/finance-hallucination.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=c6aabf6d409a4dde1b408177118db920)

在 3 个内部金融基准上，K3.1 Pro 同样全面超过 K3：

![Kimi K3.1 Pro 内部金融基准成绩](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/finance-internal-benchmark.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=dbedcda5d4bd8aa6ca5f5583cd9b3ba6)

* 财务建模基准 Financial Modelling 考察真实建模任务中的公式联动、财务逻辑与最终工作簿质量，K3.1 Pro 较 K3 提高 14%。
* 金融研究基准Financial Research 用于检验模型能否完成真实场景下的金融研究工作，并在证据与截止条件约束下输出可核验的结果。K3.1 为较 K3 提升 20%。
* 商业运营基准 Business Operation 在模拟商业环境中考察长程经营管理与决策能力，涵盖资金管理、采购、库存分配与定价策略，以期末经营业绩为主要指标，K3.1 Pro 得分 37.0，约为 K3 的 4.2 倍。

### 网络安全

随着 K3.1 Pro 的能力不断提升，我们将更多精力投入到了解其安全能力的来源，以及我们能在多大程度上对其进行管控。为此，我们分析并评估了 K3.1 Pro 的漏洞研究能力，同时在训练过程中实施了针对性控制，在降低潜在滥用风险的同时，保留模型的通用实用性。

**识别并移除网络攻防相关数据**。在开发过程中，我们观察到随着后训练规模扩大，模型的漏洞研究性能持续提升。追溯这一趋势的来源，我们发现网络攻防相关内容嵌入了中期训练的通用语料中，网络攻防相关任务也存在于强化学习环境组合里。这是使用广泛数据进行训练带来的自然副产品。在内部模型的初步实验中，我们发现若在中期训练和强化学习阶段均不移除相关数据，下游网络攻防能力将大幅增强。这些发现为我们提供了具体的控制手段。在准备发布 K3.1 Pro 开放权重版本时，我们从两个训练阶段均识别并移除了网络攻防相关数据，同时保留了保障模型实用性所需的通用编程任务。我们未来将在每一训练阶段持续采取适当的控制措施，网络攻防相关数据的识别与限制便是其中之一。

**评估与结果**。完成数据清理后，我们使用自研的 xdev-bench-hard 基准测试对 K3.1 Pro 进行了评估。该测试由专家策划，包含基于源代码的漏洞发现与利用任务，并经过校准以在当前能力水平上实现有效区分。多数任务真实复现了 Linux 内核、Node.js、JavaScriptCore、Exim 和 VirGL 等软件中近期披露的漏洞，且各项缓解措施均已启用。每项任务提供存在漏洞的源代码、简短提示以及对应的二进制文件。智能体需要开发出漏洞利用程序，在独立沙箱中实现任意代码执行，并获取密钥字符串以通过自动验证。我们报告了 pass\@3 指标，未设置严格超时或输出 token 上限。

![Kimi K3.1 Pro 内部网络安全基准成绩](https://mintcdn.com/moonshotcn/gV5Qgn7kVhS9Hl-f/assets/pics/k3-1-pro/cyber-internal-bench.png?fit=max\&auto=format\&n=gV5Qgn7kVhS9Hl-f\&q=85\&s=1fe5fce78b10f23373b60b1fd63a3719)

在 xdev-bench-hard 上，若中期训练和强化学习阶段均未对网络攻防相关数据进行移除或过滤，模型在 pass\@3 指标上可解决 90.5% 的问题；最终版 K3.1 Pro 的得分则为 81.0%。对比表明，数据移除有效降低了漏洞研究能力，使其明显低于同一训练流程原本会产出的水平。与此同时，K3.1 Pro 仍较前代实现了大幅提升，说明即使在针对性移除相关数据后，更强的通用编程和长周期调试能力仍能泛化到此类任务上。K3.1 Pro 的网络攻防能力目前仍落后于那些已公开发布至少三个月的前沿闭源模型。我们将持续完善内部基准测试，确保在模型能力不断提升的同时，评估结果仍有参考价值。

**开放权重原则**。这些评估构成了我们发布开放权重版本的决策依据。首先，我们不希望发布推进网络攻防能力绝对前沿的开放权重。根据设计，K3.1 Pro 的攻击性安全能力低于原本训练流程会产出的水平，且仍低于前沿闭源模型。其次，我们计划逐步提升开放权重中可用的网络攻防能力。我们相信，开放 K3.1 Pro的权重，将更有益于出于防御目的而需要两用能力的群体。当能力强大的模型以开放形式提供，并能在用户可控的基础设施上运行时，更多团队将得以审查自身维护的代码，这其中包括那些极少接受专门安全审查的遗留系统。我们认为，让这一能力逐步扩散，而非将其集中在少数闭源系统中，最终将使所有软件变得更加安全。

## 访问条件

Kimi K3.1 Pro 是旗舰模型：在开放平台完成充值（最低充值金额 10 元）后即可解锁调用。新用户注册认证赠送的 15 元代金券不可用于 Kimi K3.1 Pro。

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

> [!NOTE]
>
> K3.1 Pro 提供高速版本 `kimi-k3.1-pro-highspeed`，模型 ID 与价格见 [产品定价](https://platform.kimi.com/docs/pricing/chat.md) 。

**Python**

```python theme={null}
completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    messages=[{"role": "user", "content": "用一句话介绍 Kimi K3.1 Pro。"}],
)

print(completion.choices[0].message.content)
```

**cURL**

```bash theme={null}
curl https://api.moonshot.cn/v1/chat/completions \
  --header "Authorization: Bearer $MOONSHOT_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "model": "kimi-k3.1-pro",
    "messages": [{"role": "user", "content": "用一句话介绍 Kimi K3.1 Pro。"}]
  }'
```

## 推理强度

K3.1 Pro 始终开启思考模式，并支持通过请求顶层 `reasoning_effort` 配置推理强度。推理强度支持 `low` / `high` / `max` 三档（默认 `max`）。用法见 [推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md) 。

```python theme={null}
completion = client.chat.completions.create(
    model="kimi-k3.1-pro",
    reasoning_effort="max",
    messages=[{"role": "user", "content": "证明根号 2 是无理数。"}],
)

print(completion.choices[0].message.content)
```

多轮对话和工具调用时，将 API 返回的完整 assistant message 原样加入下一次请求，不要只保留 `content`。

## 流式输出

流式响应分别提供推理增量 `reasoning_content` 和最终答案增量 `content`。更多细节见 [流式输出](https://platform.kimi.com/docs/guide/utilize-the-streaming-output-feature-of-kimi-api.md) 。

```python theme={null}
stream = client.chat.completions.create(
    model="kimi-k3.1-pro",
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
    model="kimi-k3.1-pro",
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
        model="kimi-k3.1-pro",
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
>     model="kimi-k3.1-pro",
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
    model="kimi-k3.1-pro",
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
>     model="kimi-k3.1-pro",
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
>     model="kimi-k3.1-pro",
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
>     model="kimi-k3.1-pro",
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
        model="kimi-k3.1-pro",
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

* 推理强度通过请求顶层 `reasoning_effort` 配置，支持 `low` / `high` / `max`（默认 `max`）；K3.1 Pro 始终开启思考模式。
* `max_completion_tokens` 默认 131072，最大可设置为 1048576。
* `temperature=1.0`、`top_p=0.95`、`n=1`、`presence_penalty=0`、`frequency_penalty=0` 为固定值，建议不要显式传入。
* 多轮对话和工具调用必须原样回传完整 assistant message。
* 视觉输入不支持公网图片 URL；请使用 base64 或 `ms://<file-id>`，并确保 `content` 是对象数组。
* 联网搜索正在更新，近期不建议用于生产流程。

## 常见问题

> **Kimi K3.1 Pro 如何计费？**
>
> Kimi K3.1 Pro 上下文长度为 1M tokens，计费不按上下文长度分段，所有用量均按量付费。计费项包括：缓存写入（区分 TTL 5min / TTL 1h 两档）、输入（区分缓存命中与未命中）和输出，均按统一单价计费，详见 [Kimi K3.1 Pro 定价](https://platform.kimi.com/docs/pricing/chat.md) 。

> **新用户赠送的 15 元代金券可以体验 Kimi K3.1 Pro 吗？**
>
> 不可以。模型发布后，国内注册并完成认证的用户获赠的 15 元代金券不可用于体验 Kimi K3.1 Pro，请充值后解锁使用。

> **Kimi K3.1 Pro 的思维链怎么关？**
>
> 目前关不了，K3.1 Pro 始终开启思考模式。如果觉得思考过程太长，可以将 `reasoning_effort` 设置为 `low` 降低推理强度，详见 [推理强度](https://platform.kimi.com/docs/guide/use-reasoning-effort.md)。

## 相关文档

> **[Kimi K3.1 Pro 定价](https://platform.kimi.com/docs/pricing/chat.md)**
>
> 查看输入与输出价格。

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
