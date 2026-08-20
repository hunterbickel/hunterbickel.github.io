"""Fingerprint CSS/JS links so browsers pick up changes immediately.

GitHub Pages serves assets with cache-control: max-age=600 and no way for a
browser to know a file changed. Appending a content hash to the URL means a
changed file is a changed URL, so the browser always fetches the new one —
and an unchanged file keeps its hash and stays cached.

Run this after editing anything in assets/ and before pushing.
"""
import hashlib, re, io, glob, os

ASSETS = ['assets/style.css','assets/site.js','assets/markdown.js',
          'assets/journal.js','assets/contact.js','assets/admin.js','assets/config.js',
          'assets/tabs.js','assets/cities.js']

digest = {}
for a in ASSETS:
    if os.path.exists(a):
        digest[os.path.basename(a)] = hashlib.sha256(open(a,'rb').read()).hexdigest()[:8]

pages = ['index.html','work.html','writing.html','admin.html'] + sorted(glob.glob('articles/*.html'))
changed = 0
for p in pages:
    s = io.open(p, encoding='utf-8').read()
    before = s
    for name, h in digest.items():
        # match the file with or without an existing ?v= stamp
        s = re.sub(r'((?:\.\./)?assets/' + re.escape(name) + r')(\?v=[0-9a-f]+)?(["\'])',
                   lambda m: '%s?v=%s%s' % (m.group(1), h, m.group(3)), s)
    if s != before:
        io.open(p,'w',encoding='utf-8').write(s); changed += 1

for name, h in sorted(digest.items()):
    print('  %-16s %s' % (name, h))
print('stamped %d of %d pages' % (changed, len(pages)))
