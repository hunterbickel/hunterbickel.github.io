/* ---------------------------------------------------------------
   Research & Writing — one stream, two axes.

   A SERIES is an authored, bounded project with numbered parts
   ("Europe Work Study"). A TOPIC is a subject that cuts across
   everything, including pieces inside a series.

   Because those axes cross — High-Speed Rail has pieces both inside
   and outside the series — a series cannot be an opaque box. While
   nothing is filtered it folds into one collection card standing in
   for its parts; the moment a filter is applied it breaks open and
   the matching parts stand on their own beside the loose pieces.

   Articles ship as static HTML so the page still lists them with
   JavaScript off. Journal entries are fetched and inserted here,
   and open in place rather than on a page of their own, which keeps
   data/journal.json the single source admin.html already writes to.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var stream = document.querySelector("[data-stream]");
  if (!stream) return;

  var filterBar = document.getElementById("filters"),
      emptyNote = document.getElementById("stream-empty"),
      state     = { series: null, topic: null };

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

  function wordCount(md) {
    return md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim().split(/\s+/).length;
  }

  function firstImage(md) {
    var m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return m ? m[1] : "";
  }

  /* ---------- rows ---------- */

  function journalRow(entry) {
    var topics = Array.isArray(entry.tags) ? entry.tags : [],
        img    = firstImage(entry.body),
        words  = wordCount(entry.body).toLocaleString("en-US"),
        part   = entry.series
                   ? '<span class="pc__part">Part ' + esc(entry.part) + "</span>" : "";

    var el = document.createElement("article");
    el.className = "pc";
    el.setAttribute("data-id", entry.id);
    el.setAttribute("data-date", entry.date || "");
    el.setAttribute("data-series", entry.series || "");
    el.setAttribute("data-part", entry.part || 0);
    el.setAttribute("data-topics", topics.join("|"));
    el.setAttribute("data-journal", "1");

    el.innerHTML =
      '<div class="pc__body">' +
        '<p class="pc__meta"><span class="pc__kind">Journal</span>' + part + "</p>" +
        '<h3 class="pc__title"><a href="#' + esc(entry.id) + '">' +
          esc(entry.title) + "</a></h3>" +
        '<p class="pc__dek">' + esc(summary(entry.body)) + "</p>" +
        '<p class="pc__meta pc__meta--b">' +
          '<span class="pc__date">' + esc(prettyDate(entry.date)) + "</span>" +
          '<span class="pc__len">' + words + " words</span>" +
          topics.map(function (t) {
            return '<span class="topic">' + esc(t) + "</span>";
          }).join("") +
        "</p>" +
      "</div>" +
      (img
        ? '<span class="pc__shot" style="background-image:url(' + esc(img) + ')"></span>'
        : '<span class="pc__shot pc__shot--none"><i></i></span>');

    /* the full entry opens underneath the row it belongs to */
    var open = document.createElement("div");
    open.className = "pc__full prose";
    open.hidden = true;
    open.id = entry.id;

    el.querySelector(".pc__title a").addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!open.innerHTML) open.innerHTML = window.renderMarkdown(entry.body || "");
      open.hidden = !open.hidden;
      el.classList.toggle("pc--open", !open.hidden);
      if (!open.hidden) el.scrollIntoView({ block: "nearest" });
    });

    return [el, open];
  }

  function summary(md) {
    var lines = md.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l || l.charAt(0) === "#" || l.slice(0, 2) === "![") continue;
      l = l.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`>]/g, "");
      return l.length > 160 ? l.slice(0, 160).replace(/\s+\S*$/, "") + "…" : l;
    }
    return "";
  }

  /* ---------- the collection card ---------- */

  function collectionCard(name, members) {
    var topics = [], cover = "";
    members.forEach(function (m) {
      (m.getAttribute("data-topics") || "").split("|").forEach(function (t) {
        if (t && topics.indexOf(t) === -1) topics.push(t);
      });
      if (!cover) {
        var shot = m.querySelector(".pc__shot");
        if (shot && shot.style.backgroundImage) cover = shot.style.backgroundImage;
      }
    });
    topics.sort();

    var ordered = members.slice().sort(function (a, b) {
      return (+a.getAttribute("data-part")) - (+b.getAttribute("data-part"));
    });

    var items = ordered.map(function (m) {
      var a    = m.querySelector(".pc__title a"),
          len  = m.querySelector(".pc__len"),
          soon = m.querySelector(".pc__soon");
      return '<li><a href="' + a.getAttribute("href") + '">' + a.innerHTML + "</a>" +
             "<span>" + (len ? len.textContent : "") +
             (soon ? " · coming soon" : "") + "</span></li>";
    }).join("");

    var el = document.createElement("article");
    el.className = "coll";
    el.setAttribute("data-collection", name);
    el.setAttribute("data-date", ordered[ordered.length - 1].getAttribute("data-date"));
    el.innerHTML =
      '<span class="coll__shot"></span>' +
      '<div class="coll__body">' +
        '<p class="pc__meta"><span class="coll__kind">Series</span>' +
          '<span class="pc__date">' + ordered.length + " parts</span></p>" +
        '<h3 class="coll__title">' + esc(name) + "</h3>" +
        '<p class="pc__dek">Two weeks across France and Spain &mdash; seven cities, ' +
          "six agencies, and the 250-page report it became.</p>" +
        '<ol class="coll__list">' + items + "</ol>" +
        '<p class="pc__meta pc__meta--b">' +
          topics.map(function (t) {
            return '<span class="topic">' + esc(t) + "</span>";
          }).join("") +
        "</p>" +
      "</div>";
    /* set as a property: getComputedStyle hands back url("…") and those quotes
       would terminate the style attribute early if interpolated into HTML */
    if (cover) el.querySelector(".coll__shot").style.backgroundImage = cover;
    return el;
  }

  /* ---------- filters ---------- */

  function buildFilters(allSeries, allTopics) {
    var s = document.getElementById("f-series"),
        t = document.getElementById("f-topics");

    allSeries.forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("data-series", name);
      b.textContent = name;
      s.appendChild(b);
    });
    allTopics.forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("data-topic", name);
      b.textContent = name;
      t.appendChild(b);
    });

    filterBar.hidden = false;
    filterBar.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-filter")) state = { series: null, topic: null };
      else if (b.hasAttribute("data-series")) {
        var v = b.getAttribute("data-series");
        state.series = state.series === v ? null : v;
      } else if (b.hasAttribute("data-topic")) {
        var w = b.getAttribute("data-topic");
        state.topic = state.topic === w ? null : w;
      } else return;
      apply();
    });
  }

  function apply() {
    var any = !!(state.series || state.topic), shown = 0;

    stream.querySelectorAll(".pc").forEach(function (el) {
      var ok = true;
      if (state.series) ok = ok && el.getAttribute("data-series") === state.series;
      if (state.topic) {
        ok = ok && (el.getAttribute("data-topics") || "").split("|")
                     .indexOf(state.topic) > -1;
      }
      /* while nothing is filtered, members hide behind their collection card */
      if (!any && el.getAttribute("data-series")) ok = false;
      el.hidden = !ok;
      if (ok) shown++;
      if (!ok) {
        var full = el.nextElementSibling;
        if (full && full.classList.contains("pc__full")) {
          full.hidden = true;
          el.classList.remove("pc--open");
        }
      }
    });

    stream.querySelectorAll("[data-collection]").forEach(function (el) {
      var visible = !any;
      el.hidden = !visible;
      if (visible) shown++;
    });

    stream.querySelectorAll(".pc__full").forEach(function (f) {
      var row = f.previousElementSibling;
      if (row && row.hidden) f.hidden = true;
    });

    filterBar.querySelectorAll(".chip").forEach(function (c) {
      var on = (c.getAttribute("data-series") &&
                c.getAttribute("data-series") === state.series) ||
               (c.getAttribute("data-topic") &&
                c.getAttribute("data-topic") === state.topic) ||
               (c.hasAttribute("data-filter") && !any);
      c.classList.toggle("chip--on", !!on);
    });

    if (emptyNote) emptyNote.hidden = shown > 0;
    stream.setAttribute("data-filtered", any ? "1" : "0");
  }

  /* ---------- assemble ---------- */

  function sortStream() {
    var nodes = [].slice.call(
      stream.querySelectorAll(".pc, [data-collection]"));
    nodes.sort(function (a, b) {
      return (b.getAttribute("data-date") || "").localeCompare(
              a.getAttribute("data-date") || "");
    });
    nodes.forEach(function (n) {
      stream.appendChild(n);
      var full = n.nextElementSibling;
      if (n.classList.contains("pc")) {
        var own = document.getElementById(n.getAttribute("data-id"));
        if (own && own.classList.contains("pc__full")) stream.appendChild(own);
      }
    });
    if (emptyNote) stream.appendChild(emptyNote);
  }

  fetch("data/journal.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : { entries: [] }; })
    .then(function (data) {
      var entries = Array.isArray(data) ? data : (data.entries || []);
      entries.filter(function (e) { return !e.draft; }).forEach(function (e) {
        var pair = journalRow(e);
        stream.appendChild(pair[0]);
        stream.appendChild(pair[1]);
      });
    })
    .catch(function () { /* articles still list without the journal */ })
    .then(function () {
      var seriesNames = [], topicNames = [], members = {};
      stream.querySelectorAll(".pc").forEach(function (el) {
        var s = el.getAttribute("data-series");
        if (s) {
          if (seriesNames.indexOf(s) === -1) { seriesNames.push(s); members[s] = []; }
          members[s].push(el);
        }
        (el.getAttribute("data-topics") || "").split("|").forEach(function (t) {
          if (t && topicNames.indexOf(t) === -1) topicNames.push(t);
        });
      });
      topicNames.sort();

      seriesNames.forEach(function (name) {
        stream.appendChild(collectionCard(name, members[name]));
      });

      sortStream();
      buildFilters(seriesNames, topicNames);
      apply();

      /* a permalink to an entry opens it */
      if (location.hash.length > 1) {
        var target = document.getElementById(location.hash.slice(1));
        if (target && target.classList.contains("pc__full")) {
          var row = target.previousElementSibling;
          if (row) {
            state = { series: null, topic: row.getAttribute("data-series") ? null : null };
            row.hidden = false;
            row.querySelector(".pc__title a").click();
          }
        }
      }
    });
})();
