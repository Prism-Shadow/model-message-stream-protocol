import type { APIRoute } from "astro";
import { STRINGS, localePath } from "../shared/i18n";
import { DOC_SECTIONS } from "../shared/site";

// the index an agent reads first: one line per page, pointing at the page's own Markdown
export const GET: APIRoute = ({ site }) => {
  const md = (locale: "en" | "zh", slug: string) => new URL(localePath(locale, `/docs/${slug}.md`), site).href;
  const sections = DOC_SECTIONS.map(
    (section) =>
      `## ${section.title.en}\n\n${section.docs.map((doc) => `- [${doc.title.en}](${md("en", doc.slug)})`).join("\n")}`,
  );
  const chinese = DOC_SECTIONS.flatMap((section) => section.docs.map((doc) => `- [${doc.title.zh}](${md("zh", doc.slug)})`));
  const text = `# MMSP

> ${STRINGS.en.description}

MMSP, the Model Message Stream Protocol, ships as the Python package \`mmsp\` and the TypeScript package \`@prismshadow/mmsp\`. Every documentation page is served as Markdown at the URL below, and as HTML at the same URL without the \`.md\`.

${sections.join("\n\n")}

## 中文

${chinese.join("\n")}

## Optional

- [Changelog](${new URL("/changelog/", site).href})
- [Repository](https://github.com/Prism-Shadow/model-message-stream-protocol)
- [Skills for coding agents](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills)
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
