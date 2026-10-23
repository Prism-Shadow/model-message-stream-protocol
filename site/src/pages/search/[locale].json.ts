import type { APIRoute } from "astro";
import { docDescription, docFile } from "../../shared/docs";
import { LOCALES, type Locale } from "../../shared/i18n";
import { docBody } from "../../shared/markdown";
import { buildSearchRecords } from "../../shared/search";
import { DOC_SECTIONS, RFC_SECTIONS, docHref } from "../../shared/site";

// the search index of a language, /search/en.json and /search/zh.json: one record per page and per
// h2/h3 section of every docs page and every RFC, which the search dialog fetches on first use
export function getStaticPaths() {
  return LOCALES.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = ({ params }) => {
  const locale = params.locale as Locale;
  const pages = [...DOC_SECTIONS, ...RFC_SECTIONS].flatMap((section) =>
    section.docs.map((doc) => {
      const file = docFile(locale, doc);
      return {
        area: doc.area,
        section: section.title[locale],
        href: docHref(locale, doc),
        title: doc.title[locale],
        description: docDescription(locale, doc, file),
        body: docBody(locale, doc, file),
        anchors: file
          .getHeadings()
          .filter((heading) => heading.depth === 2 || heading.depth === 3)
          .map((heading) => heading.slug),
      };
    }),
  );
  return new Response(JSON.stringify(buildSearchRecords(pages)), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
