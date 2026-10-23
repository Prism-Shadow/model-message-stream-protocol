import type { Locale } from "./i18n";
import { STRINGS, localePath } from "./i18n";

export const SITE_NAME = "MMSP";
export const REPO_URL = "https://github.com/Prism-Shadow/model-message-stream-protocol";
export const RAW_URL = "https://raw.githubusercontent.com/Prism-Shadow/model-message-stream-protocol/main";
export const PYPI_URL = "https://pypi.org/project/mmsp/";
export const NPM_URL = "https://www.npmjs.com/package/@prismshadow/mmsp";
export const DISCORD_URL = "https://discord.gg/eFHKqqcU3D";
export const X_URL = "https://x.com/code_hiyouga";

// The repository's stars as the page is built, so the top bar shows a count from the first paint
// and a fresh one only replaces its digits; one request serves the whole build.
let starsAtBuild: Promise<number | null> | undefined;
export function repoStars(): Promise<number | null> {
  starsAtBuild ??= fetch(REPO_URL.replace("https://github.com/", "https://api.github.com/repos/"), {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data && typeof data.stargazers_count === "number" ? data.stargazers_count : null))
    .catch(() => null);
  return starsAtBuild;
}

export function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(count);
}

type Text = Record<Locale, string>;

export interface DocLink {
  // the part of the site the page belongs to: the documentation at /docs/, or the RFCs at /rfcs/
  area: "docs" | "rfc";
  slug: string;
  // an RFC's NNNN, which its sidebar entry shows before the title
  number?: string;
  title: Text;
  // the lede of a page whose file carries no frontmatter
  description?: Text;
  // a page rendered from the repository's design/ folder: its file in each language, from the root
  source?: Text;
}

export interface DocSection {
  id: string;
  title: Text;
  docs: DocLink[];
}

// every RFC in design/rfcs/, in number order and titled by its first line, so a new file is a new page
const RFC_FILES = import.meta.glob<string>("../../../design/rfcs/MMSP-RFC-*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function rfcDocs(): DocLink[] {
  const title = (path: string) => RFC_FILES[path].match(/^# (.+)$/m)?.[1].trim() ?? path;
  return Object.keys(RFC_FILES)
    .filter((path) => !path.endsWith(".zh.md"))
    .sort()
    .map((path): DocLink => {
      const zh = RFC_FILES[path.replace(/\.md$/, ".zh.md")] ? path.replace(/\.md$/, ".zh.md") : path;
      const file = (glob: string) => glob.slice(glob.indexOf("design/"));
      const slug = path.slice(path.lastIndexOf("/") + 1, -".md".length).toLowerCase();
      return {
        area: "rfc",
        slug,
        number: slug.match(/^mmsp-rfc-(\d{4})/)?.[1],
        title: { en: title(path), zh: title(zh) },
        source: { en: file(path), zh: file(zh) },
      };
    });
}

// the order of the sidebar, and of the previous / next links under every page
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "start",
    title: { en: "Get started", zh: "开始" },
    docs: [
      { area: "docs", slug: "introduction", title: { en: "Introduction", zh: "介绍" } },
      { area: "docs", slug: "design", title: { en: "Design philosophy", zh: "设计哲学" } },
      { area: "docs", slug: "quickstart", title: { en: "Quickstart", zh: "快速开始" } },
      { area: "docs", slug: "agent-loop", title: { en: "The agent loop", zh: "Agent 循环" } },
    ],
  },
  {
    id: "protocol",
    title: { en: "Protocol", zh: "协议" },
    docs: [
      { area: "docs", slug: "messages", title: { en: "Messages", zh: "消息" } },
      { area: "docs", slug: "streaming", title: { en: "Streaming", zh: "流式" } },
      { area: "docs", slug: "fidelity", title: { en: "Fidelity", zh: "Fidelity" } },
      { area: "docs", slug: "errors", title: { en: "Errors", zh: "错误" } },
    ],
  },
  {
    id: "reference",
    title: { en: "Reference", zh: "参考" },
    docs: [
      { area: "docs", slug: "client", title: { en: "Client", zh: "客户端" } },
      { area: "docs", slug: "configuration", title: { en: "Configuration", zh: "配置" } },
      { area: "docs", slug: "models", title: { en: "Models and endpoints", zh: "模型与端点" } },
      { area: "docs", slug: "usage", title: { en: "Token usage", zh: "Token 用量" } },
    ],
  },
  {
    id: "tools",
    title: { en: "Tools", zh: "工具" },
    docs: [
      {
        area: "docs",
        slug: "tracing",
        title: { en: "Tracer and playground", zh: "Tracer 与 Playground" },
      },
      { area: "docs", slug: "server", title: { en: "Server", zh: "服务端" } },
      { area: "docs", slug: "skills", title: { en: "Agent skills", zh: "Agent Skills" } },
    ],
  },
];

// the RFC area: design/README.md at /rfcs/, then every RFC in number order
export const RFC_INDEX: DocLink = {
  area: "rfc",
  slug: "index",
  title: { en: "RFC index", zh: "RFC 索引" },
  description: {
    en: "Every rule MMSP keeps and every decision that changed it, as RFCs: the index, and when a change needs one.",
    zh: "MMSP 遵守的每条规则与改变它的每个决定都是 RFC：这里是索引，以及哪些改动需要 RFC。",
  },
  source: { en: "design/README.md", zh: "design/README.zh.md" },
};

export const RFC_SECTIONS: DocSection[] = [
  { id: "rfc", title: { en: "RFCs", zh: "RFCs" }, docs: [RFC_INDEX, ...rfcDocs()] },
];

export const ALL_DOCS: DocLink[] = DOC_SECTIONS.flatMap((section) => section.docs);

export const ALL_RFCS: DocLink[] = RFC_SECTIONS.flatMap((section) => section.docs);

export function sectionOf(doc: DocLink): DocSection | undefined {
  return [...DOC_SECTIONS, ...RFC_SECTIONS].find((section) => section.docs.includes(doc));
}

/** A page's path without the language: /docs/<slug>/, /rfcs/ for the RFC index, /rfcs/<slug>/. */
export function docPath(doc: DocLink): string {
  if (doc.area === "docs") return `/docs/${doc.slug}/`;
  return doc === RFC_INDEX ? "/rfcs/" : `/rfcs/${doc.slug}/`;
}

/** The path of the page's Markdown twin: /docs/<slug>.md, /rfcs/index.md, /rfcs/<slug>.md. */
export function docMarkdownPath(doc: DocLink): string {
  return doc.area === "docs" ? `/docs/${doc.slug}.md` : `/rfcs/${doc.slug}.md`;
}

export function docHref(locale: Locale, doc: DocLink): string {
  return localePath(locale, docPath(doc));
}

// the top bar: the overview, the docs, the RFCs, the model index, the model status, the changelog
export function navLinks(locale: Locale) {
  const s = STRINGS[locale].nav;
  return [
    { id: "overview", label: s.overview, href: localePath(locale, "/") },
    { id: "docs", label: s.docs, href: localePath(locale, "/docs/introduction/") },
    { id: "rfc", label: s.rfc, href: localePath(locale, "/rfcs/") },
    { id: "models", label: s.models, href: localePath(locale, "/models/") },
    { id: "status", label: s.status, href: localePath(locale, "/status/") },
    { id: "changelog", label: s.changelog, href: localePath(locale, "/changelog/") },
  ];
}
