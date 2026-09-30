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
      "MMSP is one message format and one streaming grammar for every model provider, in Python and TypeScript.",
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
      label: "Recorded stream",
      replay: "Replay",
      asked: ", asked",
      events: "Events, as they arrive",
      message: "The message they add up to",
      nothing: "Nothing yet.",
      running: "The response is still running.",
      streaming: "still streaming",
      text: "Text",
      tool: "Thinking, then a tool call",
    },
  },
  zh: {
    htmlLang: "zh-CN",
    siteTitle: "MMSP：Model Message Stream Protocol",
    description: "MMSP 为所有模型服务商提供同一套消息格式与同一套流式语法，Python 与 TypeScript 两种实现。",
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
    },
    changelog: {
      title: "更新日志",
      description: "每个版本一行，链接到仓库里该版本的条目；每条变更都记录做了什么，破坏性变更还写明如何迁移。",
    },
    footer: {
      license: "MMSP 由 Prism Shadow 以 Apache License 2.0 开源。",
      licenseLink: "许可证",
    },
    player: {
      label: "录制的流",
      replay: "重放",
      asked: "，被问",
      events: "事件，按到达顺序",
      message: "它们拼成的消息",
      nothing: "还没有内容。",
      running: "回复仍在进行。",
      streaming: "仍在流式输出",
      text: "文本",
      tool: "先思考，再调用工具",
    },
  },
} as const;

export type Strings = (typeof STRINGS)[Locale];
