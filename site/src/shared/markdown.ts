import type { MarkdownInstance } from "astro";
import type { Locale } from "./i18n";
import { localePath } from "./i18n";
import type { DocLink } from "./site";

/**
 * A documentation page as plain Markdown: its title, its description, then the body without
 * the frontmatter and without the code-group wrappers, which only the site renders. Links to
 * the site become absolute, so the text reads the same wherever it is pasted.
 */
export function docMarkdown(locale: Locale, doc: DocLink, page: MarkdownInstance<{ description: string }>): Response {
  const site = import.meta.env.SITE;
  const body = page
    .rawContent()
    .replace(/^---[\s\S]*?---\s*/, "")
    .split("\n")
    .filter((line) => !/^<div class="code-group"[^>]*>$/.test(line) && line !== "</div>")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\]\(\//g, `](${site.replace(/\/$/, "")}/`)
    .trim();
  const source = new URL(localePath(locale, `/docs/${doc.slug}/`), site);
  const text = `# ${doc.title[locale]}\n\n${page.frontmatter.description}\n\nSource: ${source}\n\n${body}\n`;
  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
