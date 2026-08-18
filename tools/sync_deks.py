"""Keep the Research & Writing listing in step with each article's subheader.

The listing used to repeat the dek by hand, which silently drifted out of
sync. Each listing entry now takes its dek straight from the page it links to.
"""
import io, re, os

page = io.open('writing.html', encoding='utf-8').read()
updated = 0

# each listing entry: the link tells us which article to read the dek from
for m in list(re.finditer(
        r'<h3 class="piece__title">\s*<a href="(articles/[^"]+)">.*?</a>\s*</h3>'
        r'(.*?)<p class="piece__dek">(.*?)</p>', page, re.S))[::-1]:
    path, middle, current = m.group(1), m.group(2), m.group(3)
    if not os.path.exists(path):
        continue
    art = io.open(path, encoding='utf-8').read()
    dm = re.search(r'<p class="dek">(.*?)</p>', art, re.S)
    if not dm:
        continue
    dek = re.sub(r'\s+', ' ', dm.group(1)).strip()
    if re.sub(r'\s+',' ',current).strip() == dek:
        continue
    start = m.start(3); end = m.end(3)
    page = page[:start] + '\n          ' + dek + '\n        ' + page[end:]
    updated += 1
    print('  synced %-42s %s' % (path, re.sub(r'<[^>]+>','',dek)[:60]))

io.open('writing.html','w',encoding='utf-8').write(page)
print('%d listing dek(s) updated' % updated)
