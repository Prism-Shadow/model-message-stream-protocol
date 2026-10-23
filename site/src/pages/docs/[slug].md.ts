import type { APIRoute } from "astro";
import { docFile } from "../../shared/docs";
import { docMarkdown } from "../../shared/markdown";
import { ALL_DOCS } from "../../shared/site";

// every page as Markdown, next to it: what "Copy Markdown" copies, and what an agent reads
export function getStaticPaths() {
  return ALL_DOCS.map((doc) => ({ params: { slug: doc.slug }, props: { doc, page: docFile("en", doc) } }));
}

export const GET: APIRoute = ({ props }) => docMarkdown("en", props.doc, props.page);
