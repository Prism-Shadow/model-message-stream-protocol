import type { APIRoute } from "astro";
import { LOCALES, localePath } from "../shared/i18n";
import { ALL_DOCS } from "../shared/site";

// every page in both languages, each naming its counterpart, for search engines
const PATHS = ["/", "/changelog/", ...ALL_DOCS.map((doc) => `/docs/${doc.slug}/`)];

export const GET: APIRoute = ({ site }) => {
  const url = (locale: "en" | "zh", path: string) => new URL(localePath(locale, path), site).href;
  const entries = PATHS.flatMap((path) =>
    LOCALES.map(
      (locale) => `  <url>
    <loc>${url(locale, path)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${url("en", path)}"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${url("zh", path)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${url("en", path)}"/>
  </url>`,
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
};
