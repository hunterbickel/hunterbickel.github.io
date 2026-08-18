import json, re, io, os, sys
sys.path.insert(0,'tools')

def slugify(s):
    s=s.lower(); s=re.sub(r"[^\w\s-]","",s); s=s.strip(); s=re.sub(r"\s+","-",s); return s[:60]

# ---------------- article pages ----------------
ARTICLES = {
 'barcelona': ('articles/barcelona-la-sagrera.html',
   'Barcelona La Sagrera: A modern-day mega-station',
   'The future of multi-modality and city-building is under construction in the Catalan capital.',
   'Site study', 'Europe Work Study &middot; 11 October 2025'),
 'lyon': ('articles/lyon-part-dieu.html',
   'Lyon-Part-Dieu: An urban travel hub transformation',
   'Rebuilding a saturated interchange without closing it — capacity, circulation, and the cost of operating through construction.',
   'Site study', 'Europe Work Study &middot; 10 August 2025'),
}

for key,(path,title,dek,kind,meta) in ARTICLES.items():
    body = io.open('/tmp/sqdump/%s.body.html'%key, encoding='utf-8').read()
    s = io.open(path, encoding='utf-8').read()
    s = re.sub(r'(<h1>).*?(</h1>)', lambda m: m.group(1)+title+m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'(<p class="dek">).*?(</p>)', lambda m: m.group(1)+dek+m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'(<span class="tag">)[^<]*(</span>)\s*\n\s*<span>[^<]*</span>',
               lambda m: m.group(1)+kind+m.group(2)+'\n      <span>'+meta+'</span>', s, count=1)
    s = re.sub(r'(<div class="prose">).*?(\n\s*</div>)',
               lambda m: m.group(1)+'\n'+body+m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'(<title>).*?(</title>)', lambda m: m.group(1)+title+' &mdash; Hunter Bickel'+m.group(2), s, count=1)
    s = re.sub(r'(<meta name="description" content=")[^"]*(")',
               lambda m: m.group(1)+re.sub(r'[&<>"]','',dek)+m.group(2), s, count=1)
    io.open(path,'w',encoding='utf-8').write(s)
    print('%-42s %6d chars, %2d figures' % (path, len(body), body.count('<figure>')))

# ---------------- journal entries ----------------
JOURNAL = [
 ('daytrips',     'Day trips are better by train',                      '2025-03-16', ['Intercity & High-Speed Rail']),
 ('jacksonville', 'Regional rail for a more connected Jacksonville',    '2025-03-25', ['Regional Rail']),
 ('paris',        'Europe Work Study Journal: Paris (and Strasbourg)',  '2025-06-30', ['Europe Work Study']),
]
entries=[]
for key,title,date,tags in JOURNAL:
    md = io.open('/tmp/sqdump/%s.md'%key, encoding='utf-8').read()
    entries.append({'id':slugify(title),'title':title,'date':date,'tags':tags,'draft':False,'body':md})
entries.sort(key=lambda e:e['date'], reverse=True)
io.open('data/journal.json','w',encoding='utf-8').write(json.dumps(entries,indent=2,ensure_ascii=False)+'\n')
print()
for e in entries:
    print('journal  %s  %-50s %6d chars  id=%s' % (e['date'], e['title'][:48], len(e['body']), e['id']))
