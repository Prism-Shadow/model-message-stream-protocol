import type { MarkdownInstance } from "astro";
import type { Locale } from "./i18n";
import { ALL_DOCS, ALL_RFCS, REPO_URL, docHref, type DocLink } from "./site";

export type DocFile = MarkdownInstance<{ description?: string }>;

const SITE_FILES: Record<Locale, Record<string, DocFile>> = {
  en: import.meta.glob<DocFile>("../docs/*.en.md", { eager: true }),
  zh: import.meta.glob<DocFile>("../docs/*.zh.md", { eager: true }),
};

// the design pages render the repository's files themselves, so they cannot fall behind them
const DESIGN_FILES = import.meta.glob<DocFile>(["../../../design/README*.md", "../../../design/rfcs/MMSP-RFC-*.md"], {
  eager: true,
});

/** The Markdown file a page renders in a language. */
export function docFile(locale: Locale, doc: DocLink): DocFile {
  return doc.source
    ? DESIGN_FILES[`../../../${doc.source[locale]}`]
    : SITE_FILES[locale][`../docs/${doc.slug}.${locale}.md`];
}

/** The lede under the title; an RFC has none, since its Abstract opens it. */
export function docDescription(locale: Locale, doc: DocLink, file: DocFile): string | undefined {
  return doc.description?.[locale] ?? file.frontmatter.description;
}

/** The meta description of a page without a lede: the first paragraph of its Abstract, as text. */
export function docSummary(file: DocFile): string {
  const raw = file.rawContent();
  const start = raw.search(/^## Abstract$/m);
  if (start < 0) return "";
  const blocks = raw.slice(start).split(/\n\s*\n/);
  const paragraph = blocks.find((block) => block.trim() && !block.startsWith("#") && !/^\[[^\]]+\]: /.test(block)) ?? "";
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Where a link in a design file goes on the site. The files link one another relatively, as GitHub
 * shows them: a file the site renders goes to its page, any other path to the file on GitHub.
 */
export function designHref(locale: Locale, source: string, href: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) return href;
  const url = new URL(href, `file:///${source}`);
  const path = decodeURIComponent(url.pathname.slice(1));
  const target = [...ALL_DOCS, ...ALL_RFCS].find((doc) => doc.source?.en === path || doc.source?.zh === path);
  if (target?.source) {
    const { en, zh } = target.source;
    const language = en === zh ? locale : path === zh ? "zh" : "en";
    return docHref(language, target) + url.hash;
  }
  const kind = /\.[^/]+$/.test(path) ? "blob" : "tree";
  return `${REPO_URL}/${kind}/main/${path}${url.hash}`;
}

/** A design file's HTML as its page shows it: the title and the other language's link are the page's. */
export async function designHtml(locale: Locale, doc: DocLink, file: DocFile): Promise<string> {
  const source = doc.source![locale];
  return (await file.compiledContent())
    .replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/, "")
    .replace(/<p><a href="[^"]*\.md">(?:中文版|English)<\/a><\/p>\s*/, "")
    .replace(/<a href="([^"]*)"/g, (_, href: string) => `<a href="${designHref(locale, source, href)}"`);
}
