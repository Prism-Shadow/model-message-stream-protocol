import type { APIRoute } from "astro";
import { docFile } from "../../../shared/docs";
import { docMarkdown } from "../../../shared/markdown";
import { ALL_DOCS } from "../../../shared/site";

export function getStaticPaths() {
  return ALL_DOCS.map((doc) => ({ params: { slug: doc.slug }, props: { doc, page: docFile("zh", doc) } }));
}

export const GET: APIRoute = ({ props }) => docMarkdown("zh", props.doc, props.page);
