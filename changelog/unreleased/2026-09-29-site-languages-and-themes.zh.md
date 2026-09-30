# 站点跟随系统语言与主题，并把 MMSP 交给编码助手

- **Date:** 2026-09-29
- **Type:** process
- **Scope:** `site`, `docs`

[English](2026-09-29-site-languages-and-themes.md)

## 变更内容

- 站点英文版在 `/`，中文版在 `/zh/`，十二个文档页和更新日志两种语言都有。首页和文档首页按浏览器语言打开；顶栏的语言菜单可以切换，选择保存在浏览器里，选定的语言对所有页面生效。指向其他页面的链接保持链接本身的语言，每个页面都为搜索引擎标注另一种语言的对应页。
- 主题跟随系统的亮色或暗色，顶栏的主题菜单可以固定其一。两项选择都在首次绘制前生效，页面不会闪现另一种语言或另一种主题。
- 首页新增“交给你的编码助手”一节：一行命令从仓库的 tarball 安装 `mmsp-python` 或 `mmsp-typescript` skill，另附一段提示词，让不支持 skill 的助手读取同一个文件。Agent skills 文档页有同样的内容。
- 首页的流现在同时展示输入与输出：上方是把同一条消息和同一个工具发给 Claude、GPT 或 Gemini 的 TypeScript 代码，只有模型 id 一行不同；下方是每个模型的流逐个事件回放，旁边是它们拼成的消息。stop 事件以 `finish_reason` 胶囊标签和 `usage_metadata` 每项一根柱的柱状图展示，并附总计。流在屏幕上时循环播放，“暂停”按钮可以停住。
- 首页快速开始按钮旁边新增 Install Agent Skill 按钮，复制一段让编码助手从仓库安装 `mmsp-python` 与 `mmsp-typescript` 两个 skill 的指令。
- Agent 循环页改为标准流程图：开始与结束两个端点、三个处理步骤、一个判断（响应里有没有 `tool_call.done`），以及回到下一轮的连线。读屏软件和该页的 Markdown 得到同样的步骤列表。
- 参照 killaislop.com 去掉站点上千篇一律的 AI 模板痕迹：紫色只留给选中的标签页和输出柱，不再铺满每段行内代码；“为什么选择 MMSP”去掉彩色左边框，改写成具体的特性；文档页去掉标题上方的大写小标；顶栏由毛玻璃改为实色；图标换成 Lucide 的，不再手绘。
- 中文页面与界面文案按地道的技术中文润色，事实一律以英文为准。`site/scripts/polish-zh.mjs` 通过 TokenDance 网关上的 DeepSeek 模型完成润色；代码块和 HTML 从原文还原，改动了行内代码、链接或页面结构的结果会被拒绝。
- 播放器的暂停按钮现在会在暂停与播放图标之间切换。
- 标志改为二乘二棋盘格上的四个字母，两格为紫色，格子之间没有空隙。favicon、README 的 header 和 social preview 都使用它。
- 新增“Agent 循环”一页，描述每个 agent 在 MMSP 上运行的循环，并给出 Python 与 TypeScript 的完整实现：流式输出，运行该轮请求的每个工具，把结果放在一条消息里送回，直到某一轮不再请求工具。
- 每个文档页的目录跟随阅读位置高亮，并有“复制 Markdown”按钮把本页作为 Markdown 复制。每个页面也以 Markdown 形式在自身 URL 加 `.md` 处提供，`/llms.txt` 为它们建立索引。
- 面向搜索引擎：`/sitemap.xml` 收录每个页面的两种语言，另有 `/robots.txt`、`favicon.ico`、完整的 Open Graph 与 Twitter 标签，以及结构化数据：首页为 `WebSite`，其余页面为 `TechArticle`。
- 顶栏的 GitHub 按钮显示仓库的 star 数，从 GitHub API 读取，在浏览器里保留一小时。
- 文档文件从 `site/src/docs/<page>.md` 移到 `site/src/docs/<page>.en.md` 与 `<page>.zh.md`。
