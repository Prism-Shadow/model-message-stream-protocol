# The MMSP site

The site at [mmsp.penguin.ooo](https://mmsp.penguin.ooo): the overview page, the documentation and the changelog. It is an [Astro](https://astro.build) project styled with Tailwind CSS, built and deployed to GitHub Pages by `.github/workflows/pages.yml` on every push to `main` that touches it.

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
| `src/pages/index.astro` | The overview page |
| `src/docs/*.md` | The documentation, one file per page |
| `src/shared/site.ts` | The sidebar and the top bar: add a page here after writing it |
| `src/pages/changelog.astro` | Renders the repository's `CHANGELOG.md` |
| `src/shared/stream-demo.ts` | The streams the overview page replays |
| `src/styles/global.css` | The theme: the visual language of penguin.ooo/docs with the violet of the MMSP artwork |
| `public/CNAME` | The custom domain |
| `artwork/` | The sources of the images in `.github/images/` |

Documentation pages describe the released packages. When the code changes what a page says, change the page in the same pull request.

## Artwork

`artwork/` holds the HTML sources of the README header, the concept diagram and the GitHub social preview. `artwork/render.sh` renders them to PNG with headless Chrome and writes them to `.github/images/`:

```bash
CHROME=/path/to/chrome site/artwork/render.sh
```

| Source | Image | Size |
| --- | --- | --- |
| `header.html` | `.github/images/header.png` | 3000 x 1000 |
| `diagram.html` | `.github/images/mmsp.png` | 3000 x 1560 |
| `social-preview.html` | `.github/images/social-preview.png` | 1280 x 640 |

The social preview is uploaded by hand in the repository settings, under Social preview. A copy in `public/` is the image links to the site unfurl with.
