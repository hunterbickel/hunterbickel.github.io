/* ---------------------------------------------------------------
   Journal feed — chronological, full text, minimal chrome.
   Reads data/journal.json and renders newest first.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var feed   = document.getElementById("journal-feed");
  var status = document.getElementById("journal-status");
  if (!feed) return;

  var esc = window.renderMarkdown.escapeHtml;

  function formatDate(iso) {
    var d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  function slugify(s) {
    return String(s).toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  function renderPost(entry) {
    var id = entry.id || slugify(entry.title || "entry");
    var tags = Array.isArray(entry.tags) ? entry.tags : [];

    var html =
      '<article class="post" id="' + esc(id) + '">' +
        '<p class="post__date"><time datetime="' + esc(entry.date || "") + '">' +
          esc(formatDate(entry.date || "")) +
        '</time></p>' +
        '<h3 class="post__title"><a href="#' + esc(id) + '">' +
          esc(entry.title || "Untitled") +
        '</a></h3>' +
        '<div class="post__body prose">' + window.renderMarkdown(entry.body || "") + '</div>';

    if (tags.length) {
      html += '<p class="post__tags">' + tags.map(function (t) {
        return '<span class="tag">' + esc(t) + '</span>';
      }).join("") + '</p>';
    }

    return html + '</article>';
  }

  fetch("data/journal.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      var entries = Array.isArray(data) ? data : (data.entries || []);

      entries = entries
        .filter(function (e) { return e && !e.draft; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

      if (!entries.length) {
        status.textContent = "No journal entries yet.";
        return;
      }

      feed.innerHTML = entries.map(renderPost).join("\n");

      /* Honour a permalink hash now that the posts exist. */
      if (location.hash.length > 1) {
        var target = document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function (err) {
      status.textContent =
        "Couldn't load the journal (" + err.message + "). " +
        "If you're opening this file directly, run a local server instead — see README.";
      status.style.color = "var(--accent)";
    });
})();
