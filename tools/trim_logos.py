"""Crop the white margin off the agency logos.

They were screenshotted with generous white surrounds, so inside a fixed
tile the mark itself ends up small. Trimming to the ink lets each logo
fill its tile.
"""
import sys, os, glob
sys.path.insert(0, 'tools')
import pngkit

def trim(path, thresh=242, pad_frac=0.03, min_frac=0.012):
    """min_frac: a row/column must carry that share of non-white pixels to
    count as content. Screenshot edges often carry a 1px rule or compression
    noise, and a naive scan treats those as ink and trims nothing."""
    w, h, px = pngkit.decode(path)
    def is_ink(i):
        return px[i+3] > 20 and not (px[i] >= thresh and px[i+1] >= thresh and px[i+2] >= thresh)
    min_row = max(2, int(w * min_frac))
    min_col = max(2, int(h * min_frac))
    def ink_row(y):
        n = 0
        for x in range(w):
            if is_ink((y*w+x)*4):
                n += 1
                if n >= min_row: return True
        return False
    def ink_col(x):
        n = 0
        for y in range(h):
            if is_ink((y*w+x)*4):
                n += 1
                if n >= min_col: return True
        return False
    top = next((y for y in range(h) if ink_row(y)), 0)
    bot = next((y for y in range(h-1, -1, -1) if ink_row(y)), h-1)
    left = next((x for x in range(w) if ink_col(x)), 0)
    right = next((x for x in range(w-1, -1, -1) if ink_col(x)), w-1)

    pad = int(max(bot-top, right-left) * pad_frac)
    top = max(0, top-pad); left = max(0, left-pad)
    bot = min(h-1, bot+pad); right = min(w-1, right+pad)
    nw, nh = right-left+1, bot-top+1
    if nw <= 0 or nh <= 0 or (nw == w and nh == h):
        return w, h, w, h
    out = bytearray(nw*nh*4)
    for y in range(nh):
        src = ((top+y)*w + left)*4
        out[y*nw*4:(y+1)*nw*4] = px[src:src+nw*4]
    pngkit.encode(path, nw, nh, out)
    return w, h, nw, nh

if __name__ == '__main__':
    for f in sorted(glob.glob('assets/images/work-study/logos/*.png')):
        ow, oh, nw, nh = trim(f)
        pct = 100 - int(100*(nw*nh)/(ow*oh))
        print('  %-28s %4dx%-4d -> %4dx%-4d  %2d%% trimmed' %
              (os.path.basename(f), ow, oh, nw, nh, pct))
