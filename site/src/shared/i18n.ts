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
      models: "Models",
      status: "Status",
      changelog: "Changelog",
      github: "GitHub",
    },
    theme: { label: "Theme", light: "Light", dark: "Dark", system: "Follow system" },
    lang: { label: "Language", en: "English", zh: "中文", switch: "Switch to 中文" },
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
    models: {
      title: "Models",
      description:
        "Every model MMSP supports: who serves it, its price, its live status, and the code that calls it.",
      models: "{n} models",
      providers: "{n} providers",
      probed: "{n} probed daily",
      search: "Search models",
      noMatch: "No model matches.",
      currency: "Currency",
      perMillion: "per 1M tokens",
      json: "The catalog as JSON",
      columns: {
        model: "Model",
        provider: "Provider",
        modalities: "Modalities",
        context: "Context",
        input: "Input",
        output: "Output",
        cached: "Cached",
        status: "Status",
      },
      modality: { Text: "Text", Image: "Image", Video: "Video", Audio: "Audio", Embed: "Embedding", in: "In", out: "Out" },
      kit: { show: "Code for {model}", copy: "Copy", copied: "Copied", copyFailed: "Copy failed", server: "Server", key: "Key" },
      status: { up: "Up", degraded: "Degraded", down: "Down", nokey: "No key", none: "Not probed", tps: "tok/s" },
    },
    status: {
      title: "Status",
      description:
        "A daily probe of the model channels MMSP watches: availability, time to first token, tokens per second, and what the probe costs.",
      // the worst status of the probed channels names the page; a channel without a key is left out
      overall: {
        up: "All systems normal",
        degraded: "Degraded performance",
        down: "Partial outage",
        allDown: "Major outage",
        nokey: "No keys configured",
        none: "No probe has run yet",
      },
      checked: "Checked {ago}",
      month: "Probe cost this month",
      runs: "{n} runs",
      ttft: "TTFT",
      tps: "TPS",
      tpsUnit: "tokens per second",
      cost: "Cost",
      daysAgo: "90 days ago",
      today: "Today",
      uptime: "Uptime over the days probed",
    },
    footer: {
      license: "MMSP is open source under the Apache License 2.0, by Prism Shadow.",
      licenseLink: "License",
    },
    player: {
      label: "Recorded streams",
      pause: "Pause",
      play: "Play",
      input: "Just one codebase",
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
      models: "模型",
      status: "状态",
      changelog: "更新日志",
      github: "GitHub",
    },
    theme: { label: "主题", light: "亮色", dark: "暗色", system: "跟随系统" },
    lang: { label: "语言", en: "English", zh: "中文", switch: "切换到 English" },
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
    models: {
      title: "模型",
      description: "MMSP 支持的所有模型：由谁提供、价格多少、此刻是否可用，以及调用它的代码。",
      models: "{n} 个模型",
      providers: "{n} 个服务商",
      probed: "每日探测 {n} 个",
      search: "搜索模型",
      noMatch: "没有匹配的模型。",
      currency: "货币",
      perMillion: "每百万 tokens",
      json: "JSON 格式的模型目录",
      columns: {
        model: "模型",
        provider: "服务商",
        modalities: "模态",
        context: "上下文",
        input: "输入",
        output: "输出",
        cached: "缓存",
        status: "状态",
      },
      modality: { Text: "文本", Image: "图像", Video: "视频", Audio: "音频", Embed: "向量", in: "输入", out: "输出" },
      kit: { show: "{model} 的调用代码", copy: "复制", copied: "已复制", copyFailed: "复制失败", server: "服务端", key: "密钥" },
      status: { up: "正常", degraded: "降级", down: "故障", nokey: "无密钥", none: "未探测", tps: "tok/s" },
    },
    status: {
      title: "状态",
      description: "每天探测 MMSP 关注的模型渠道：是否可用、首 token 延迟、每秒 token 数，以及探测本身的花费。",
      overall: {
        up: "全部正常",
        degraded: "性能降级",
        down: "部分故障",
        allDown: "全面故障",
        nokey: "未配置密钥",
        none: "尚未运行过探测",
      },
      checked: "{ago}检测",
      month: "本月探测费用",
      runs: "{n} 次",
      ttft: "TTFT",
      tps: "TPS",
      tpsUnit: "每秒 token 数",
      cost: "费用",
      daysAgo: "90 天前",
      today: "今天",
      uptime: "已探测天数中的可用比例",
    },
    footer: {
      license: "MMSP 由 Prism Shadow 开源，采用 Apache License 2.0 许可证。",
      licenseLink: "许可证",
    },
    player: {
      label: "录制的流",
      pause: "暂停",
      play: "播放",
      input: "只需要一份代码",
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
