/* ---------------------------------------------------------------
   Tabbed sections.

   Progressive enhancement: the markup ships with every panel visible,
   and only this script hides the inactive ones. If it fails to load,
   the page still shows all its content, just stacked as before.

   Deep links keep working. A hash pointing at anything inside a panel
   activates that panel first — which matters for the journal, whose
   entries are permalinked as writing.html#some-entry.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var groups = [].slice.call(document.querySelectorAll("[data-tabs]"));
  if (!groups.length) return;

  groups.forEach(function (group) {
    var tabs   = [].slice.call(group.querySelectorAll("[role=tab]"));
    var panels = tabs.map(function (t) {
      return document.getElementById(t.getAttribute("aria-controls"));
    }).filter(Boolean);
    if (tabs.length < 2 || tabs.length !== panels.length) return;

    function select(i, focus) {
      tabs.forEach(function (t, n) {
        var on = n === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[n].hidden = !on;
      });
      if (focus) tabs[i].focus();
      group.setAttribute("data-active", tabs[i].dataset.key || String(i));
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(i);
        // make the choice shareable without stacking up history entries
        if (tab.dataset.key && history.replaceState) {
          history.replaceState(null, "", "#" + tab.dataset.key);
        }
      });
      tab.addEventListener("keydown", function (e) {
        var k = e.key, next = null;
        if (k === "ArrowRight" || k === "ArrowDown") next = (i + 1) % tabs.length;
        else if (k === "ArrowLeft" || k === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
        else if (k === "Home") next = 0;
        else if (k === "End") next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });

    group.__select = select;
    group.__tabs = tabs;
    group.__panels = panels;
    select(0);
  });

  /* Activate whichever panel holds the hash target, then scroll to it. */
  function syncToHash(scroll) {
    var id = location.hash.slice(1);
    if (!id) return false;
    var target = document.getElementById(id);
    var matchedGroup = null, matchedIndex = -1;

    groups.forEach(function (group) {
      if (!group.__tabs) return;
      group.__tabs.forEach(function (t, i) {
        if (t.dataset.key === id) { matchedGroup = group; matchedIndex = i; }
      });
      if (matchedIndex < 0 && target) {
        group.__panels.forEach(function (p, i) {
          if (p === target || p.contains(target)) { matchedGroup = group; matchedIndex = i; }
        });
      }
    });

    if (matchedGroup && matchedIndex >= 0) {
      matchedGroup.__select(matchedIndex);
      if (scroll && target && target !== matchedGroup.__panels[matchedIndex]) {
        target.scrollIntoView();
      }
      return true;
    }
    return false;
  }

  window.tabsSyncToHash = syncToHash;
  syncToHash(true);
  window.addEventListener("hashchange", function () { syncToHash(true); });
})();
