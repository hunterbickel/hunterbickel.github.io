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
   JavaScript off. The rest are fetched from data/journal.json and
   inserted here, each linking to journal.html?id=<id> — one template
   page that renders any entry, so data/journal.json stays the single
   source admin.html already writes to and a newly published piece has
   a working page the moment that file lands.
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

  function firstImage(md) {
    var m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
    return m ? m[1] : "";
  }

  /* ---------- rows ---------- */

  function journalRow(entry) {
    var topics = Array.isArray(entry.tags) ? entry.tags : [],
        img    = firstImage(entry.body);

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
        '<p class="pc__meta"><span class="pc__kind">' +
          esc(entry.kind || "Article") + "</span></p>" +
        '<h3 class="pc__title"><a href="journal.html?id=' + encodeURIComponent(entry.id) + '">' +
          esc(entry.title) + "</a></h3>" +
        '<p class="pc__dek">' + esc(summary(entry.body)) + "</p>" +
        '<p class="pc__meta pc__meta--b">' +
          '<span class="pc__date">' + esc(prettyDate(entry.date)) + "</span>" +
          topics.map(function (t) {
            return '<span class="topic">' + esc(t) + "</span>";
          }).join("") +
        "</p>" +
      "</div>" +
      (img
        ? '<span class="pc__shot" style="background-image:url(' + esc(img) + ')"></span>'
        : '<span class="pc__shot pc__shot--none"><i></i></span>');

    return el;
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
    var topics = [];
    members.forEach(function (m) {
      (m.getAttribute("data-topics") || "").split("|").forEach(function (t) {
        if (t && topics.indexOf(t) === -1) topics.push(t);
      });
    });
    topics.sort();

    var ordered = members.slice().sort(function (a, b) {
      return (+a.getAttribute("data-part")) - (+b.getAttribute("data-part"));
    });

    /* A series may name one piece its capstone — the thing the rest fed into.
       Europe Work Study has the report; a series without one just lists its
       parts evenly, as this did before. */
    var cap = null, rest = [];
    ordered.forEach(function (m) {
      if (!cap && m.hasAttribute("data-capstone")) cap = m; else rest.push(m);
    });

    function titleOf(m) { return m.querySelector(".pc__title a"); }
    function textOf(m, sel) {
      var n = m.querySelector(sel);
      return n ? n.textContent : "";
    }

    var el = document.createElement("article");
    el.className = "coll" + (cap ? " coll--capstoned" : "");
    el.setAttribute("data-collection", name);
    el.setAttribute("data-date", ordered[ordered.length - 1].getAttribute("data-date"));

    var head =
      '<div class="coll__head">' +
        '<p class="pc__meta"><span class="coll__kind">Series</span>' +
          '<span class="pc__date">' + ordered.length + " parts</span></p>" +
        '<h3 class="coll__title">' + esc(name) + "</h3>" +
        '<p class="pc__dek">My writings recapping my summer 2025 study trip in ' +
          "France and Spain.</p>" +
      "</div>";

    var capBlock = "";
    if (cap) {
      var ca = titleOf(cap);
      capBlock =
        '<div class="coll__cap">' +
          '<span class="coll__cap-shot"></span>' +
          '<div class="coll__cap-body">' +
            '<p class="pc__meta">' +
              '<span class="pc__kind">' + esc(textOf(cap, ".pc__kind")) + "</span>" +
              '<span class="pc__src">' + esc(textOf(cap, ".pc__src")) + "</span>" +
              '<span class="pc__date">' + esc(textOf(cap, ".pc__date")) + "</span>" +
            "</p>" +
            '<h4 class="coll__cap-title"><a href="' + ca.getAttribute("href") + '">' +
              ca.innerHTML + "</a></h4>" +
            '<p class="pc__dek">' + esc(textOf(cap, ".pc__dek")) + "</p>" +
          "</div>" +
        "</div>";
    }

    var items = rest.map(function (m) {
      var a = titleOf(m);
      return '<li><a href="' + a.getAttribute("href") + '">' + a.innerHTML + "</a>" +
             "<span>" + esc(textOf(m, ".pc__kind")) + "</span></li>";
    }).join("");

    var list = items
      ? (cap ? '<p class="coll__sublabel">The work behind it</p>' : "") +
        '<ol class="coll__list">' + items + "</ol>"
      : "";

    el.innerHTML = head + capBlock + list +
      '<p class="pc__meta pc__meta--b">' +
        topics.map(function (t) {
          return '<span class="topic">' + esc(t) + "</span>";
        }).join("") +
      "</p>";

    /* set as a property: getComputedStyle hands back url("…") and those quotes
       would terminate the style attribute early if interpolated into HTML */
    if (cap) {
      var shot = cap.querySelector(".pc__shot");
      if (shot && shot.style.backgroundImage) {
        el.querySelector(".coll__cap-shot").style.backgroundImage =
          shot.style.backgroundImage;
      }
    }
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
    });

    stream.querySelectorAll("[data-collection]").forEach(function (el) {
      var visible = !any;
      el.hidden = !visible;
      if (visible) shown++;
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
    nodes.forEach(function (n) { stream.appendChild(n); });
    if (emptyNote) stream.appendChild(emptyNote);
  }

  fetch("data/journal.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : { entries: [] }; })
    .then(function (data) {
      var entries = Array.isArray(data) ? data : (data.entries || []);
      entries.filter(function (e) { return !e.draft; }).forEach(function (e) {
        stream.appendChild(journalRow(e));
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

    });
})();
