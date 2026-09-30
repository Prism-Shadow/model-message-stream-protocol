# Builds the MMSP logo files: the mark of site/public/favicon.svg with its letters as outlines
# (Noto Sans Bold), so it renders the same without the font, in a light and a dark variant.
# Usage: uvx --with fonttools python site/artwork/logo.py NotoSans-Bold.ttf assets/logo
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

font_path, out_dir = sys.argv[1:3]
font = TTFont(font_path)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight
SIZE = 10.5
scale = SIZE / upm


def letter(ch, cx, cy):
    name = cmap[ord(ch)]
    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    x0, _, x1, _ = bounds.bounds
    # the glyph's box centred on the tile across, its cap height centred down
    dx = cx - (x0 + x1) / 2 * scale
    baseline = cy + cap * scale / 2
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.3f}".rstrip("0").rstrip("."))
    glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, dx, baseline)))
    return pen.getCommands()


letters = "".join(
    f'<path d="{letter(ch, x, y)}"/>'
    for ch, x, y in (
        ("M", 8.5, 8.5),
        ("M", 23.5, 8.5),
        ("S", 8.5, 23.5),
        ("P", 23.5, 23.5),
    )
)
for variant, dark in (("mmsp-logo", "#111116"), ("mmsp-logo-dark", "#2a2a33")):
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<path d="M15.5 0H25a7 7 0 0 1 7 7v9.5H15.5Z" fill="{dark}"/>'
        f'<path d="M0 15.5h16.5V32H7a7 7 0 0 1-7-7Z" fill="{dark}"/>'
        '<path d="M0 16V7a7 7 0 0 1 7-7h9v16Z" fill="#477dfb"/>'
        '<path d="M16 16h16v9a7 7 0 0 1-7 7h-9Z" fill="#477dfb"/>'
        f'<g fill="#fff">{letters}</g></svg>\n'
    )
    with open(f"{out_dir}/{variant}.svg", "w") as file:
        file.write(svg)
    print(variant, len(svg), "bytes")
