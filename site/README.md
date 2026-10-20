# The MMSP site

The site at [mmsp.penguin.ooo](https://mmsp.penguin.ooo): the overview page, the documentation, the model catalog, the status page and the changelog, in English at `/` and in Chinese at `/zh/`. It is an [Astro](https://astro.build) project styled with Tailwind CSS, built and deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that touches it.

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
| `src/shared/catalog.ts`, `src/components/ModelCatalog.astro`, `src/pages/models.json.ts` | The model catalog at `/models/` and `/models.json`: every entry of `src_ts/src/registry.ts` with its provider, key variable, price and integration kit, opened in a dialog |
| `src/shared/providers.ts` | The providers by base URL (name, mark, key variable) and the vendors by model id; an endpoint not listed is named by its host |
| `src/shared/status.ts`, `src/components/StatusBoard.astro` | The status page at `/status/`, drawn in the browser from the status probe's files |
| `src/shared/marks.ts`, `src/components/VendorMark.astro`, `src/components/MarkSprite.astro` | The vendor and provider marks of the home page's logo row, the catalog and the status page |
| `src/styles/global.css` | The theme: the visual language of penguin.ooo/docs with the violet of the MMSP artwork |
| `public/CNAME` | The custom domain |
| `artwork/` | The sources of the images in `.github/images/` |

Documentation pages describe the released packages. When the code changes what a page says, change the page in both languages in the same pull request.

After writing or changing a Chinese page, polish it against its English counterpart. The script reads the key from `TOKENDANCE_API_KEY` or the file named by `TOKENDANCE_KEY_FILE`, restores code blocks and HTML from the original, and refuses an answer that changes inline code, a link or the page's structure:

```bash
TOKENDANCE_KEY_FILE=~/.tokendance-key node site/scripts/polish-zh.mjs site/src/docs/streaming.zh.md --write
```

Read the diff afterwards: the script keeps code and structure, not meaning.

## Models and status

`/models/` is built from the SDK's registry, `src_ts/src/registry.ts`, so a row added there is on the page at the next deploy; `.github/workflows/pages.yml` builds the site when that file changes. A provider the page does not know yet is named by its host and its key variable is guessed from it: add it to `PROVIDERS` in `src/shared/providers.ts`, with its mark in `src/shared/marks.ts`. Each row opens a dialog with its kit (`kitFor` in `src/shared/catalog.ts`): a complete TypeScript and Python program for its `(model, base_url, client)`, the `mmsp-server.json` that serves it, and the lines that install, set the key and run each. The program prints the answer by the entry's output modalities: text as it streams, an embedding's size, an image or speech written to a file. An official model at its vendor's own endpoint gets the short form, `AutoLLMClient(model=...)`, decided by the model families of `src_ts/src/credentials.ts`. `/models.json` carries the same programs.

`/status/` and the catalog's status column read the status probe's files (`.github/status/README.md`) from the `status-data` branch in the browser; before its first run, every row says it is not probed. To see the pages with data, serve hand-written `latest.json`, `history.json` and `monthly.json` with `access-control-allow-origin: *` and open a page served from `localhost` or `127.0.0.1` with `?status=<that origin>`; a published page ignores the parameter.

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
