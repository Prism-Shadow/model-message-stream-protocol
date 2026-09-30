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
    .replace(/<div class="loop-diagram"[\s\S]*?<\/div>\n<\/div>/, loopAsText)
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

const untag = (html: string) => html.replace(/<[^>]+>/g, "");

/**
 * The agent loop diagram as a numbered list: its four steps in order, and the exit after the
 * step it leaves from.
 */
function loopAsText(diagram: string): string {
  const nodes = [...diagram.matchAll(/<span class="n">(\d)<\/span><b>(.*?)<\/b><p>(.*?)<\/p>/g)]
    .map((match) => ({ n: Number(match[1]), line: `${match[1]}. ${untag(match[2])}: ${untag(match[3])}` }))
    .sort((a, b) => a.n - b.n);
  const exit = diagram.match(/<div class="loop-end"><b>(.*?)<\/b><p>(.*?)<\/p>/);
  const lines = nodes.map((node) => node.line);
  if (exit) {
    lines.splice(2, 0, `   ${untag(exit[1])}: ${untag(exit[2])}`);
  }
  return lines.join("\n");
}
