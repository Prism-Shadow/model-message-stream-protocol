import type { MarkdownInstance } from "astro";
import type { Locale } from "./i18n";
import { localePath } from "./i18n";
import type { DocLink } from "./site";

/**
 * A documentation page as plain Markdown: its title, its description, then the body without
 * the frontmatter and without the code-group and per-language wrappers, which only the site renders. Links to
 * the site become absolute, so the text reads the same wherever it is pasted.
 */
export function docMarkdown(locale: Locale, doc: DocLink, page: MarkdownInstance<{ description: string }>): Response {
  const site = import.meta.env.SITE;
  const body = page
    .rawContent()
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/<figure class="flowchart">[\s\S]*?<\/figure>/, flowchartAsText)
    .split("\n")
    .filter((line) => !/^<div (class="code-group"|data-code-lang=)[^>]*>$/.test(line) && line !== "</div>")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\]\(\//g, `](${site.replace(/\/$/, "")}/`)
    .trim();
  const source = new URL(localePath(locale, `/docs/${doc.slug}/`), site);
  const text = `# ${doc.title[locale]}\n\n${page.frontmatter.description}\n\nSource: ${source}\n\n${body}\n`;
  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

/**
 * The agent loop flowchart as the numbered steps it carries for screen readers.
 */
function flowchartAsText(figure: string): string {
  const items = [...figure.matchAll(/<li>(.*?)<\/li>/g)].map((match) =>
    match[1].replace(/<code>(.*?)<\/code>/g, "`$1`").replace(/<[^>]+>/g, ""),
  );
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}
