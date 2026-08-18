/* ---------------------------------------------------------------
   Journal quick-entry.

   GitHub Pages serves static files only, so there is no server to
   post to. Instead this page talks to the GitHub Contents API
   directly: read data/journal.json, prepend the new entry, write it
   back. The token is the user's own, lives only in localStorage, and
   is never written into the repo.

   If no token is set, "Copy JSON instead" produces the full updated
   file for a manual paste — so the form is still useful offline.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var KEY = "hb_gh_token";

  var $ = function (id) { return document.getElementById(id); };

  var elToken   = $("ad-token"),
      elConn    = $("ad-conn"),
      elForm    = $("entry-form"),
      elStatus  = $("ad-status"),
      elPublish = $("ad-publish"),
      elPrevWrap= $("ad-preview-wrap"),
      elPrev    = $("ad-preview");

  var esc = window.renderMarkdown.escapeHtml;

  /* ---------- helpers ---------- */

  function say(msg, tone) {
    elStatus.textContent = msg;
    elStatus.setAttribute("data-tone", tone || "");
    elStatus.hidden = false;
  }

  function slugify(s) {
    return String(s).toLowerCase()
      .replace(/[^\w\s-]/g, "").trim()
      .replace(/\s+/g, "-").slice(0, 60) || "entry";
  }

  function configured() {
    return Boolean(CFG.repoOwner && CFG.repoName);
  }

  function refreshConn() {
    if (!configured()) {
      elConn.textContent = "⚠ Set repoOwner and repoName in assets/config.js first.";
      return;
    }
    elConn.textContent = elToken.value
      ? "Token set for " + CFG.repoOwner + "/" + CFG.repoName
      : "No token — publishing disabled, “Copy JSON” still works.";
  }

  /* ---------- token handling ---------- */

  elToken.value = localStorage.getItem(KEY) || "";
  refreshConn();

  $("ad-save-token").addEventListener("click", function () {
    if (!elToken.value.trim()) { say("Paste a token first.", "err"); return; }
    localStorage.setItem(KEY, elToken.value.trim());
    refreshConn();
    say("Token saved in this browser.", "ok");
  });

  $("ad-forget-token").addEventListener("click", function () {
    localStorage.removeItem(KEY);
    elToken.value = "";
    refreshConn();
    say("Token cleared from this browser.", "ok");
  });

  elToken.addEventListener("input", refreshConn);

  /* ---------- read the form ---------- */

  function collect() {
    var title = $("ad-title").value.trim();
    var date  = $("ad-date").value;
    var body  = $("ad-body").value.trim();

    if (!title || !date || !body) {
      say("Title, date, and body are all required.", "err");
      return null;
    }

    var tags = $("ad-tags").value.split(",")
      .map(function (t) { return t.trim(); })
      .filter(Boolean);

    return {
      id: slugify(title),
      title: title,
      date: date,
      tags: tags,
      draft: $("ad-draft").checked,
      body: body
    };
  }

  /* ---------- preview ---------- */

  $("ad-preview-btn").addEventListener("click", function () {
    var entry = collect();
    if (!entry) return;

    var d = new Date(entry.date + "T12:00:00");
    var pretty = isNaN(d) ? entry.date
      : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    elPrev.innerHTML =
      '<article class="post">' +
        '<p class="post__date">' + esc(pretty) + (entry.draft ? " · draft" : "") + '</p>' +
        '<h3 class="post__title">' + esc(entry.title) + '</h3>' +
        '<div class="post__body prose">' + window.renderMarkdown(entry.body) + '</div>' +
        (entry.tags.length
          ? '<p class="post__tags">' + entry.tags.map(function (t) {
              return '<span class="tag">' + esc(t) + '</span>';
            }).join("") + '</p>'
          : "") +
      '</article>';

    elPrevWrap.hidden = false;
    elPrevWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- GitHub Contents API ---------- */

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Authorization": "Bearer " + elToken.value.trim(),
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    return fetch("https://api.github.com" + path, opts).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.message || ("HTTP " + r.status));
        return j;
      });
    });
  }

  function contentsUrl() {
    return "/repos/" + CFG.repoOwner + "/" + CFG.repoName +
           "/contents/" + (CFG.journalPath || "data/journal.json") +
           "?ref=" + encodeURIComponent(CFG.repoBranch || "main");
  }

  /* base64 <-> UTF-8, so accented place names survive the round trip */
  function b64encode(str) {
    return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(str)));
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function mergeEntry(list, entry) {
    var out = list.filter(function (e) { return e.id !== entry.id; });
    out.push(entry);
    out.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return out;
  }

  /* ---------- copy fallback ---------- */

  $("ad-copy").addEventListener("click", function () {
    var entry = collect();
    if (!entry) return;

    fetch("data/journal.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; })
      .then(function (list) {
        var merged = mergeEntry(Array.isArray(list) ? list : [], entry);
        var text = JSON.stringify(merged, null, 2) + "\n";

        function showFallback(reason) {
          elPrevWrap.hidden = false;
          elPrev.innerHTML =
            '<p class="hint" style="font-family:var(--sans);margin-bottom:0.5rem">' +
            esc(reason) + ' Select all of the box below and copy it over ' +
            '<code>data/journal.json</code>.</p>' +
            '<textarea rows="20" style="width:100%;font-family:var(--mono);font-size:0.8rem">' +
            esc(text) + '</textarea>';
          elPrev.querySelector("textarea").select();
          elPrevWrap.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          showFallback("Clipboard unavailable in this browser.");
          say("Copy the JSON from the box below.", "ok");
          return;
        }

        return navigator.clipboard.writeText(text).then(function () {
          say("Full updated journal.json copied to the clipboard — paste it over data/journal.json and commit.", "ok");
        }, function () {
          showFallback("Couldn't reach the clipboard.");
          say("Copy the JSON from the box below.", "ok");
        });
      })
      .catch(function (err) {
        say("Couldn't build the JSON: " + err.message, "err");
      });
  });

  /* ---------- publish ---------- */

  elForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var entry = collect();
    if (!entry) return;

    if (!configured()) {
      say("Set repoOwner and repoName in assets/config.js before publishing.", "err");
      return;
    }
    if (!elToken.value.trim()) {
      say("Add a GitHub token to publish — or use “Copy JSON instead”.", "err");
      return;
    }

    elPublish.disabled = true;
    say("Reading current journal…");

    api(contentsUrl())
      .then(function (file) {
        var list;
        try {
          list = JSON.parse(b64decode(file.content));
        } catch (err) {
          throw new Error("journal.json isn't valid JSON — fix it in the repo first.");
        }
        if (!Array.isArray(list)) throw new Error("journal.json must be a JSON array.");

        var merged = mergeEntry(list, entry);
        say("Committing…");

        return api("/repos/" + CFG.repoOwner + "/" + CFG.repoName +
                   "/contents/" + (CFG.journalPath || "data/journal.json"), {
          method: "PUT",
          body: JSON.stringify({
            message: "Journal: " + entry.title,
            content: b64encode(JSON.stringify(merged, null, 2) + "\n"),
            sha: file.sha,
            branch: CFG.repoBranch || "main"
          })
        });
      })
      .then(function () {
        elForm.reset();
        $("ad-date").value = new Date().toISOString().slice(0, 10);
        elPrevWrap.hidden = true;
        say("Published. GitHub Pages usually rebuilds within a minute — then it'll be live on the writing page.", "ok");
      })
      .catch(function (err) {
        say("Publish failed: " + err.message, "err");
      })
      .then(function () { elPublish.disabled = false; });
  });

  /* default the date field to today */
  $("ad-date").value = new Date().toISOString().slice(0, 10);
})();
