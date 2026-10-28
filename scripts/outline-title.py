"""Outlines the splash title card's words to standalone SVGs in src/assets/title/, so the site ships the letter
shapes rather than the NIS JTC fonts themselves (commercial, embedding restricted; keep them in _source/).
Run: python3 scripts/outline-title.py _source src/assets/title   (needs: pip install fonttools)"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

src, out = sys.argv[1], sys.argv[2]

WORDS = [
    # file, font, text, gap between letter outlines (em); None keeps the font's own spacing
    ('chrisxp', 'NIS-JTC-Win-M9-Condensed.ttf', 'CHRISXP', 0.035),
    ('operating', 'NIS-JTC-Win-M9-Condensed.ttf', 'OPERATING', 0.035),
    ('system', 'NIS-JTC-Win-M9.ttf', 'SYSTEM', None),
    ('loading', 'NIS-JTC-Win-M9-Condensed.ttf', 'LOADING', 0.035),
    ('paused', 'NIS-JTC-Win-M9-Condensed.ttf', 'PAUSED', 0.035),
]

for name, fontfile, text, gap in WORDS:
    font = TTFont(f'{src}/{fontfile}')
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm
    bp = BoundsPen(glyphs)
    glyphs[cmap[ord('H')]].draw(bp)
    cap = bp.bounds[3]
    paths, x, top, bottom = [], 0.0, cap, 0.0
    first = True
    for ch in text:
        g = glyphs[cmap[ord(ch)]]
        b = BoundsPen(glyphs)
        g.draw(b)
        xmin, ymin, xmax, ymax = b.bounds
        if gap is None:
            ox = x - (xmin if first else 0)
            right = ox + g.width
        else:
            ox = x - xmin
            right = ox + xmax + gap * upm
        pen = SVGPathPen(glyphs)
        g.draw(pen)
        paths.append(f'<path transform="translate({ox:.1f} 0)" d="{pen.getCommands()}"/>')
        top, bottom = max(top, ymax), min(bottom, ymin)
        last_right = ox + xmax
        x = right
        first = False
    width = last_right
    # y is flipped: font units grow upward, SVG units downward. Every word gets the same box, from just above the
    # cap height to just below the baseline, so round letters' overshoot is kept and CSS heights size words alike.
    above, below = cap + 60, 120
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-above:.0f} {width:.0f} {above + below:.0f}" '
           f'fill="#fff"><g transform="scale(1 -1)">{"".join(paths)}</g></svg>\n')
    open(f'{out}/{name}.svg', 'w').write(svg)
    print(name, f'{width:.0f}x{cap:.0f}', len(svg), 'bytes', 'overshoot', top - cap, bottom)
