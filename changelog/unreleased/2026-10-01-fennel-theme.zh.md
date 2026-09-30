# 主题色改为纯蓝，首页一屏展示

- **Date:** 2026-10-01
- **Type:** docs
- **Scope:** `site`, `integration`
- **PR:** [#238](https://github.com/Prism-Shadow/model-message-stream-protocol/pull/238)

[English](2026-10-01-fennel-theme.md)

## 变更内容

- 站点主题色改为 `#477dfb`，即 fennel flower 色相上的纯蓝，并以同一色相生成色阶。标志、favicon、Playground 与 Tracer 都使用新颜色；README 的头图、概念图、social preview 与截图都按新颜色重新生成。暗色主题下的文字使用 fennel flower 本色 `#7aa2f7`。
- 文档中 TypeScript 的 Tracer 与 Playground 改用 `npm run tracer` 和 `npm run playground` 启动；快速开始按所选语言提示所需的 Node.js 或 Python 版本。
- 顶栏的语言与主题按钮改为点击切换：语言切到另一种，主题在跟随系统、亮色、暗色之间循环。
- README 用 Tracer 的 GIF 动图替换了原来的视频，README 图片总大小从 2.7 MB 降到 0.7 MB（宽度不超过 1760 px、256 色 PNG、精简并重新压缩的 GIF）。
- 在桌面端，首页连同页脚一屏放下：录制的流最多缩小到 85%，再放不下时两个流面板变矮，并始终显示最新一行。手机仍可滚动。示例代码的标题改为「只需要一份代码」。
