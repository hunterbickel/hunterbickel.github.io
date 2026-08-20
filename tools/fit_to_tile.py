"""Pad an image out to a target aspect ratio by extending its edges.

Crest tiles are a fixed shape, but institution marks are not: SJSU is a
4.06:1 wordmark, the MU logo is square. Scaling either to fit leaves dead
space; cropping either would cut the mark. Padding the file itself to the
tile's ratio lets it fill the frame edge to edge with nothing lost.

Extends the outermost row/column outward, so a textured background (the MU
gold) stays continuous rather than butting against a flat fill.
"""
import sys, os
sys.path.insert(0, 'tools')
import pngkit

def fit(path, ratio, out=None):
    w, h, px = pngkit.decode(path)
    cur = w / h
    if abs(cur - ratio) < 0.01:
        return w, h, w, h, 'already matches'

    if cur > ratio:                      # too wide -> add height
        nw, nh = w, int(round(w / ratio))
        padx, pady = 0, (nh - h) // 2
    else:                                # too tall -> add width
        nw, nh = int(round(h * ratio)), h
        padx, pady = (nw - w) // 2, 0

    out_px = bytearray(nw * nh * 4)
    for y in range(nh):
        sy = min(h - 1, max(0, y - pady))          # clamp: repeats edge rows
        row = px[(sy * w) * 4:(sy * w + w) * 4]
        o = y * nw * 4
        if padx:
            left, right = row[0:4], row[(w - 1) * 4:w * 4]
            for x in range(padx):
                out_px[o + x * 4:o + x * 4 + 4] = left
            out_px[o + padx * 4:o + padx * 4 + w * 4] = row
            for x in range(padx + w, nw):
                out_px[o + x * 4:o + x * 4 + 4] = right
        else:
            out_px[o:o + w * 4] = row

    pngkit.encode(out or path, nw, nh, out_px)
    return w, h, nw, nh, 'padded %dpx x / %dpx y' % (padx, pady)

if __name__ == '__main__':
    TILE = 152 / 99.0
    for f in sys.argv[1:]:
        ow, oh, nw, nh, how = fit(f, TILE)
        print('  %-30s %dx%d -> %dx%d  (%.3f:1)  %s' %
              (os.path.basename(f), ow, oh, nw, nh, nw / nh, how))
