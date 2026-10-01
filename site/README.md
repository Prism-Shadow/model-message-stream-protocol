# The MMSP site

The site at [mmsp.penguin.ooo](https://mmsp.penguin.ooo): the overview page, the documentation and the changelog, in English at `/` and in Chinese at `/zh/`. It is an [Astro](https://astro.build) project styled with Tailwind CSS, built and deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that touches it.

## Develop

```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # writes dist/
```

Node 22.12 or newer.

## Where things are

| Path | Holds |
| --- | --- |
| `src/components/Home.astro` | The overview page, with its copy in both languages |
| `src/docs/<page>.en.md`, `<page>.zh.md` | The documentation, one file per page and language |
| `src/pages/docs/[slug].md.ts`, `src/shared/markdown.ts` | Every page as Markdown at its URL plus `.md`: what Copy Markdown copies |
| `src/pages/sitemap.xml.ts`, `src/pages/llms.txt.ts`, `public/robots.txt` | What search engines and agents read first |
| `src/shared/site.ts` | The sidebar and the top bar: add a page here after writing it, with its title in both languages |
| `src/shared/i18n.ts` | The two locales, their paths, and the strings of the chrome |
| `src/pages/`, `src/pages/zh/` | The routes of each language; a page under `zh/` renders the same layout with `locale="zh"` |
| `src/layouts/Base.astro` | The chrome, the metadata of every page, and the script that applies the language and the theme before the first paint |
| `src/layouts/DocPage.astro` | A documentation page: sidebar, table of contents that follows the reader, Copy Markdown, previous and next |
| `src/shared/stream-demo.ts` | The input and the streams the overview page replays, and how the stop event is drawn |
| `src/styles/global.css` | The theme: the visual language of penguin.ooo/docs with the violet of the MMSP artwork |
| `public/CNAME` | The custom domain |
| `artwork/` | The sources of the images in `.github/images/` |

Documentation pages describe the released packages. When the code changes what a page says, change the page in both languages in the same pull request.

After writing or changing a Chinese page, polish it against its English counterpart. The script reads the key from `TOKENDANCE_API_KEY` or the file named by `TOKENDANCE_KEY_FILE`, restores code blocks and HTML from the original, and refuses an answer that changes inline code, a link or the page's structure:

```bash
TOKENDANCE_KEY_FILE=~/.tokendance-key node site/scripts/polish-zh.mjs site/src/docs/streaming.zh.md --write
```

Read the diff afterwards: the script keeps code and structure, not meaning.

## Language and theme

The home page and the first documentation page open in the browser's language, `zh` for Chinese and English otherwise; every page opens in the system's theme. The menus in the top bar store a choice in `localStorage` under `mmsp-site.lang` and `mmsp-site.theme`; an absent key means "follow the system". An inline script in `Base.astro` reads both before the page paints: it sets the `dark` class on `<html>` and, when the page is not in the chosen language, replaces the location with the counterpart page. Without a choice, only the entry pages redirect: a link to any other page keeps its language, and a crawler sees both languages.

## Artwork

`artwork/` holds the HTML sources of the README header, the concept diagram and the GitHub social preview. `artwork/render.sh` renders them to PNG with headless Chrome and writes them to `.github/images/`:

```bash
CHROME=/path/to/chrome site/artwork/render.sh
```

| Source | Image | Size |
| --- | --- | --- |
| `header.html` | `.github/images/header.png` | 1760 x 587 |
| `diagram.html` | `.github/images/mmsp.png` | 1760 x 915 |
| `social-preview.html` | `.github/images/social-preview.png` | 1280 x 640 |
| `logo.py` | `.github/images/mmsp-logo.svg`, `mmsp-logo-dark.svg` | 32 x 32 viewBox |

`render.sh` renders the header and the diagram at 3000 px wide and the social preview at its final 1280 x 640; before they are committed, the header and the diagram are scaled down and every PNG is reduced to 256 colours, as the `mmsp-dev` skill describes. The social preview is uploaded by hand in the repository settings, under Social preview; the site serves the same file at `/social-preview.png` (`src/pages/social-preview.png.ts`) for its link previews.
