"""Turn extracted Squarespace articles into pages on the new site.

Barcelona and Lyon become standalone article pages; Paris, Jacksonville
and Day Trips become journal entries (full text, chronological feed).
"""
import json, re, os, io, html

SRC = '/tmp/sqdump'

def load(name):
    r = json.load(open('%s/%s.json' % (SRC, name)))
    r['title'] = re.sub(r'\s*—\s*Hunter Bickel.*$', '', r['title'] or '').replace('\xa0',' ').strip()
    return r

def resolve_images(frag, imgmap, prefix=''):
    """Replace \x00IMGn\x00 placeholders with real markup or markdown."""
    def sub(m):
        i = int(m.group(1))
        path = imgmap[i] if i < len(imgmap) else None
        return '' if not path else prefix + path
    return re.sub(r'\x00IMG(\d+)\x00', sub, frag)

# ---------- article pages (HTML) ----------
def to_article_html(frag, imgmap, depth='../'):
    """Squarespace already wraps images in <figure>/<figcaption>; keep that
    structure (the captions carry source credits) and just drop an <img> in."""
    def sub(m):
        i = int(m.group(1))
        p = imgmap[i] if i < len(imgmap) else None
        if not p: return ''
        return '<img src="%s%s" alt="" loading="lazy" decoding="async">' % (depth, p)
    frag = re.sub(r'\x00IMG(\d+)\x00', sub, frag)
    # any image not already in a figure gets one
    frag = re.sub(r'<p>\s*(<img [^>]+>)\s*</p>', r'<figure>\1</figure>', frag)
    frag = re.sub(r'<a href="[^"]*squarespace-cdn[^"]*">\s*(<img [^>]+>)\s*</a>', r'\1', frag)
    frag = re.sub(r'<a href="[^"]*">\s*(<img [^>]+>)\s*</a>', r'\1', frag)
    frag = re.sub(r'<figure>\s*</figure>', '', frag)
    frag = re.sub(r'<p>\s*</p>', '', frag)
    frag = re.sub(r'<figcaption>\s*</figcaption>', '', frag)
    return re.sub(r'\n{3,}', '\n\n', frag).strip()

# ---------- journal entries (markdown subset) ----------
def to_markdown(frag, imgmap):
    s = frag
    # a whole <figure> becomes one markdown image, caption and all
    def figure(m):
        inner = m.group(1)
        im = re.search(r'\x00IMG(\d+)\x00', inner)
        if not im: return ''
        i = int(im.group(1)); p = imgmap[i] if i < len(imgmap) else None
        if not p: return ''
        capm = re.search(r'<figcaption>(.*?)</figcaption>', inner, re.S)
        cap = ''
        if capm:
            c = capm.group(1)
            # keep links inside captions as markdown
            c = re.sub(r'<a href="([^"]+)">(.*?)</a>',
                       lambda k: '[%s](%s)' % (
                           re.sub(r'\s+',' ', re.sub(r'<[^>]+>','',k.group(2))).strip(),
                           html.unescape(k.group(1))), c, flags=re.S)
            c = re.sub(r'<[^>]+>','', c)
            cap = re.sub(r'\s+',' ', html.unescape(c)).strip()
        return '\n\n![](%s)%s\n\n' % (p, ('\n'+cap) if cap else '')
    s = re.sub(r'<figure>(.*?)</figure>', figure, s, flags=re.S)
    # any image left outside a figure
    def img(m):
        i = int(m.group(1)); p = imgmap[i] if i < len(imgmap) else None
        return '' if not p else '\n\n![](%s)\n\n' % p
    s = re.sub(r'\x00IMG(\d+)\x00', img, s)
    s = re.sub(r'<figure>|</figure>', '', s)
    s = re.sub(r'<figcaption>(.*?)</figcaption>', r'\n\n\1\n\n', s, flags=re.S)
    s = re.sub(r'<h[34][^>]*>(.*?)</h[34]>', r'\n\n## \1\n\n', s, flags=re.S)
    s = re.sub(r'<h2[^>]*>(.*?)</h2>',       r'\n\n## \1\n\n', s, flags=re.S)
    s = re.sub(r'<blockquote>(.*?)</blockquote>',
               lambda m: '\n\n> ' + re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',m.group(1))).strip() + '\n\n',
               s, flags=re.S)
    s = re.sub(r'<li[^>]*>(.*?)</li>', lambda m: '\n- ' + re.sub(r'\s+',' ',m.group(1)).strip(), s, flags=re.S)
    s = re.sub(r'</?(ul|ol)>', '\n\n', s)
    s = re.sub(r'<a href="([^"]+)">(.*?)</a>', lambda m: '[%s](%s)' % (
               re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',m.group(2))).strip(), html.unescape(m.group(1))), s, flags=re.S)
    s = re.sub(r'<(strong|b)>(.*?)</\1>', r'**\2**', s, flags=re.S)
    s = re.sub(r'<(em|i)>(.*?)</\1>',     r'*\2*',   s, flags=re.S)
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<hr\s*/?>', '\n\n---\n\n', s)
    s = re.sub(r'</p>', '\n\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r' *\n *', '\n', s)
    # Squarespace wraps images in a "View fullsize" lightbox link back to its
    # CDN, and repeats the same image inside it. Keep one local image, drop the link.
    def unwrap(m):
        imgs = re.findall(r'!\[[^\]]*\]\([^)\s]+\)', m.group(0))
        return ('\n\n%s\n\n' % imgs[0]) if imgs else ''
    s = re.sub(r'\[[^\[\]]*?(?:!\[[^\]]*\]\([^)\s]+\)\s*)+\]\([^)\s]+\)', unwrap, s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()

if __name__ == '__main__':
    for n in ('barcelona','lyon'):
        r = load(n)
        out = to_article_html(r['html'], r['imgmap'])
        io.open('/tmp/sqdump/%s.body.html'%n,'w',encoding='utf-8').write(out)
        print('%-13s article html %6d chars, %2d figures' % (n, len(out), out.count('<figure>')))
    for n in ('paris','jacksonville','daytrips'):
        r = load(n)
        md = to_markdown(r['html'], r['imgmap'])
        io.open('/tmp/sqdump/%s.md'%n,'w',encoding='utf-8').write(md)
        print('%-13s markdown %6d chars, %2d images, %2d headings' % (
            n, len(md), md.count('!['), len(re.findall(r'^## ', md, re.M))))
