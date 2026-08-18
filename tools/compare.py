import sys; sys.path.insert(0,'tools')
import pngkit

def load(p):
    w,h,px = pngkit.decode(p); return w,h,px

W,H = 620, 300
canvas = bytearray()
for y in range(H):
    for x in range(W):
        bg = (252,251,247) if x < W//2 else (22,23,27)   # light | dark
        canvas += bytes(bg+(255,))

def blit(src, dx, dy, zoom=1):
    sw,sh,sp = src
    for y in range(sh*zoom):
        for x in range(sw*zoom):
            i = ((y//zoom)*sw + (x//zoom))*4
            a = sp[i+3]/255.0
            if a <= 0: continue
            X,Y = dx+x, dy+y
            if not (0<=X<W and 0<=Y<H): continue
            o = (Y*W+X)*4
            for c in range(3):
                canvas[o+c] = int(sp[i+c]*a + canvas[o+c]*(1-a))

sets = [("cutout",20),("circle",160)]
for name, ytop in sets:
    for half in (0, W//2):
        x = half + 20
        # true size 16, 32, 64
        for s in (16,32,64):
            src = load('assets/icons/%s-%d.png'%(name,s))
            blit(src, x, ytop+40-s//2, 1)
            x += s + 18
        # 16px magnified 4x, to show what the browser actually resolves
        blit(load('assets/icons/%s-16.png'%name), x+10, ytop+8, 4)

pngkit.encode('/tmp/favicon-compare.png', W,H, canvas)
print("comparison sheet written")
