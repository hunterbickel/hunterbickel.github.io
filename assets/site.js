/* Shared site behaviour. Intentionally tiny — no framework, no build step. */
(function () {
  "use strict";
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
