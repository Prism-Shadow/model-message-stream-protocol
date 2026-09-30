import type { Locale } from "./i18n";
import { STRINGS, localePath } from "./i18n";

export const SITE_NAME = "MMSP";
export const REPO_URL = "https://github.com/Prism-Shadow/model-message-stream-protocol";
export const RAW_URL = "https://raw.githubusercontent.com/Prism-Shadow/model-message-stream-protocol/main";
export const PYPI_URL = "https://pypi.org/project/mmsp/";
export const NPM_URL = "https://www.npmjs.com/package/@prismshadow/mmsp";
export const DISCORD_URL = "https://discord.gg/eFHKqqcU3D";
export const X_URL = "https://x.com/code_hiyouga";

type Text = Record<Locale, string>;

export interface DocLink {
  slug: string;
  title: Text;
}

export interface DocSection {
  id: string;
  title: Text;
  docs: DocLink[];
}

// the order of the sidebar, and of the previous / next links under every page
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "start",
    title: { en: "Get started", zh: "开始" },
    docs: [
      { slug: "introduction", title: { en: "Introduction", zh: "介绍" } },
      { slug: "quickstart", title: { en: "Quickstart", zh: "快速开始" } },
      { slug: "agent-loop", title: { en: "The agent loop", zh: "Agent 循环" } },
    ],
  },
  {
    id: "protocol",
    title: { en: "Protocol", zh: "协议" },
    docs: [
      { slug: "messages", title: { en: "Messages", zh: "消息" } },
      { slug: "streaming", title: { en: "Streaming", zh: "流式" } },
      { slug: "fidelity", title: { en: "Fidelity", zh: "Fidelity" } },
      { slug: "errors", title: { en: "Errors", zh: "错误" } },
    ],
  },
  {
    id: "reference",
    title: { en: "Reference", zh: "参考" },
    docs: [
      { slug: "client", title: { en: "Client", zh: "客户端" } },
      { slug: "configuration", title: { en: "Configuration", zh: "配置" } },
      { slug: "models", title: { en: "Models and endpoints", zh: "模型与端点" } },
      { slug: "usage", title: { en: "Token usage", zh: "Token 用量" } },
    ],
  },
  {
    id: "tools",
    title: { en: "Tools", zh: "工具" },
    docs: [
      { slug: "tracing", title: { en: "Tracer and playground", zh: "Tracer 与 Playground" } },
      { slug: "skills", title: { en: "Agent skills", zh: "Agent Skills" } },
    ],
  },
];

export const ALL_DOCS: DocLink[] = DOC_SECTIONS.flatMap((section) => section.docs);

export function sectionOf(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((section) => section.docs.some((doc) => doc.slug === slug));
}

// the top bar: the overview, one entry per part of the documentation, the changelog
export function navLinks(locale: Locale) {
  const s = STRINGS[locale].nav;
  return [
    { id: "overview", label: s.overview, href: localePath(locale, "/") },
    { id: "start", label: s.quickstart, href: localePath(locale, "/docs/quickstart/") },
    { id: "protocol", label: s.protocol, href: localePath(locale, "/docs/messages/") },
    { id: "reference", label: s.reference, href: localePath(locale, "/docs/client/") },
    { id: "tools", label: s.tools, href: localePath(locale, "/docs/tracing/") },
    { id: "changelog", label: s.changelog, href: localePath(locale, "/changelog/") },
  ];
}
