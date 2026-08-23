# Pointing htb.work at this site

Checked 2026-08-23: `htb.work` was unregistered.

## 1. Buy it — and turn on WHOIS privacy

**WHOIS privacy is the step that matters.** Domain registrations are public
record. Without privacy enabled, your name, postal address, email and phone
sit in a database anyone can query with one command — which is precisely what
the noindex work was for. Cloudflare Registrar and Porkbun include it free and
on by default. Verify it is on before you finish checkout.

Check the **renewal** price, not just the first year. Novelty TLDs like
`.work` often advertise a cheap first year and renew at several times that.

## 2. DNS records at the registrar

`htb.work` is an apex domain, so it needs A records — a CNAME will not work at
the apex.

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

Verified against what GitHub Pages resolves to on 2026-08-23. If this document
is old, re-check the current addresses in GitHub's Pages documentation rather
than trusting these.

## 3. Then the repo side

Do **not** add the CNAME file before DNS resolves. GitHub will start
redirecting the live site to a domain that does not answer yet, and the site
goes dark until it does.

Once `dig +short htb.work` returns those addresses:

    echo "htb.work" > CNAME
    git add CNAME && git commit -m "Serve from htb.work" && git push

Then in the repo's **Settings → Pages**, set the custom domain to `htb.work`
and tick **Enforce HTTPS** once the certificate is issued. The certificate is
automatic and usually takes a few minutes, occasionally up to an hour.

## 4. Worth doing afterwards

- **Verify the domain** under GitHub account Settings → Pages. This stops
  anyone else pointing their repo at your domain if you ever remove it here.
- Update the URL on LinkedIn and the resume to `htb.work`.

## What this does and does not achieve

A custom domain means the URL you hand out no longer contains your name. That
is real, and it is most of the benefit.

It does not delete the old one. `hunterbickel.github.io` keeps working and
redirects to `htb.work` — GitHub does not let you turn that off. Anyone who
already has the old URL still gets in, and the redirect makes the connection
between the two visible to anyone who follows it.

The repository is also still public at
`github.com/hunterbickel/hunterbickel.github.io`, and that page is indexable
regardless of what the site itself says. Making the repo private requires a
paid GitHub plan for user-site Pages; worth checking your account if this
matters to you.
