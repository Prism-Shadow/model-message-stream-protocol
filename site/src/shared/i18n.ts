// The two languages of the site. English pages live at /, Chinese pages at /zh/; a visitor's
// stored preference or system language picks one on load (see Base.astro).

export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];

// the same path in the other language
export function localePath(locale: Locale, path: string): string {
  return locale === "zh" ? `/zh${path}` : path;
}

export function localeOf(pathname: string): Locale {
  return pathname === "/zh" || pathname.startsWith("/zh/") ? "zh" : "en";
}

export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
}

export const STRINGS = {
  en: {
    htmlLang: "en",
    siteTitle: "MMSP: Model Message Stream Protocol",
    description:
      "Integrate every model the same way. MMSP is one message format and one streaming grammar for every model provider, in Python and TypeScript.",
    nav: {
      overview: "Overview",
      quickstart: "Quickstart",
      protocol: "Protocol",
      reference: "Reference",
      tools: "Tools",
      changelog: "Changelog",
      github: "GitHub",
    },
    theme: { label: "Theme", light: "Light", dark: "Dark", system: "Follow system" },
    lang: { label: "Language", en: "English", zh: "中文", system: "Follow system" },
    docs: {
      title: "Documentation",
      onThisPage: "On this page",
      previous: "Previous",
      next: "Next",
      edit: "Edit this page on GitHub",
      copy: "Copy Markdown",
      copied: "Copied",
      copyFailed: "Copy failed",
      markdown: "Open as Markdown",
    },
    changelog: {
      title: "Changelog",
      description:
        "One line per release. Each links to the release's entries in the repository, where every change records what it did and, when it breaks something, how to migrate.",
    },
    footer: {
      license: "MMSP is open source under the Apache License 2.0, by Prism Shadow.",
      licenseLink: "License",
    },
    player: {
      label: "Recorded streams",
      pause: "Pause",
      play: "Play",
      input: "One codebase to call 1000+ models",
      events: "Streamed events",
      message: "Parsed message",
      nothing: "Nothing yet.",
      running: "The response is still running.",
      streaming: "still streaming",
      finish: "finish_reason",
      usage: "usage_metadata",
      tokens: "tokens",
      cached: "cached",
      prompt: "prompt",
      thoughts: "thoughts",
      response: "response",
    },
  },
  zh: {
    htmlLang: "zh-CN",
    siteTitle: "MMSP：Model Message Stream Protocol",
    description: "用同一种方式接入所有模型，减轻开发者接入不同模型的心智负担。MMSP 为所有模型服务商提供统一的消息格式和流式语法，支持 Python 与 TypeScript。",
    nav: {
      overview: "概览",
      quickstart: "快速开始",
      protocol: "协议",
      reference: "参考",
      tools: "工具",
      changelog: "更新日志",
      github: "GitHub",
    },
    theme: { label: "主题", light: "亮色", dark: "暗色", system: "跟随系统" },
    lang: { label: "语言", en: "English", zh: "中文", system: "跟随系统" },
    docs: {
      title: "文档",
      onThisPage: "本页目录",
      previous: "上一页",
      next: "下一页",
      edit: "在 GitHub 上编辑本页",
      copy: "复制 Markdown",
      copied: "已复制",
      copyFailed: "复制失败",
      markdown: "以 Markdown 打开",
    },
    changelog: {
      title: "更新日志",
      description: "每个版本一行，链接到仓库中该版本的变更条目。每条变更都记录具体改动，如果是破坏性变更，还会说明迁移方法。",
    },
    footer: {
      license: "MMSP 由 Prism Shadow 开源，采用 Apache License 2.0 许可证。",
      licenseLink: "许可证",
    },
    player: {
      label: "录制的流",
      pause: "暂停",
      play: "播放",
      input: "同一份代码调用 1000+ 模型",
      events: "流式事件传输",
      message: "消息解析结果",
      nothing: "暂无内容。",
      running: "响应仍在生成中。",
      streaming: "流式输出中",
      finish: "finish_reason",
      usage: "usage_metadata",
      tokens: "tokens",
      cached: "缓存",
      prompt: "提示词",
      thoughts: "思考",
      response: "回复",
    },
  },
} as const;

export type Strings = (typeof STRINGS)[Locale];
