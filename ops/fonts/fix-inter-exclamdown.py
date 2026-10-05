"""
Inter 4.0 (Extendable theme, assets/fonts/inter/inter-variable.woff2) ships a broken "¡" (exclamdown): its weight
variations collapse the stem, so from semibold up only the dot shows and "¡Hola!" reads ":Hola!".

This rebuilds exclamdown as the "!" (exclam) turned upside down, variations included, keeping exclam's advance width
(hmtx + HVAR). Output: wp-content/mu-plugins/ezmajo-fuentes/inter-variable.woff2 (served instead of the theme's file,
see ezmajo-fuentes.php). Inter is OFL 1.1 without a Reserved Font Name, so the modified file can keep the name.

Usage: python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools brotli
       /tmp/ft/bin/python ops/fonts/fix-inter-exclamdown.py
"""
import copy
import os

from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SRC = os.path.join(ROOT, 'wp-content/themes/extendable/assets/fonts/inter/inter-variable.woff2')
OUT = os.path.join(ROOT, 'wp-content/mu-plugins/ezmajo-fuentes/inter-variable.woff2')

font = TTFont(SRC)
glyf, gvar = font['glyf'], font['gvar']
src = glyf['exclam']
top = 1063  # y' = top - y: the turned "!" spans about -427..1080, like the original "¡"


def flipped_order(ends):
    """Point order with each contour reversed (a vertical flip reverses the winding)."""
    order, start = [], 0
    for end in ends:
        order += list(range(end, start - 1, -1))
        start = end + 1
    return order


order = flipped_order(src.endPtsOfContours)
new = copy.deepcopy(src)
new.coordinates = type(src.coordinates)([(src.coordinates[i][0], top - src.coordinates[i][1]) for i in order])
new.flags = type(src.flags)([src.flags[i] for i in order])
glyf['exclamdown'] = new

variations = []
for tv in gvar.variations['exclam']:
    tv = copy.deepcopy(tv)
    points, phantoms = tv.coordinates[:len(order)], tv.coordinates[len(order):]
    flipped = [None if points[i] is None else (points[i][0], -points[i][1]) for i in order]
    tv.coordinates = flipped + phantoms
    variations.append(tv)
gvar.variations['exclamdown'] = variations

font['hmtx']['exclamdown'] = font['hmtx']['exclam']
hvar = font['HVAR'].table
hvar.AdvWidthMap.mapping['exclamdown'] = hvar.AdvWidthMap.mapping['exclam']

font.flavor = 'woff2'
font.save(OUT)
print('saved', OUT)
