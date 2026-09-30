export const SITE_NAME = "MMSP";
export const SITE_TITLE = "Model Message Stream Protocol";
export const SITE_DESCRIPTION =
  "MMSP is one message format and one streaming grammar for every model provider, in Python and TypeScript.";
export const REPO_URL = "https://github.com/Prism-Shadow/model-message-stream-protocol";
export const PYPI_URL = "https://pypi.org/project/mmsp/";
export const NPM_URL = "https://www.npmjs.com/package/@prismshadow/mmsp";
export const DISCORD_URL = "https://discord.gg/4TQ2bsSb";
export const X_URL = "https://twitter.com/prismshadow_ai";

export interface DocLink {
  slug: string;
  title: string;
}

export interface DocSection {
  id: string;
  title: string;
  docs: DocLink[];
}

// the order of the sidebar, and of the previous / next links under every page
export const DOC_SECTIONS: DocSection[] = [
  {
    id: "start",
    title: "Get started",
    docs: [
      { slug: "introduction", title: "Introduction" },
      { slug: "quickstart", title: "Quickstart" },
    ],
  },
  {
    id: "protocol",
    title: "Protocol",
    docs: [
      { slug: "messages", title: "Messages" },
      { slug: "streaming", title: "Streaming" },
      { slug: "fidelity", title: "Fidelity" },
      { slug: "errors", title: "Errors" },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    docs: [
      { slug: "client", title: "Client" },
      { slug: "configuration", title: "Configuration" },
      { slug: "models", title: "Models and endpoints" },
      { slug: "usage", title: "Token usage" },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    docs: [
      { slug: "tracing", title: "Tracer and playground" },
      { slug: "skills", title: "Agent skills" },
    ],
  },
];

export const ALL_DOCS: DocLink[] = DOC_SECTIONS.flatMap((section) => section.docs);

export function sectionOf(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((section) => section.docs.some((doc) => doc.slug === slug));
}

// the top bar: the overview, one entry per part of the documentation, the changelog
export const NAV_LINKS = [
  { id: "overview", label: "Overview", href: "/" },
  { id: "start", label: "Quickstart", href: "/docs/quickstart/" },
  { id: "protocol", label: "Protocol", href: "/docs/messages/" },
  { id: "reference", label: "Reference", href: "/docs/client/" },
  { id: "tools", label: "Tools", href: "/docs/tracing/" },
  { id: "changelog", label: "Changelog", href: "/changelog/" },
];
