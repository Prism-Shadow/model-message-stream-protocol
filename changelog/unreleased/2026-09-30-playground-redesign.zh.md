# Playground 界面重新设计

- **Date:** 2026-09-30
- **Type:** feature
- **Scope:** `integration`

[English](2026-09-30-playground-redesign.md)

## 变更内容

- 设置项移入侧边栏，窄屏下为抽屉。对话区为居中的单栏，底部是悬浮的输入框，顶栏显示当前的模型与 client type。
- 页面跟随系统的亮色或暗色主题，侧边栏里的开关可以手动切换。
- 流式内容项按类型呈现：
  - 思考是可折叠的轨迹，显示“Thought for 2.3 s”，流式输出时展开。
  - 每个工具调用是一张卡片，显示名称和格式化后的参数。
  - 图片、音频和向量各有自己的卡片。
  - 页脚显示彩色的结束原因标签、token 数、耗时和复制按钮。
- 第一个 delta 到达前，有一个计时的等待提示。
- Thinking summary 与 tool choice 改为分段控件。
- 模型菜单可以筛选，便于在长的列表中查找；所有菜单都支持方向键。
- 图片可以粘贴或拖入输入框。
- Tools 与 Extra headers 输入无效时即时标出。
- 只含签名的思考项不再显示。
- 页面不再在运行时加载 Tailwind，唯一的外部请求是 Inter 与 JetBrains Mono 字体。
