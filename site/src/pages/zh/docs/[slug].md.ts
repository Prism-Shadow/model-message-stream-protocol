import type { APIRoute } from "astro";
import type { MarkdownInstance } from "astro";
import { ALL_DOCS } from "../../../shared/site";
import { docMarkdown } from "../../../shared/markdown";

export function getStaticPaths() {
  const pages = import.meta.glob<MarkdownInstance<{ description: string }>>("../../../docs/*.zh.md", { eager: true });
  return ALL_DOCS.map((doc) => ({ params: { slug: doc.slug }, props: { doc, page: pages[`../../../docs/${doc.slug}.zh.md`] } }));
}

export const GET: APIRoute = ({ props }) => docMarkdown("zh", props.doc, props.page);
