# Personal site — Hunter Bickel

Static site, no build step, no dependencies. Plain HTML, one stylesheet, a few small
scripts. Deploys to GitHub Pages by pushing to `main`.

## Structure

```
index.html                 About + contact form
work.html                  Work, Education, Other Experience
writing.html               Articles & Reports listing + Journal feed
admin.html                 Journal quick-entry (noindex, not linked publicly)
articles/                  Individual article pages
data/journal.json          Journal entries — the only file the journal reads
assets/
  config.js                ← the one file you must edit to go live
  style.css                All styling; light/dark aware
  site.js                  Shared odds and ends
  markdown.js              Safe Markdown-subset renderer
  journal.js               Renders the public feed
  contact.js               Contact form submission
  admin.js                 Quick-entry → GitHub Contents API
```

## Local preview

The journal feed uses `fetch()`, which browsers block on `file://` URLs. Run a server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Going live — three things to set

Everything below lives in `assets/config.js`.

### 1. Contact form

The site has no backend, so the form posts to a relay service. Your Gmail address is
configured in that service's dashboard and never appears in this repo or the page source —
there is no crawlable address anywhere on the site.

1. Create a free form at [Formspree](https://formspree.io) (50 submissions/month free) or
   [Web3Forms](https://web3forms.com).
2. Point it at your Gmail address in their dashboard, and confirm the verification email.
3. Set `contactEndpoint` in `assets/config.js` to the endpoint URL.

Until that's set, the form renders with a disabled button and an explanatory notice.

The form includes a hidden honeypot field to absorb the most basic spam bots.

### 2. Journal publishing

Set `repoOwner` and `repoName` in `assets/config.js`.

Then open `/admin.html` and paste a **fine-grained personal access token**:

- GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Repository access: **only this repository**
- Permissions: **Contents → Read and write**. Nothing else.

The token is stored in your browser's `localStorage` and sent only to `api.github.com`.
It is never committed. "Forget token" clears it.

**How publishing works:** the admin page reads `data/journal.json` through the GitHub API,
prepends your entry, and commits the updated file. GitHub Pages rebuilds, and the public
feed shows it. If you'd rather not use a token, **Copy JSON instead** puts the full updated
file on your clipboard to paste and commit by hand.

`admin.html` is publicly reachable — that's unavoidable on GitHub Pages — but it is inert
without your token, and it is marked `noindex`.

### 3. Content

Every page ships with clearly-marked placeholder prose. Search the repo for `placeholder`
and `[` to find everything that still needs real text:

- `index.html` — bio paragraphs
- `work.html` — all roles, dates, and bullets
- `articles/*.html` — article bodies
- `data/journal.json` — journal entry bodies

## Journal entry format

`data/journal.json` is a plain array, newest first (the renderer sorts anyway):

```json
{
  "id": "url-slug",
  "title": "Entry title",
  "date": "2026-03-14",
  "tags": ["High-speed rail"],
  "draft": false,
  "body": "Markdown subset…"
}
```

`draft: true` keeps an entry in the file but out of the public feed.

The `id` is derived from the title, and it is also the permalink anchor (`writing.html#your-slug`). Submitting the quick-entry form with a title that matches an existing entry **replaces** that entry rather than adding a second one — which is how you edit a post. Change the title and you create a new entry, and the old permalink stops resolving.

Supported Markdown: blank-line paragraphs, `## heading`, `> quote`, `- list`, `1. list`,
`---` rule, `**bold**`, `*italic*`, `` `code` ``, `[link](url)`. Entry text is HTML-escaped
before formatting and link schemes are restricted, so the feed can't be injected into.
