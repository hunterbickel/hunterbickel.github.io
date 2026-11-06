# Pointing hunterbickel.net at this site

Checked 2026-11-06: `hunterbickel.net` was unregistered (NXDOMAIN, no
nameservers). Re-check before you count on it — that can change any day.

Plan: buy it when the site fully launches, once work has signed off and it
goes on the resume.

## A note on the name, since it changed

An earlier draft of this used `htb.work`, chosen so the URL carried no name.
`hunterbickel.net` is the opposite choice and that is a reasonable trade for a
resume link — it is the conventional, professional form, and it is the one a
reader expects to see under your name.

Be clear-eyed about what it gives up. `htb.work` was unguessable; anyone who
knew your name could not reach the site without the link. `hunterbickel.net`
is the first thing a person would try. The noindex still keeps you out of
search results, which is the main protection and is unaffected — but the
domain itself is now a guess away. If that trade is fine, and for a resume
extension it usually is, nothing else here changes.

This makes WHOIS privacy matter more, not less. See below.

## 1. Buy it — and turn on WHOIS privacy

**WHOIS privacy is the step that matters.** Domain registrations are public
record. Without privacy enabled, your name, postal address, email and phone
sit in a database anyone can query with one command — which is precisely what
the noindex work was for. Cloudflare Registrar and Porkbun include it free and
on by default. Verify it is on before you finish checkout.

Check the **renewal** price, not just the first year.

## 2. DNS records at the registrar

`hunterbickel.net` is an apex domain, so it needs A records — a CNAME will not
work at the apex.

    Type   Name   Value
    ----   ----   ------------------
    A      @      185.199.108.153
    A      @      185.199.109.153
    A      @      185.199.110.153
    A      @      185.199.111.153

Optional but worth adding, for IPv6:

    AAAA   @      2606:50c0:8000::153
    AAAA   @      2606:50c0:8001::153
    AAAA   @      2606:50c0:8002::153
    AAAA   @      2606:50c0:8003::153

Optional, if you want www to work too:

    CNAME  www    hunterbickel.github.io.

Re-verified against what GitHub Pages resolves to on 2026-11-06 — unchanged
since August. If this document is old, re-check the current addresses in
GitHub's Pages documentation rather than trusting these.

## 3. Then the repo side

Do **not** add the CNAME file before DNS resolves. GitHub will start
redirecting the live site to a domain that does not answer yet, and the site
goes dark until it does.

Once `dig +short hunterbickel.net` returns those addresses:

    echo "hunterbickel.net" > CNAME
    git add CNAME && git commit -m "Serve from hunterbickel.net" && git push

Then in the repo's **Settings → Pages**, set the custom domain to
`hunterbickel.net` and tick **Enforce HTTPS** once the certificate is issued.
The certificate is automatic and usually takes a few minutes, occasionally up
to an hour.

## 4. Worth doing afterwards

- **Verify the domain** under GitHub account Settings → Pages. This stops
  anyone else pointing their repo at your domain if you ever remove it here.
- Update the URL on LinkedIn and the resume.
- Re-run `tools/stamp_assets.py` is **not** needed — nothing in the pages is
  absolute, so the domain change touches no links.

## What this does and does not achieve

The old URL does not go away. `hunterbickel.github.io` keeps working and
redirects to the custom domain — GitHub does not let you turn that off.

The repository is also still public at
`github.com/hunterbickel/hunterbickel.github.io`, and that page is indexable
regardless of what the site itself says. Every page's content, the MTA section
included, is readable there in the raw files. Closing that gap means making
the repo private, which needs GitHub Pro; on the free plan a private repo
takes the Pages site down.

Access control on the site itself — a real login wall — is **not** available
at any individual GitHub plan. It is an Enterprise Cloud feature for
organizations. A Pages site is public to anyone holding the URL, full stop.
