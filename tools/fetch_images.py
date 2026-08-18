import json, os, subprocess, hashlib

SLUGS = {'barcelona':'barcelona-la-sagrera','lyon':'lyon-part-dieu','paris':'europe-work-study-paris',
         'jacksonville':'jacksonville-regional-rail','daytrips':'day-trips-by-hsr'}

def sniff(p):
    d=open(p,'rb').read(16)
    if d[:8]==b'\x89PNG\r\n\x1a\n': return 'png'
    if d[:3]==b'\xff\xd8\xff': return 'jpg'
    if d[:4]==b'RIFF' and d[8:12]==b'WEBP': return 'webp'
    if d[:6] in (b'GIF87a',b'GIF89a'): return 'gif'
    return None

for name, slug in SLUGS.items():
    r = json.load(open('/tmp/sqdump/%s.json'%name))
    out = 'assets/images/%s' % slug
    os.makedirs(out, exist_ok=True)
    seen, mapping = {}, []
    for i, im in enumerate(r['imgs']):
        key = im['url'].split('?')[0]
        if key in seen:
            mapping.append(seen[key]); continue
        # reuse the file if we already fetched it in an earlier run
        n_existing = len(seen)+1
        found = None
        for e in ('jpg','png','gif','webp'):
            cand = os.path.join(out, '%02d.%s' % (n_existing, e))
            if os.path.exists(cand): found = cand; break
        if found:
            seen[key] = found; mapping.append(found); continue
        tmp = '/tmp/_img'
        url = key + '?format=1500w'
        subprocess.run(['curl','-sL','--max-time','45','-o',tmp,url], check=False)
        if not os.path.exists(tmp) or os.path.getsize(tmp) < 500:
            mapping.append(None); continue
        ext = sniff(tmp)
        if ext == 'webp':                      # convert for broadest support
            subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','82',
                            tmp,'--out',tmp+'.jpg'], capture_output=True)
            if os.path.exists(tmp+'.jpg'): tmp, ext = tmp+'.jpg', 'jpg'
        if not ext: mapping.append(None); continue
        fn = '%02d.%s' % (len(seen)+1, ext)
        os.replace(tmp, os.path.join(out, fn))
        rel = '%s/%s' % (out, fn)
        seen[key] = rel; mapping.append(rel)
        for junk in ('/tmp/_img','/tmp/_img.jpg'):
            if os.path.exists(junk): os.remove(junk)
    r['imgmap'] = mapping
    json.dump(r, open('/tmp/sqdump/%s.json'%name,'w'), indent=1)
    got = len([m for m in mapping if m])
    kb  = sum(os.path.getsize(os.path.join(out,f)) for f in os.listdir(out))//1024
    print('%-13s %2d refs -> %2d unique files, %4d KB' % (name, len(mapping), len(seen), kb))
