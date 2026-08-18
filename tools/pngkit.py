"""Minimal PNG decode/encode + favicon generation. Pure stdlib (zlib only)."""
import zlib, struct

def decode(path):
    d = open(path,'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', "not a PNG"
    pos, idat, pal, trns = 8, b'', None, None
    w=h=bd=ct=None
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]; data = d[pos+8:pos+8+ln]
        if typ==b'IHDR':
            w,h,bd,ct,_,_,il = struct.unpack('>IIBBBBB', data)
            assert bd==8 and il==0, "need 8-bit non-interlaced (got bd=%s il=%s)"%(bd,il)
        elif typ==b'IDAT': idat += data
        elif typ==b'PLTE': pal = data
        elif typ==b'tRNS': trns = data
        elif typ==b'IEND': break
        pos += 12+ln
    ch = {0:1,2:3,3:1,4:2,6:4}[ct]
    raw = zlib.decompress(idat)
    stride = w*ch
    out, prev = [], bytearray(stride)
    p = 0
    for _ in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        for i in range(stride):
            a = line[i-ch] if i>=ch else 0
            b = prev[i]
            c = prev[i-ch] if i>=ch else 0
            x = line[i]
            if   f==1: x += a
            elif f==2: x += b
            elif f==3: x += (a+b)//2
            elif f==4:
                pp = a+b-c
                pa,pb,pc = abs(pp-a),abs(pp-b),abs(pp-c)
                x += a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
            line[i] = x & 255
        out.append(line); prev = line
    # normalise everything to RGBA
    px = bytearray(w*h*4)
    for y in range(h):
        ln = out[y]
        for x in range(w):
            i = (y*w+x)*4
            if ct==2:   r,g,b_,a = ln[x*3],ln[x*3+1],ln[x*3+2],255
            elif ct==6: r,g,b_,a = ln[x*4],ln[x*4+1],ln[x*4+2],ln[x*4+3]
            elif ct==0: r=g=b_=ln[x]; a=255
            elif ct==4: r=g=b_=ln[x*2]; a=ln[x*2+1]
            elif ct==3:
                idx=ln[x]; r,g,b_=pal[idx*3],pal[idx*3+1],pal[idx*3+2]
                a = trns[idx] if trns and idx<len(trns) else 255
            px[i:i+4] = bytes((r,g,b_,a))
    return w,h,px

def encode(path,w,h,px):
    raw = b''.join(b'\x00'+bytes(px[(y*w)*4:(y*w+w)*4]) for y in range(h))
    def chunk(t,d):
        c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB',w,h,8,6,0,0,0))
        + chunk(b'IDAT', zlib.compress(raw,9))
        + chunk(b'IEND', b''))
