"""Pull article bodies out of saved Squarespace pages into clean semantic HTML.

Squarespace wraps everything in deep div soup with data-* attributes and
lazy-loading image markup. This keeps only the meaningful elements and
rewrites images to locally hosted copies.
"""
from html.parser import HTMLParser
import html, json, re, os

KEEP   = {'p','h2','h3','h4','ul','ol','li','blockquote','strong','em','b','i','a','br','figure','figcaption','hr'}
SELFCL = {'br','hr','img'}

class Body(HTMLParser):
    """Capture the inner markup of <div class="blog-item-content">."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0; self.on = False; self.out = []; self.imgs = []
        self.skip = 0          # inside <style>/<script>: drop everything

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get('class','')
        if tag in ('style','script','noscript'):
            self.skip += 1; return
        if not self.on:
            if tag=='div' and 'blog-item-content' in cls:
                self.on = True; self.depth = 1
            return
        if tag in ('div','section','figure'): self.depth += 1

        if tag == 'img':
            # Squarespace hides the real source in data-src; srcset has bigger ones
            src = a.get('data-src') or a.get('src') or ''
            best, bestw = src, 0
            for cand in (a.get('data-srcset') or a.get('srcset') or '').split(','):
                cand = cand.strip()
                m = re.search(r'\s(\d+)w$', cand)
                if m and int(m.group(1)) > bestw:
                    bestw = int(m.group(1)); best = cand.split()[0]
            if best.startswith('http'):
                self.imgs.append({'url': best, 'alt': a.get('alt','')})
                self.out.append('\x00IMG%d\x00' % (len(self.imgs)-1))
            return

        if tag in KEEP:
            if tag == 'a':
                href = a.get('href','')
                # An anchor we skip must have its </a> skipped too, or the
                # closing tag is emitted with nothing to close.
                if not href or href.startswith('#'):
                    self.dropa = True; return
                # Squarespace tag cloud / author byline links go nowhere here
                if href.startswith('/writing/tag/') or 'author=' in href:
                    self.dropa = True; self.skip += 1; return
                self.out.append('<a href="%s">' % html.escape(href, quote=True))
            elif tag in SELFCL:
                self.out.append('<%s>' % tag)
            else:
                self.out.append('<%s>' % tag)

    def handle_endtag(self, tag):
        if tag in ('style','script','noscript'):
            self.skip = max(0, self.skip-1); return
        if not self.on: return
        if tag == 'a' and getattr(self, 'dropa', False):
            self.dropa = False; self.skip = max(0, self.skip-1); return
        if tag in ('div','section','figure'):
            self.depth -= 1
            if self.depth <= 0: self.on = False; return
        if tag in KEEP and tag not in SELFCL:
            self.out.append('</%s>' % tag)

    def handle_data(self, d):
        if self.on and not self.skip:
            self.out.append(html.escape(d, quote=False))

    def handle_entityref(self, n):
        if self.on and not self.skip: self.out.append('&%s;' % n)
    def handle_charref(self, n):
        if self.on and not self.skip: self.out.append('&#%s;' % n)

def meta(raw):
    t = re.search(r'<meta property="og:title" content="([^"]*)"', raw)
    d = re.search(r'<time[^>]*datetime="([^"]*)"', raw)
    if not d: d = re.search(r'"publishOn"\s*:\s*(\d{10,13})', raw)
    return (html.unescape(t.group(1)).strip() if t else None,
            d.group(1) if d else None)

def strip_trailer(frag):
    # Squarespace appends an author byline after the body
    frag = re.sub(r'(<p>\s*)?Hunter\s+Bickel\s*(</p>)?\s*$', '', frag)
    return frag

def clean(frag):
    # collapse the empty tags Squarespace leaves behind
    for _ in range(6):
        frag = re.sub(r'<(p|h2|h3|h4|li|blockquote|em|strong)>\s*</\1>', '', frag)
    frag = re.sub(r'<br>\s*</p>', '</p>', frag)
    frag = re.sub(r'[ \t]+\n', '\n', frag)
    frag = re.sub(r'\n{3,}', '\n\n', frag)
    frag = re.sub(r'(<(?:p|h2|h3|h4|ul|ol|blockquote|figure)>)', r'\n\1', frag)
    return strip_trailer(frag).strip()

def extract(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    b = Body(); b.feed(raw)
    title, date = meta(raw)
    return {'title': title, 'date': date, 'html': clean(''.join(b.out)), 'imgs': b.imgs}

if __name__ == '__main__':
    import sys
    for name in ('barcelona','lyon','paris','jacksonville','daytrips'):
        r = extract('/tmp/sqdump/%s.html' % name)
        txt = re.sub(r'<[^>]+>','',r['html'])
        print('%-13s %-52s imgs:%2d  chars:%6d' % (
            name, (r['title'] or '?')[:50], len(r['imgs']), len(txt)))
        json.dump(r, open('/tmp/sqdump/%s.json'%name,'w'), indent=1)
