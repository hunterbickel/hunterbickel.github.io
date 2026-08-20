/* ---------------------------------------------------------------
   City stage: hovering (or focusing, or tapping) a city shows its
   photograph and note.

   Progressive enhancement, same as the tabs: every card ships visible
   and this script collapses them into a single stage. Without it the
   page simply lists all seven cities in full.

   Hover alone would hide six of the seven from phone and keyboard
   users, so hover, focus and click all select, and on touch screens
   the chips behave as ordinary buttons.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var groups = [].slice.call(document.querySelectorAll("[data-cities]"));
  if (!groups.length) return;

  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  groups.forEach(function (group) {
    var chips = [].slice.call(group.querySelectorAll(".citychip"));
    var cards = chips.map(function (c) {
      return document.getElementById(c.getAttribute("aria-controls"));
    }).filter(Boolean);
    if (chips.length !== cards.length || !chips.length) return;

    group.classList.add("cities--live");

    var prompt = group.querySelector(".cities__prompt");

    function select(i) {
      if (prompt) prompt.hidden = true;
      chips.forEach(function (c, n) {
        c.setAttribute("aria-selected", n === i ? "true" : "false");
        c.tabIndex = n === i ? 0 : -1;
      });
      cards.forEach(function (card, n) { card.hidden = n !== i; });
    }

    /* Nothing is chosen until the reader picks a city, so the stage opens
       on its prompt rather than pre-selecting one stop. */
    function clear() {
      chips.forEach(function (c, n) {
        c.setAttribute("aria-selected", "false");
        c.tabIndex = n === 0 ? 0 : -1;      // one stop on the tab ring
      });
      cards.forEach(function (card) { card.hidden = true; });
      if (prompt) prompt.hidden = false;
    }

    chips.forEach(function (chip, i) {
      chip.addEventListener("click", function () { select(i); chip.focus(); });
      chip.addEventListener("focus", function () { select(i); });
      if (fine) {
        // pointer devices get the preview on hover without having to click
        chip.addEventListener("mouseenter", function () { select(i); });
      }
      chip.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % chips.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + chips.length) % chips.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = chips.length - 1;
        if (n !== null) { e.preventDefault(); select(n); chips[n].focus(); }
      });
    });

    clear();
  });
})();
