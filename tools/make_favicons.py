import sys, math
sys.path.insert(0,'tools')
import pngkit

SRC='source-photo.png'
w,h,px = pngkit.decode(SRC)
def L(i): return 0.299*px[i]+0.587*px[i+1]+0.114*px[i+2]

# ---- locate the face: centroid of bright (skin/hair) pixels ----
sx=sy=n=0
for y in range(h):
    for x in range(w):
        if L((y*w+x)*4) > 150: sx+=x; sy+=y; n+=1
cx, cy = (sx/n, sy/n) if n else (w/2, h/2)

# ---- variant A: flood-fill the background to transparent ----
def cutout(tol):
    a = bytearray([255])*(w*h)
    seen = bytearray(w*h)
    st = [ (x,0) for x in range(w) ] + [ (x,h-1) for x in range(w) ] \
       + [ (0,y) for y in range(h) ] + [ (w-1,y) for y in range(h) ]
    while st:
        x,y = st.pop()
        if x<0 or y<0 or x>=w or y>=h: continue
        k = y*w+x
        if seen[k]: continue
        seen[k]=1
        i=k*4
        # region-growing: dark, and not part of the bright subject
        if L(i) > tol: continue
        a[k]=0
        st += [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]
    return a

# ---- square crop around the face, then resample ----
def sample(px_, alpha, size, circular):
    side = min(w,h)
    x0 = max(0, min(w-side, int(cx - side/2)))
    y0 = max(0, min(h-side, int(cy - side/2)))
    out = bytearray(size*size*4)
    sc = side/size
    r  = size/2 - 0.5
    for oy in range(size):
        for ox in range(size):
            # area-average the source box that maps to this output pixel
            fx0, fy0 = x0+ox*sc, y0+oy*sc
            fx1, fy1 = fx0+sc,   fy0+sc
            R=G=B=A=cnt=0
            for sy_ in range(int(fy0), max(int(fy0)+1, int(math.ceil(fy1)))):
                for sx_ in range(int(fx0), max(int(fx0)+1, int(math.ceil(fx1)))):
                    if 0<=sx_<w and 0<=sy_<h:
                        i=(sy_*w+sx_)*4; k=sy_*w+sx_
                        R+=px_[i]; G+=px_[i+1]; B+=px_[i+2]
                        A+= (alpha[k] if alpha else 255); cnt+=1
            if not cnt: continue
            o=(oy*size+ox)*4
            av=[R//cnt,G//cnt,B//cnt,A//cnt]
            if circular:
                d = math.hypot(ox-r, oy-r)
                edge = r - d
                av[3] = int(av[3] * max(0.0, min(1.0, edge+0.5)))   # 1px feather
            out[o:o+4]=bytes(av)
    return out

alpha = cutout(105)
cleared = sum(1 for v in alpha if v==0)
print("flood-fill cleared %d%% of the frame" % (100*cleared//(w*h)))
print("face centroid: (%.0f, %.0f) of %dx%d" % (cx,cy,w,h))

import os
os.makedirs('assets/icons', exist_ok=True)
for size in (512,192,180,64,32,16):
    pngkit.encode('assets/icons/cutout-%d.png'%size, size,size, sample(px, alpha, size, False))
    pngkit.encode('assets/icons/circle-%d.png'%size, size,size, sample(px, None,  size, True))
print("wrote", len(os.listdir('assets/icons')), "files")
