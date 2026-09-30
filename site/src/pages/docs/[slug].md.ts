import type { APIRoute } from "astro";
import type { MarkdownInstance } from "astro";
import { ALL_DOCS } from "../../shared/site";
import { docMarkdown } from "../../shared/markdown";

// every page as Markdown, next to it: what "Copy Markdown" copies, and what an agent reads
export function getStaticPaths() {
  const pages = import.meta.glob<MarkdownInstance<{ description: string }>>("../../docs/*.en.md", { eager: true });
  return ALL_DOCS.map((doc) => ({ params: { slug: doc.slug }, props: { doc, page: pages[`../../docs/${doc.slug}.en.md`] } }));
}

export const GET: APIRoute = ({ props }) => docMarkdown("en", props.doc, props.page);
