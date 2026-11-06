/* ---------------------------------------------------------------
   journal.html — one entry, read from data/journal.json by ?id=.

   A template rather than a page per entry on purpose: admin.html
   writes journal.json and pushes, and the entry has a working page
   the moment that lands. Generating files would mean a build step
   between publishing and the page existing.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var elTitle = document.getElementById("entry-title"),
      elDek   = document.getElementById("entry-dek"),
      elMeta  = document.getElementById("entry-meta"),
      elBody  = document.getElementById("entry-body");

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function prettyDate(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US",
      { year: "numeric", month: "long", day: "numeric" });
  }

  function summary(md) {
    var lines = (md || "").split("\n");
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l || l.charAt(0) === "#" || l.slice(0, 2) === "![") continue;
      l = l.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>]/g, "");
      return l.length > 160 ? l.slice(0, 160).replace(/\s+\S*$/, "") + "…" : l;
    }
    return "";
  }

  function wanted() {
    var q = new URLSearchParams(location.search).get("id");
    /* an older #permalink still resolves */
    return q || (location.hash.length > 1
      ? decodeURIComponent(location.hash.slice(1)) : "");
  }

  function notFound(id) {
    elTitle.textContent = "Piece not found";
    elBody.innerHTML =
      "<p>There is no entry here" +
      (id ? ' with the id "' + esc(id) + '"' : "") +
      '. It may have been renamed. Everything published is listed on ' +
      '<a href="writing.html">Research &amp; Writing</a>.</p>';
  }

  function render(entry) {
    var title = entry.title || "Untitled";

    document.title = title + " — Hunter Bickel";
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", summary(entry.body));

    elTitle.textContent = title;

    var dek = summary(entry.body);
    if (dek) { elDek.textContent = dek; elDek.hidden = false; }

    var bits = '<span class="tag">' + esc(entry.kind || "Article") + "</span>";
    if (entry.series) {
      bits += '<span class="piece__where">' + esc(entry.series) + "</span>";
    }
    if (entry.date) {
      bits += '<span class="piece__when">' + esc(prettyDate(entry.date)) + "</span>";
    }
    (entry.tags || []).forEach(function (t) {
      bits += '<span class="topic">' + esc(t) + "</span>";
    });
    elMeta.innerHTML = bits;
    elMeta.hidden = false;

    elBody.innerHTML = window.renderMarkdown(entry.body || "");
  }

  var id = wanted();
  if (!id) { notFound(""); return; }

  fetch("data/journal.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : { entries: [] }; })
    .then(function (data) {
      var entries = Array.isArray(data) ? data : (data.entries || []),
          hit = null;
      entries.forEach(function (e) { if (e.id === id) hit = e; });
      if (hit && !hit.draft) render(hit); else notFound(id);
    })
    .catch(function () {
      elTitle.textContent = "Could not load this piece";
      elBody.innerHTML =
        '<p>The entry file did not load. Everything published is listed on ' +
        '<a href="writing.html">Research &amp; Writing</a>.</p>';
    });
})();
