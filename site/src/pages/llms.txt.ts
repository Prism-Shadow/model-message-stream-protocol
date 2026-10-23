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

## Models

- [Model catalog](${new URL("/models.json", site).href}): every model MMSP supports, as JSON: its endpoint, client, key variable, list price and the code that calls it
- [Models](${new URL("/models/", site).href}): the same catalog as a page
- [Status](${new URL("/status/", site).href}): the daily probe of the watched channels: status, TTFT, TPS and probe cost

## 中文

${chinese.join("\n")}
- [模型](${new URL("/zh/models/", site).href})
- [状态](${new URL("/zh/status/", site).href})

## Optional

- [Changelog](${new URL("/changelog/", site).href})
- [Repository](https://github.com/Prism-Shadow/model-message-stream-protocol)
- [Skills for coding agents](https://github.com/Prism-Shadow/model-message-stream-protocol/tree/main/skills)
`;
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
