import type { APIRoute } from "astro";
import { docFile } from "../../shared/docs";
import { docMarkdown } from "../../shared/markdown";
import { ALL_RFCS } from "../../shared/site";

// every RFC as Markdown next to its page, and the index as /rfcs/index.md
export function getStaticPaths() {
  return ALL_RFCS.map((doc) => ({ params: { slug: doc.slug }, props: { doc, page: docFile("en", doc) } }));
}

export const GET: APIRoute = ({ props }) => docMarkdown("en", props.doc, props.page);
