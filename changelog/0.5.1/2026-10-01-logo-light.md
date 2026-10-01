# The mark has no grey rim on light backgrounds, and the logo files are in the repository

- **Date:** 2026-10-01
- **Type:** fix
- **Scope:** `site`, `integration`

[中文版](2026-10-01-logo-light.zh.md)

## What changed

- The mark drew its blue tiles over one dark rounded square, whose edge showed as a grey rim along the blue tiles' rounded corners on a light background. Each tile is now its own shape, in the site, the favicon, the artwork and the playground and tracer pages.
- `.github/images/` holds the logo next to the README images: `mmsp-logo.svg` for light backgrounds and `mmsp-logo-dark.svg` for dark ones, with the letters as outlines so they render the same everywhere, and a 512 px PNG of each. `site/artwork/logo.py` builds the SVGs. The social preview has one copy there too; the site serves it at `/social-preview.png` instead of keeping a second file.
